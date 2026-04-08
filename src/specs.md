# Documento de Requisitos: Motor de Requisições HTTP (Estilo Postman/Hoppscotch)

Este documento descreve o escopo inicial (MVP) para o desenvolvimento de uma ferramenta de testes de API, cobrindo o motor principal da aplicação e a experiência de uso.

## ⚙️ Requisitos Funcionais (RF)
*Ações diretas que o usuário poderá executar no sistema.*

| ID | Nome do Requisito | Descrição |
| :--- | :--- | :--- |
| **RF01** | **Configuração de URL e Método** | O sistema deve permitir a inserção de uma URL completa e a seleção de métodos HTTP padrão (GET, POST, PUT, PATCH, DELETE, OPTIONS). |
| **RF02** | **Gestão de Cabeçalhos (Headers)** | O sistema deve oferecer uma interface de chave-valor dinâmica para adicionar, editar e remover headers (ex: `Authorization`, `Content-Type`). |
| **RF03** | **Configuração de Query Params** | O sistema deve permitir a adição de parâmetros de URL em formato chave-valor, atualizando a URL principal automaticamente. |
| **RF04** | **Corpo da Requisição (Body)** | O usuário deve poder enviar payloads nas requisições POST/PUT. O sistema deve suportar formatos como `JSON` (com validação de sintaxe), `Form-Data` e Texto bruto. |
| **RF05** | **Execução e Monitoramento** | O sistema deve disparar a requisição e medir o tempo de resposta (em milissegundos), o tamanho do payload recebido e o Status Code HTTP (ex: 200 OK, 404 Not Found). |
| **RF06** | **Visualização da Resposta** | O painel de resposta deve formatar dados JSON automaticamente (pretty-print) e permitir o download do conteúdo caso o tipo de retorno seja um arquivo binário (como um `.pdf` ou `.xlsx`). |
| **RF07** | **Histórico de Execuções** | O sistema deve manter um registro local das últimas URLs e requisições testadas, permitindo que o usuário clique e reenvie rapidamente. |

---

## 🛠️ Requisitos Não Funcionais (RNF)
*Questões de infraestrutura, arquitetura e usabilidade.*

* **RNF01 (Contorno de CORS):** O sistema não pode ser bloqueado pelas políticas de CORS dos navegadores. Para isso, se for uma aplicação Web, deverá possuir um servidor Proxy intermediário. Alternativamente, pode ser empacotado como aplicação Desktop (Electron/Tauri).
* **RNF02 (Stack Tecnológica):** Para lidar com a interface altamente reativa (múltiplas abas, inputs dinâmicos), o front-end deve utilizar um ecossistema robusto de gerenciamento de estado (ex: React, Vue ou Angular). 
* **RNF03 (Feedback Assíncrono):** A interface não pode "congelar" enquanto aguarda a resposta do servidor de destino. Deve haver indicadores visuais claros (loaders/spinners) durante o trânsito da rede.
* **RNF04 (Persistência Local):** Dados temporários, como o Histórico de Execuções (RF07), devem ser salvos no lado do cliente (`localStorage` ou `IndexedDB`) para não depender de um banco de dados complexo neste primeiro momento.

---

## 📋 Regras de Negócio Básicas (RN)
*Regras que ditam o comportamento lógico da aplicação.*

1. **RN01:** O botão de "Enviar Requisição" deve ficar desabilitado caso a URL inserida não tenha um formato válido (exigir `http://` ou `https://`).
2. **RN02:** Se o usuário selecionar envio de Body do tipo JSON, o sistema deve impedir o envio se houver um erro de sintaxe (falta de aspas, vírgulas sobrando) e alertar visualmente na interface.
3. **RN03:** O header `Content-Length` deve ser calculado e injetado automaticamente pela aplicação por baixo dos panos, sem que o usuário precise digitá-lo manualmente.

---

<!-- ## ⏱️ Estimativa de Cronograma (MVP)
*Considerando o desenvolvimento focado em dias úteis.*

| Fase do Projeto | O que entrega | Tempo Estimado |
| :--- | :--- | :--- |
| **Fase 1 (Core)** | Interface simples, sem abas, faz requisições e contorna o CORS via Proxy simples. | 2 a 3 semanas |
| **Fase 2 (UX)** | Abas, editor JSON colorido, salvamento no navegador (Coleções locais). | + 1 a 2 meses |
| **Fase 3 (Pro)** | Variáveis de ambiente dinâmicas, autenticação automática, suporte a GraphQL. | + 2 a 3 meses | -->