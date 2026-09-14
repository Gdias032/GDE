-- ============================================================================
-- SETUP COMPLETO: CONSTRUTOR DE RELATÓRIOS BI
-- (Inclui Catálogo, Views e Funções com suporte a filtro cruzado)
-- Rode este arquivo inteiro no SQL Editor do Supabase.
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. TABELA DO CATÁLOGO DE BI
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bi_catalogo (
    fonte text,
    fonte_rotulo text,
    coluna text,
    coluna_rotulo text,
    papel text,
    ordem integer,
    UNIQUE (fonte, coluna)
);

ALTER TABLE bi_catalogo DISABLE ROW LEVEL SECURITY;

TRUNCATE TABLE bi_catalogo;

INSERT INTO bi_catalogo (fonte, fonte_rotulo, coluna, coluna_rotulo, papel, ordem) VALUES
('vw_bi_planta', 'Status Atual (Planta)', 'linha', 'Linha (A-J)', 'dimensao', 1),
('vw_bi_planta', 'Status Atual (Planta)', 'status', 'Cor do Status', 'dimensao', 2),
('vw_bi_planta', 'Status Atual (Planta)', 'andamento', 'Fase/Andamento', 'dimensao', 3),
('vw_bi_planta', 'Status Atual (Planta)', 'mantenedor', 'Mantenedor', 'dimensao', 4),
('vw_bi_planta', 'Status Atual (Planta)', 'recepcionista', 'Recepcionista', 'dimensao', 5),
('vw_bi_planta', 'Status Atual (Planta)', 'maquinas', 'Qtd de Máquinas', 'metrica', 6),

('vw_bi_eventos', 'Histórico de Ocorrências', 'dia', 'Dia (Data)', 'dimensao', 7),
('vw_bi_eventos', 'Histórico de Ocorrências', 'mes', 'Mês', 'dimensao', 8),
('vw_bi_eventos', 'Histórico de Ocorrências', 'hora', 'Hora do Dia', 'dimensao', 9),
('vw_bi_eventos', 'Histórico de Ocorrências', 'usuario', 'Usuário/Atuante', 'dimensao', 10),
('vw_bi_eventos', 'Histórico de Ocorrências', 'acao', 'Ação Realizada', 'dimensao', 11),
('vw_bi_eventos', 'Histórico de Ocorrências', 'eventos', 'Qtd de Eventos', 'metrica', 12);

GRANT SELECT ON bi_catalogo TO authenticated, anon;


-- ----------------------------------------------------------------------------
-- 2. VIEW: DADOS DA PLANTA (STATUS ATUAL)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_bi_planta AS
SELECT 
    m.id AS maquina_id,
    m.linha AS linha,
    m.status_cor AS status,
    m.andamento AS andamento,
    COALESCE(u_mant.nome_completo, 'Não Atribuído') AS mantenedor,
    COALESCE(u_recep.nome_completo, 'Não Atribuído') AS recepcionista,
    1 AS maquinas,
    m.data_inicio,
    m.data_fim,
    m.atualizado_em
FROM maquinas_planta m
LEFT JOIN usuarios u_mant ON m.id_mantenedor_atual = u_mant.id
LEFT JOIN usuarios u_recep ON m.id_recepcionista_atual = u_recep.id;

GRANT SELECT ON vw_bi_planta TO authenticated, anon;


-- ----------------------------------------------------------------------------
-- 3. VIEW: HISTÓRICO DE EVENTOS
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_bi_eventos AS
SELECT 
    h.id AS evento_id,
    h.id_maquina AS maquina,
    COALESCE(u.nome_completo, 'Desconhecido') AS usuario,
    h.acao_realizada AS acao,
    TO_CHAR(h.data_evento AT TIME ZONE 'UTC-3', 'YYYY-MM-DD') AS dia,
    TO_CHAR(h.data_evento AT TIME ZONE 'UTC-3', 'YYYY-MM') AS mes,
    TO_CHAR(h.data_evento AT TIME ZONE 'UTC-3', 'HH24') AS hora,
    1 AS eventos,
    h.data_evento
FROM historico_maquinas h
LEFT JOIN usuarios u ON h.id_usuario = u.id;

GRANT SELECT ON vw_bi_eventos TO authenticated, anon;


-- ----------------------------------------------------------------------------
-- 4. FUNÇÃO BI_CONSULTAR
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
SECURITY DEFINER
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
-- 5. FUNÇÃO BI_VALORES
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION bi_valores(
    p_fonte text,
    p_campo text,
    p_dias  integer DEFAULT NULL
)
RETURNS TABLE (valor text)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
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
