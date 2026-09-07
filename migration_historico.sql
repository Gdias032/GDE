INSERT INTO historico_maquinas
    (id_maquina, id_usuario, status_anterior, status_novo, acao_realizada, observacao, data_evento)
SELECT
    id,
    id_recepcionista_atual,
    'purple',
    'green',
    'RECEPCAO_APROVADA',
    '[backfill] evento reconstruído a partir do estado atual',
    COALESCE(data_fim, atualizado_em, CURRENT_TIMESTAMP)
FROM maquinas_planta
WHERE status_cor = 'green'
  AND NOT EXISTS (
      SELECT 1 FROM historico_maquinas h
      WHERE h.id_maquina = maquinas_planta.id
        AND h.acao_realizada = 'RECEPCAO_APROVADA'
  );