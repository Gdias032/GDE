-- ============================================================================
-- Silicon Core V2 — Construtor de Relatórios v2
-- Acrescenta filtro por valor e listagem de valores distintos.
-- Rode DEPOIS do migration_construtor_bi.sql (substitui a bi_consultar).
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1. bi_consultar — agora aceita filtros
--
--    p_filtros é um array JSON: [{"campo":"mantenedor","valor":"Rafa Dias"}]
--
--    Regra importante: um filtro cujo campo não existe na fonte consultada é
--    IGNORADO, não rejeitado. É isso que permite o cross-filter entre visuais
--    de fontes diferentes — filtrar por "mantenedor" afeta os visuais que têm
--    essa coluna e deixa os outros intactos.
-- ----------------------------------------------------------------------------

DROP FUNCTION IF EXISTS bi_consultar(text, text, text, text, integer, integer, text);

CREATE OR REPLACE FUNCTION bi_consultar(
    p_fonte     text,
    p_dimensao  text,
    p_metrica   text,
    p_agregacao text    DEFAULT 'soma',
    p_dias      integer DEFAULT 30,
    p_limite    integer DEFAULT 20,
    p_ordenar   text    DEFAULT 'valor',
    p_filtros   jsonb   DEFAULT '[]'::jsonb
)
RETURNS TABLE (rotulo text, valor numeric)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_agg        text;
    v_condicoes  text[] := ARRAY[]::text[];
    v_where      text   := '';
    v_ordem      text;
    v_sql        text;
    v_tem_data   boolean;
    v_item       jsonb;
    v_campo      text;
    v_valor      text;
BEGIN
    IF NOT EXISTS (SELECT 1 FROM bi_catalogo WHERE fonte = p_fonte) THEN
        RAISE EXCEPTION 'Fonte de dados inválida: %', p_fonte;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM bi_catalogo
        WHERE fonte = p_fonte AND coluna = p_dimensao AND papel = 'dimensao'
    ) THEN
        RAISE EXCEPTION 'Dimensão inválida para esta fonte: %', p_dimensao;
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM bi_catalogo
        WHERE fonte = p_fonte AND coluna = p_metrica AND papel = 'metrica'
    ) THEN
        RAISE EXCEPTION 'Métrica inválida para esta fonte: %', p_metrica;
    END IF;

    v_agg := CASE lower(p_agregacao)
        WHEN 'soma'   THEN 'SUM'
        WHEN 'media'  THEN 'AVG'
        WHEN 'contar' THEN 'COUNT'
        WHEN 'maximo' THEN 'MAX'
        WHEN 'minimo' THEN 'MIN'
        ELSE NULL
    END;
    IF v_agg IS NULL THEN
        RAISE EXCEPTION 'Agregação inválida: %', p_agregacao;
    END IF;

    p_limite := LEAST(GREATEST(COALESCE(p_limite, 20), 1), 200);

    -- Filtro de período (só onde existe data_evento)
    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = p_fonte
          AND column_name  = 'data_evento'
    ) INTO v_tem_data;

    IF v_tem_data AND p_dias IS NOT NULL AND p_dias > 0 THEN
        v_condicoes := v_condicoes
            || format('data_evento >= NOW() - INTERVAL ''%s days''', p_dias::int);
    END IF;

    -- Filtros por valor
    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_filtros, '[]'::jsonb))
    LOOP
        v_campo := v_item ->> 'campo';
        v_valor := v_item ->> 'valor';

        IF v_campo IS NULL OR v_valor IS NULL THEN
            CONTINUE;
        END IF;

        -- Campo ausente nesta fonte: ignora (permite cross-filter)
        IF NOT EXISTS (
            SELECT 1 FROM bi_catalogo
            WHERE fonte = p_fonte AND coluna = v_campo AND papel = 'dimensao'
        ) THEN
            CONTINUE;
        END IF;

        v_condicoes := v_condicoes || format('%I::text = %L', v_campo, v_valor);
    END LOOP;

    IF array_length(v_condicoes, 1) > 0 THEN
        v_where := 'WHERE ' || array_to_string(v_condicoes, ' AND ');
    END IF;

    v_ordem := CASE lower(COALESCE(p_ordenar, 'valor'))
        WHEN 'rotulo' THEN '1 ASC'
        ELSE '2 DESC'
    END;

    v_sql := format(
        'SELECT COALESCE(%I::text, ''(vazio)'') AS rotulo,
                ROUND(%s(%I)::numeric, 2)       AS valor
           FROM %I
           %s
          GROUP BY 1
          ORDER BY %s
          LIMIT %s',
        p_dimensao, v_agg, p_metrica, p_fonte, v_where, v_ordem, p_limite
    );

    RETURN QUERY EXECUTE v_sql;
END;
$$;

GRANT EXECUTE ON FUNCTION
    bi_consultar(text, text, text, text, integer, integer, text, jsonb)
    TO authenticated;


-- ----------------------------------------------------------------------------
-- 2. bi_valores — valores distintos de uma dimensão, para o seletor de filtro
-- ----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION bi_valores(
    p_fonte text,
    p_campo text,
    p_dias  integer DEFAULT NULL
)
RETURNS TABLE (valor text)
LANGUAGE plpgsql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
    v_sql      text;
    v_where    text := '';
    v_tem_data boolean;
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM bi_catalogo
        WHERE fonte = p_fonte AND coluna = p_campo AND papel = 'dimensao'
    ) THEN
        RAISE EXCEPTION 'Campo inválido para filtro: % em %', p_campo, p_fonte;
    END IF;

    SELECT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
          AND table_name   = p_fonte
          AND column_name  = 'data_evento'
    ) INTO v_tem_data;

    IF v_tem_data AND p_dias IS NOT NULL AND p_dias > 0 THEN
        v_where := format('WHERE data_evento >= NOW() - INTERVAL ''%s days''', p_dias::int);
    END IF;

    v_sql := format(
        'SELECT DISTINCT %I::text AS valor
           FROM %I
           %s
          ORDER BY 1
          LIMIT 200',
        p_campo, p_fonte, v_where
    );

    RETURN QUERY EXECUTE v_sql;
END;
$$;

GRANT EXECUTE ON FUNCTION bi_valores(text, text, integer) TO authenticated;


-- ============================================================================
-- Conferência
-- ============================================================================
-- Sem filtro:
-- SELECT * FROM bi_consultar('vw_bi_planta','status','maquinas','soma',NULL,20,'valor','[]');
--
-- Com filtro aplicável:
-- SELECT * FROM bi_consultar('vw_bi_planta','status','maquinas','soma',NULL,20,'valor',
--        '[{"campo":"linha","valor":"A"}]');
--
-- Com filtro que NÃO existe nessa fonte — deve retornar igual ao primeiro,
-- ignorando o filtro em silêncio (é o comportamento esperado):
-- SELECT * FROM bi_consultar('vw_bi_planta','status','maquinas','soma',NULL,20,'valor',
--        '[{"campo":"hora","valor":"14"}]');
--
-- Valores para o seletor:
-- SELECT * FROM bi_valores('vw_bi_planta','linha');
--
-- Deve dar erro (validação funcionando):
-- SELECT * FROM bi_valores('usuarios','matricula');
