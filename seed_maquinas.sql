-- Script de Popularização Inicial (Seed) das Máquinas na Planta
-- Execute este script no SQL Editor do Supabase para criar as 120 máquinas (A1 até J12).

DO $$
DECLARE
    letras CHAR[] := ARRAY['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    letra CHAR;
    i INT;
BEGIN
    FOREACH letra IN ARRAY letras
    LOOP
        FOR i IN 1..12
        LOOP
            INSERT INTO maquinas_planta (id, linha, coluna, status_cor, andamento)
            VALUES (letra || i, letra, i, 'dark', 'Não Iniciado')
            ON CONFLICT (id) DO NOTHING;
        END LOOP;
    END LOOP;
END $$;
