# Silicon Core V2

Sistema de acompanhamento de manutenção e recepção de máquinas (siliconagem),
organizado como um SPA (Single Page Application) simples, sem framework —
apenas HTML, CSS e JavaScript puro (vanilla).

## Estrutura de pastas

```
silicon-core-v2/
├── index.html          # Estrutura fixa (sidebar, navbar) + <script> na ordem correta
├── css/
│   └── styles.css       # Todos os estilos (tema claro/escuro via CSS variables)
└── js/
    ├── config.js         # Constantes e dados mock (funcionários, layout da planta)
    ├── utils.js           # escapeHtml, modais, helpers de localStorage seguro
    ├── state.js           # Estado global + persistência (localStorage)
    ├── theme.js            # Alternância tema claro/escuro
    ├── mobile-menu.js      # Sidebar retrátil (mobile)
    ├── views.js             # Templates HTML de cada tela
    ├── navigation.js        # navigateTo() — roteador manual do SPA
    ├── auth.js               # Login / logout
    ├── funcionarios.js       # Validação de matrícula (mantenedor/recepcionador)
    ├── permissoes.js         # Solicitações de permissão especial
    ├── perfil.js              # Modal "Meu Perfil" (troca de avatar)
    ├── planta.js               # Matriz de máquinas + tooltip + ranking
    ├── recepcao.js             # Tela de atuação/recepção da máquina
    ├── tabelas.js               # Listagens (Recepções e Solicitações)
    ├── analise.js                # Gráfico de BI (Chart.js)
    └── main.js                    # Inicialização (DOMContentLoaded) — sempre por último
```

A ordem dos `<script>` no `index.html` importa: cada módulo assume que os
anteriores já definiram o que ele usa (ex: `state.js` usa funções de
`utils.js`, então `utils.js` vem antes). `main.js` é sempre o último, pois
só executa depois que tudo mais já foi declarado.

## Como rodar

Não precisa de build nem servidor — é só abrir `index.html` no navegador.
Se preferir servir localmente (recomendado, pois alguns navegadores
restringem localStorage em `file://`):

```bash
cd silicon-core-v2
python3 -m http.server 8080
# depois acesse http://localhost:8080
```

## O que foi corrigido nesta reorganização

1. **XSS em observações e justificativas** — texto livre digitado pelo
   usuário (`obs`, `mensagem`) agora passa por `escapeHtml()` antes de
   entrar no HTML (tooltip da planta, tabelas, modal de permissão).
2. **CSS injetado via JS removido** — estilos que eram montados como
   string dentro do `app.js` (modais, tela de login, tela de recepção,
   inputs) foram movidos para `css/styles.css`, onde pertencem.
3. **Código morto removido** — `celulasMockIniciais`, que não era usado
   em lugar nenhum.
4. **Duplicação de código** — atualização dos 3 badges de notificação
   (sino, sidebar, topnav) virou uma função só (`atualizarBadgeElemento`).
5. **localStorage sem tratamento de erro** — agora envolvido em
   `try/catch` (`lerStorageSeguro` / `salvarStorageSeguro`), para não
   quebrar em modo de navegação privada ou com armazenamento cheio.
6. **"Números mágicos" da planta** — letras e quantidade de máquinas por
   linha centralizados em `CONFIG_PLANTA` (config.js), em vez de
   hardcoded dentro da função de inicialização.

## Limitações conhecidas (não corrigidas — exigem mudança de arquitetura)

- **Dados isolados por navegador**: como tudo é salvo em `localStorage`,
  cada computador/navegador tem sua própria cópia dos dados. Duas
  pessoas em máquinas diferentes **não veem as mesmas informações em
  tempo real**. Para uso real com múltiplos usuários/estações, é
  necessário um backend (API + banco de dados) substituindo as funções
  `salvar*Storage()`.
- **Autenticação de protótipo**: a senha única `"123"` fica visível no
  código-fonte e não há verificação em servidor. Serve para demonstração,
  não para produção.
- **Concorrência de escrita**: duas abas abertas ao mesmo tempo podem
  sobrescrever uma a outra ao salvar (não há merge nem travamento).
- **Gráfico de "Eficiência"**: os pontos de dias anteriores no gráfico
  de linha são valores fixos de exemplo — só o último dia usa dado real.
  Um histórico real exigiria salvar um snapshot diário da contagem de
  máquinas aprovadas.

## Sugestões de próximos passos

- Migrar `localStorage` para uma API real (ex: Node/Express + banco de
  dados) para permitir múltiplos usuários simultâneos.
- Trocar a autenticação por login real (usuário/senha com hash no
  servidor, sessão via token).
- Adicionar testes automatizados (mesmo que básicos) para as regras de
  permissão, que são a parte mais sensível do sistema.
- Considerar acessibilidade: navegação por teclado nos modais (Esc para
  fechar, foco preso dentro do modal enquanto aberto).
