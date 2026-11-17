-- Script de Criação do Banco de Dados: Silicon Core V2
-- Recomendado para PostgreSQL (ou Supabase)

-- 0. Limpeza de tabelas e enums antigos (para permitir re-execução do script)
DROP TABLE IF EXISTS permissoes_especiais CASCADE;
DROP TABLE IF EXISTS solicitacoes_permissao CASCADE;
DROP TABLE IF EXISTS historico_maquinas CASCADE;
DROP TABLE IF EXISTS maquinas_planta CASCADE;
DROP TABLE IF EXISTS usuarios CASCADE;

DROP TYPE IF EXISTS perfil_acesso_enum CASCADE;
DROP TYPE IF EXISTS status_cor_enum CASCADE;
DROP TYPE IF EXISTS status_solicitacao_enum CASCADE;

-- 1. Criação de Enums (Opcional, mas recomendado para consistência)
CREATE TYPE perfil_acesso_enum AS ENUM ('ADMIN', 'MANTENEDOR', 'RECEPCIONISTA');
CREATE TYPE status_cor_enum AS ENUM ('dark', 'yellow', 'purple', 'green', 'red');
CREATE TYPE status_solicitacao_enum AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA');

-- 2. Tabela: Usuarios / Funcionarios
CREATE TABLE usuarios (
    id UUID PRIMARY KEY REFERENCES auth.users(id), -- Conecta com o sistema de login nativo do Supabase
    matricula VARCHAR(50) UNIQUE NOT NULL,
    nome_completo VARCHAR(255) NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    perfil_acesso perfil_acesso_enum NOT NULL,
    avatar_base64 TEXT,
    ativo BOOLEAN DEFAULT true,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Tabela: Maquinas (Planta)
CREATE TABLE maquinas_planta (
    id VARCHAR(10) PRIMARY KEY, -- Ex: 'A1', 'B12'
    linha CHAR(1) NOT NULL,     -- Ex: 'A'
    coluna INTEGER NOT NULL,    -- Ex: 1
    status_cor status_cor_enum DEFAULT 'dark',
    andamento VARCHAR(100) DEFAULT 'Não Iniciado',
    id_mantenedor_atual UUID REFERENCES usuarios(id),
    id_recepcionista_atual UUID REFERENCES usuarios(id),
    data_inicio TIMESTAMP WITH TIME ZONE,
    data_fim TIMESTAMP WITH TIME ZONE,
    observacoes TEXT,
    atualizado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Tabela: Histórico de Máquinas (Para BI)
CREATE TABLE historico_maquinas (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_maquina VARCHAR(10) REFERENCES maquinas_planta(id),
    id_usuario UUID REFERENCES usuarios(id),
    status_anterior VARCHAR(50),
    status_novo VARCHAR(50) NOT NULL,
    acao_realizada VARCHAR(100), -- Ex: 'MANUTENCAO_INICIADA', 'RECEPCAO_APROVADA'
    observacao TEXT,
    data_evento TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Tabela: Solicitações de Permissão
CREATE TABLE solicitacoes_permissao (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_solicitante UUID REFERENCES usuarios(id) NOT NULL,
    tipo_permissao VARCHAR(100) NOT NULL,
    justificativa TEXT,
    status status_solicitacao_enum DEFAULT 'PENDENTE',
    data_solicitacao TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    id_admin_resolucao UUID REFERENCES usuarios(id),
    data_resolucao TIMESTAMP WITH TIME ZONE
);

-- 6. Tabela: Permissões Especiais Concedidas
CREATE TABLE permissoes_especiais (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    id_usuario UUID REFERENCES usuarios(id) NOT NULL,
    permissao VARCHAR(100) NOT NULL,
    concedida_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    valida_ate TIMESTAMP WITH TIME ZONE
);

-- 7. Configuração de RLS (Row Level Security)
ALTER TABLE usuarios ENABLE ROW LEVEL SECURITY;
ALTER TABLE maquinas_planta ENABLE ROW LEVEL SECURITY;
ALTER TABLE historico_maquinas ENABLE ROW LEVEL SECURITY;
ALTER TABLE solicitacoes_permissao ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissoes_especiais ENABLE ROW LEVEL SECURITY;

-- Função auxiliar para checar o perfil do usuário logado sem recursão de RLS
CREATE OR REPLACE FUNCTION get_meu_perfil()
RETURNS perfil_acesso_enum
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
    SELECT perfil_acesso FROM usuarios WHERE id = auth.uid();
$$;

-- Políticas por Perfil (Segurança no Banco)
CREATE POLICY "usuarios_select_auth" ON usuarios
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "usuarios_admin_insert" ON usuarios
    FOR INSERT WITH CHECK (get_meu_perfil() = 'ADMIN');
CREATE POLICY "usuarios_update_proprio_ou_admin" ON usuarios
    FOR UPDATE USING (auth.uid() = id OR get_meu_perfil() = 'ADMIN')
    WITH CHECK (get_meu_perfil() = 'ADMIN' OR (auth.uid() = id AND perfil_acesso = get_meu_perfil()));
CREATE POLICY "usuarios_admin_delete" ON usuarios
    FOR DELETE USING (get_meu_perfil() = 'ADMIN');

CREATE POLICY "maquinas_select_auth" ON maquinas_planta
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "maquinas_update_auth" ON maquinas_planta
    FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "maquinas_admin_insert" ON maquinas_planta
    FOR INSERT WITH CHECK (get_meu_perfil() = 'ADMIN');
CREATE POLICY "maquinas_admin_delete" ON maquinas_planta
    FOR DELETE USING (get_meu_perfil() = 'ADMIN');

CREATE POLICY "historico_select_auth" ON historico_maquinas
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "historico_insert_auth" ON historico_maquinas
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "solicitacoes_select_auth" ON solicitacoes_permissao
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "solicitacoes_insert_proprio" ON solicitacoes_permissao
    FOR INSERT WITH CHECK (auth.uid() = id_solicitante);
CREATE POLICY "solicitacoes_admin_update" ON solicitacoes_permissao
    FOR UPDATE USING (get_meu_perfil() = 'ADMIN');
CREATE POLICY "solicitacoes_admin_delete" ON solicitacoes_permissao
    FOR DELETE USING (get_meu_perfil() = 'ADMIN');

CREATE POLICY "permissoes_select_auth" ON permissoes_especiais
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "permissoes_admin_all" ON permissoes_especiais
    FOR ALL USING (get_meu_perfil() = 'ADMIN') WITH CHECK (get_meu_perfil() = 'ADMIN');
