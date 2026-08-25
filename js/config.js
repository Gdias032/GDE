/**
 * config.js
 * ---------------------------------------------------------------------------
 * Constantes e dados "mock" (simulados) do sistema.
 *
 * Em uma versão real com backend, todo este arquivo deixaria de existir:
 * `bancoFuncionarios` viria de uma API/banco de dados (tabela de usuários),
 * e a geração das máquinas (letras x números) viria do cadastro da planta.
 *
 * Por enquanto ele existe só para o protótipo funcionar sem servidor.
 * ---------------------------------------------------------------------------
 */

/**
 * Lista fixa de funcionários usada para validar registros/matrículas
 * digitados nas telas de recepção e login.
 */
const bancoFuncionarios = [
    { registro: '1001', nome: 'Carlos Silva',     cargo: 'Mantenedor' },
    { registro: '1002', nome: 'Roberto Melo',      cargo: 'Mantenedor' },
    { registro: '1003', nome: 'Renan Teixeira',    cargo: 'Mantenedor' },
    { registro: '1004', nome: 'Ana Torres',        cargo: 'Mantenedor' },
    { registro: '1005', nome: 'Pedro Henrique',    cargo: 'Mantenedor' },
    { registro: '2001', nome: 'João Pereira',      cargo: 'Recepcionista' },
    { registro: '2002', nome: 'Mariana Costa',     cargo: 'Supervisora de Recepção' },
    { registro: '2003', nome: 'Lucas Andrade',     cargo: 'Inspetor de Qualidade' }
];

/**
 * Solicitação de permissão inicial usada apenas na primeira execução
 * (quando ainda não existe nada salvo no localStorage).
 */
const solicitacoesIniciais = [
    {
        id: 1,
        registro: '1001',
        nome: 'Carlos Silva',
        permissao: 'Efetuar Recepção',
        mensagem: 'Preciso validar a recepção das máquinas do Setor A no turno da noite.',
        status: 'Pendente',
        data: '16/08/2026'
    }
];

/**
 * Linhas (letras) e quantidade de máquinas por linha usadas para gerar
 * a matriz da planta na primeira execução. Mudar aqui é a forma
 * correta de aumentar/diminuir o layout — evita "números mágicos"
 * espalhados pelo código.
 */
const CONFIG_PLANTA = {
    letras: ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'],
    maquinasPorLinha: 12
};

/**
 * Objeto "virtual" que representa o Administrador quando ele atua
 * diretamente na recepção, já que "adm" não é um registro cadastrado
 * em bancoFuncionarios.
 */
const ADMIN_RECEPCIONADOR_PADRAO = { registro: 'adm', nome: 'Master / Admin', cargo: 'Administrador' };

// NOTA: o antigo array "celulasMockIniciais" foi removido por não ser
// utilizado em nenhum lugar do código (dead code). Se precisar de dados
// de exemplo para testes visuais, gere-os a partir de CONFIG_PLANTA.
