# Decisões Arquiteturais (ADRs - Architecture Decision Records)

## 1. Single Page Application (SPA) em Vanilla JS
- **Decisão**: A aplicação não utiliza frameworks de interface modernos voltados a componentes baseados em reatividade implícita (como React, Vue ou Angular). A renderização e transição das telas são orquestradas via manipulação direta de `innerHTML` utilizando enormes Strings Templates localizadas em `views.js`.
- **Contexto**: Facilidade de implantação, curva de aprendizado inferior, ou possivelmente um fator legado para não depender de transpiladores ou bundlers complexos como Webpack ou Vite num cenário inicial de prototipagem rápida.
- **Consequência**: Aumenta o perigo de "Memory Leaks" caso eventos associados aos DOMs não sejam corretamente limpos durante a navegação. Torna os templates HTML mais difíceis de testar em isolamento.

## 2. Backend-as-a-Service com Supabase
- **Decisão**: Toda a infraestrutura central, englobando camada de rede API REST, Banco de Dados, provedor JWT e Websockets Realtime foi terceirizada pro provedor Supabase.
- **Contexto**: Permitir o desenvolvimento focado quase inteiramente na solução front-end. O gerenciamento de endpoints HTTP dedicados foi preterido em função das interfaces fluidas diretas providas pela API JS client.
- **Consequência**: Criação de um forte acoplamento tecnológico ao provedor (Vendor Lock-in).

## 3. Arquitetura de Estado Mutável Global
- **Decisão**: O estado principal (`todasAsMaquinas`, `usuarioLogadoSessao`, variáveis de permissão e fluxo de interface) repousa publicamente no escopo global através de `state.js` e pode receber escritas diretas de qualquer um dos módulos importados na árvore HTML.
- **Contexto**: Contorna a necessidade de um Provider ou Stores complexos (como Redux ou Pinia) quando os módulos só dependem que o próprio navegador os compartilhe sob a árvore global "Window".
- **Consequência**: Criação de código propenso a "Spaghetti State", dificultando o "Trace" reverso de um bug proveniente de mutações assíncronas e conflitantes na aplicação concorrente.

## 4. Roteamento Manual Condicional
- **Decisão**: O módulo `navigation.js` intercepta funções de links ao redor de todo projeto simulando um Router.
- **Contexto/Consequência**: Uma decisão simples para barrar a visualização de abas não referentes ao perfil atual. Impede "Deep Linking" (URLs que podem ir direto para uma área do sistema, pois a URL no navegador será sempre fixa `/index.html`), quebrando certos pilares da acessibilidade da Web.
