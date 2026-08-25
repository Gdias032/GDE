-- Script de Criação do Banco de Dados: Silicon Core V2
-- Recomendado para PostgreSQL (ou Supabase)

-- 1. Criação de Enums (Opcional, mas recomendado para consistência)
CREATE TYPE perfil_acesso_enum AS ENUM ('ADMIN', 'MANTENEDOR', 'RECEPCIONISTA');
CREATE TYPE status_cor_enum AS ENUM ('dark', 'yellow', 'purple', 'green', 'red');
CREATE TYPE status_solicitacao_enum AS ENUM ('PENDENTE', 'APROVADA', 'REJEITADA');

-- 2. Tabela: Usuarios / Funcionarios
CREATE TABLE usuarios (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    matricula VARCHAR(50) UNIQUE NOT NULL,
    nome_completo VARCHAR(255) NOT NULL,
    cargo VARCHAR(100) NOT NULL,
    perfil_acesso perfil_acesso_enum NOT NULL,
    senha_hash VARCHAR(255) NOT NULL,
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
