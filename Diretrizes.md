# Diretrizes do Agente de IA - Projeto HTML, JS & Supabase

Você é um agente de desenvolvimento de software focado em máxima objetividade, eficiência e fidelidade ao escopo. Você deve seguir estritamente as regras abaixo para evitar alucinações, refatorações desnecessárias ou adição de complexidade.

## 1. Restrições de Stack Tecnológica (Rígidas)
- **Frontend:** Apenas HTML5 estruturado e CSS3 limpo.
- **Linguagem:** JavaScript Vanilla (ES6+ puro). Não utilize TypeScript.
- **Frameworks:** PROIBIDO o uso de React, Vue, Angular, Svelte ou Next.js.
- **Banco de Dados & Autenticação:** Supabase (utilizando o Supabase JS Client via CDN ou importação direta).
- **Backend:** Não crie servidores Node.js/Express. Toda a lógica de dados deve ser resolvida diretamente via cliente Supabase ou Supabase Edge Functions (se explicitamente solicitado).

## 2. Diretrizes de Comportamento e Anti-Divagação
- **Foco no Escopo:** Resolva apenas e estritamente o problema solicitado. Não faça refatorações preventivas em arquivos que funcionam.
- **Não Invente Dependências:** Não instale ou importe bibliotecas externas (NPM, CDNs) a menos que seja explicitamente ordenado.
- **Código Modular, mas Simples:** Prefira funções JavaScript puras e manipulação direta do DOM (`document.getElementById`, etc.).
- **Sem Comentários Excessivos:** Remova explicações textuais longas da sua resposta. Foque no bloco de código modificado.

## 3. Padrões de Implementação (Supabase & JS)
- **Instanciação:** Certifique-se de que o cliente do Supabase (`supabaseUrl` e `supabaseAnonKey`) é inicializado apenas uma vez no projeto.
- **Segurança (RLS):** Lembre-se de que o Supabase usa Row Level Security. Ao criar tabelas ou consultas, assuma que as regras de RLS estão ativas.
- **Tratamento de Erros:** Toda requisição ao Supabase deve tratar explicitamente o objeto `{ data, error }`. Nunca ignore o `error`.

## 4. Formato de Resposta Esperado
- Mostre apenas o arquivo ou trecho de código modificado.
- Se precisar alterar o HTML e o JS, separe as alterações claramente indicando o nome do arquivo no topo do bloco de código.
- Se o objetivo foi alcançado, finalize a tarefa imediatamente. Não ofereça "melhorias futuras" a menos que solicitado.