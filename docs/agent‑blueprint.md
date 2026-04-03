## Visão geral do agente Maestro IA

Todo o esforço a partir daqui vai transformar o `maestro-core` em um agente autônomo de afiliado que:

1. **Recebe um objetivo estratégico** (ex.: `lançar campanha afiliada + curso para produto X`).
2. **Divide esse objetivo em fases executáveis** (pesquisa do produto, criação de landing page, geração de conteúdo educativo, campanha paga, distribuição de assets).
3. **Aciona implementações concretas** (scripts, chamadas a APIs de afiliados, ferramentas de conteúdo) e persiste cada execução em `PipelineRun`/`PipelinePhaseRun`.
4. **Monitora resultados** (vendas, comissões, métricas de campanha) e atualiza dashboards/UI para que o usuário se conecte com os resultados financeiros e de produto.

### Objetivos e ações iniciais

| Objetivo | Ações candidatos (fases) | Entradas | Saídas esperadas |
|---|---|---|---|
| Lançar campanha afiliada | pesquisa produto + proposta de copy + criação de landing + campanha paga + monitoramento de conversões | nome do produto, público-alvo | links da landing, dados de campanha, estimativa de comissão |
| Criar curso + slides | auditoria de conteúdo + gerar roteiro + montar slides + publicar em LMS | tema, duração desejada | arquivo PPT/MD, páginas do curso |
| Gerar site/APP | gerar estrutura + configurar hosting + deploy | stack alvo | diretório do site pronto, URL |
| Produzir música + distribuir | composição automática + masterização + submissão para distribuidoras | briefing | links de streaming, comprovantes distribuídos |

### Integrações prioritárias

1. **APIs de afiliados**: para selecionar produtos e registrar links.
2. **Plataformas de anúncios** (Meta Ads, Google Ads): para criar campanhas/programar budgets.
3. **Geradores de conteúdo** (OpenAI, ferramentas de vídeo/música): para slides, aulas, músicas.
4. **Ferramentas de deployment**: Vercel, Netlify, GitHub Actions.
5. **Sistemas de pagamento**: Stripe/CashOut para registrar comissões.

### Como o Maestro core entra nisso

- `PipelineRun` já versiona execuções. Basta adicionar novos tipos de fases e conectores para cada ação acima.  
- `PipelinePhaseRun` grava logs/resultados detalhados, o que nos permite mostrar links para assets gerados.  
- O `AutopilotEngine` pode receber um prompt (`objetivo` + `contexto`) e gerar um plano de fases, que alimenta o pipeline.
- O UI pode mostrar o histórico de runs e deixar o usuário disparar novos objetivos com um form de “objetivo do agente”.
 - Implementamos um `AgentPlanner` (src/agents/AgentPlanner.ts) que traduz a intenção do afiliado em fases como `research-product`, `generate-landing` e `launch-campaign`.
 - O `AgentExecutor` (src/agents/AgentExecutor.ts) criou execuções piloto que gravam artefatos (landing HTML, copy JSON, campanha e relatórios) sob `agent-executions/<runId>` e persistem resultados no `PipelineRun`.
 - Uma API (`/api/agent/objective`) expõe esse executor e permite disparar runs a partir de um objetivo textual.
 - A nova rota `/dashboard/agent` no painel oferece um form para enviar objetivos e acompanhar rapidamente os runs automatizados.

### Próximo passo imediato

1. Criar um handler que aceita um prompt (“estratégia de afiliado para produto X”) e transforma em uma série de fases pré-definidas (ex.: `research-product`, `generate-landing`, `launch-campaign`).  
2. Implementar executores mock desses passos para validar o fluxo (e.g., gerar landing HTML fake, chamar placeholder de campanha).  
3. Atualizar UI do dashboard para permitir disparar esse prompt/objetivo diretamente e acompanhar fases em tempo real.

Com essa base podemos ir integrando cada action/serviço real posteriormente. Quer que eu comece pela definição do handler de objetivos e as fases iniciais? 
