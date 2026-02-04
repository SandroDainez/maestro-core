# Maestro DSL v1 — Linguagem de Comando Humano (Especificação)

## 1) Objetivo
A Maestro DSL (v1) define como o usuário dá comandos em linguagem natural para o Maestro.
O Maestro deve:
- entender intenções (intents) de forma consistente
- operar em fases e modos
- pedir aprovação quando necessário
- registrar decisões e ações (auditoria)
- evitar ambiguidade e bagunça

Esta DSL é "humana" (sem jargão), mas possui regras formais por trás.

---

## 2) Princípios
1. **Humano no comando**: nenhuma ação crítica ocorre sem aprovação (dependendo do modo).
2. **Sem caos**: todo comando vira uma intenção formal + plano + execução (se permitido).
3. **Projetos por fases**: Fase 0 pensar, 1 desenhar, 2 construir, 3 testar, 4 escalar.
4. **Governança padrão**: logs, checkpoints e histórico sempre.
5. **Mensagens simples**: erros e dúvidas devem ser perguntados em português claro.

---

## 3) Conceitos (glossário)
- **Projeto**: uma unidade de trabalho com objetivo, domínio e histórico.
- **Domínio**: tipo de trabalho (app, marketing, aula, música, vídeo, operações).
- **Fase**: etapa do método (0..4).
- **Modo**: comportamento global do Maestro (planejar, lento, rápido, executar, freeze, emergência).
- **Ação**: um passo executável (gerar arquivo, rodar comando, criar pasta, etc.).
- **Gate**: portão de aprovação humana antes de ação crítica.
- **Checkpoint**: um ponto salvo com estado e resumo.

---

## 4) Modo Operacional (global)
O modo define o "quão automático" o Maestro pode ser.

### 4.1 Modos
- **planejar**: só planeja, não executa shell nem altera disco (exceto docs se permitido).
- **lento**: executa, mas pede aprovação a cada fase e a cada gate.
- **rápido**: executa rotinas seguras automaticamente; gates apenas para ações de risco alto.
- **executar**: executa pipelines completos; gates só para risco alto e ações de produção.
- **freeze**: pausa tudo; só aceita comandos de consulta e organização.
- **emergência**: interrompe qualquer execução e bloqueia shell.

### 4.2 Comandos de modo (exemplos)
- "modo planejar"
- "modo lento"
- "modo rápido"
- "modo executar"
- "freeze"
- "emergência"

---

## 5) Padrão de interpretação (pipeline mental)
Todo comando passa por:
1) **Detectar Intent**
2) **Identificar Projeto** (novo ou existente)
3) **Identificar Domínio** (app/marketing/aula/música/vídeo/operações)
4) **Identificar Fase** (se o comando mencionar)
5) **Montar Plano** (lista de ações)
6) **Classificar Risco** (baixo/médio/alto)
7) **Aplicar Gates** (se necessário)
8) **Executar** (se permitido pelo modo)
9) **Registrar** (log + checkpoint se relevante)

---

## 6) Intents oficiais (v1)
Abaixo estão as intenções formais que o Maestro reconhece.

### 6.1 Gestão de Projetos
- **create_project**: iniciar um projeto
  - Ex.: "criar SaaS para clínica com auth e dashboard"
- **select_project**: mudar o projeto ativo
  - Ex.: "abrir projeto atlas"
- **list_projects**: listar projetos
  - Ex.: "listar projetos"
- **project_status**: status do projeto atual
  - Ex.: "status"
- **rename_project**: renomear
  - Ex.: "renomear projeto para medescala-pro"
- **reset_project**: reiniciar projeto (perigoso)
  - Ex.: "reiniciar projeto"
- **archive_project**: arquivar
  - Ex.: "arquivar projeto"

### 6.2 Fases
- **run_phase**: executar fase específica
  - Ex.: "executar fase 1"
- **plan_phase**: planejar fase específica
  - Ex.: "planejar fase 2"
- **next_phase**: avançar para a próxima fase
  - Ex.: "ir para próxima fase"
- **previous_phase**: voltar fase
  - Ex.: "voltar uma fase"

### 6.3 Execução e controle
- **plan_only**: forçar planejamento
  - Ex.: "só planejar"
- **approve**: aprovar execução pendente
  - Ex.: "aprovar" / "sim"
- **deny**: negar execução pendente
  - Ex.: "negar" / "não"
- **pause**: pausar execução
  - Ex.: "pausar"
- **resume**: retomar execução
  - Ex.: "retomar"
- **cancel**: cancelar tarefa atual
  - Ex.: "cancelar"

### 6.4 Governança
- **show_plan**: mostrar plano proposto
  - Ex.: "mostrar plano"
- **show_decisions**: mostrar decisões tomadas
  - Ex.: "mostrar decisões"
- **show_logs**: mostrar logs recentes
  - Ex.: "mostrar logs"
- **create_checkpoint**: criar checkpoint manual
  - Ex.: "criar checkpoint agora"
- **list_checkpoints**: listar checkpoints
  - Ex.: "listar checkpoints"
- **restore_checkpoint**: restaurar checkpoint (perigoso)
  - Ex.: "restaurar checkpoint 3"

### 6.5 Domínios (pipelines)
- **domain_app**
- **domain_marketing**
- **domain_education**
- **domain_music**
- **domain_video**
- **domain_ops**

O domínio pode ser inferido por palavras-chave:
- App: "next", "saas", "dashboard", "auth", "api", "db"
- Marketing: "campanha", "lançamento", "anúncios", "funil"
- Aula: "aula", "slides", "plano de aula", "conteúdo"
- Música: "música", "letra", "beat", "estilo"
- Vídeo: "roteiro", "shorts", "reels", "storyboard"
- Ops: "processo", "financeiro", "rotina", "automação"

---

## 7) Regras de desambiguação (obrigatórias)
Se o comando for ambíguo, o Maestro deve perguntar apenas 1 pergunta objetiva e oferecer opções.

Exemplos:
- "executar" → executar o quê? (fase 0/1/2/3/4)
- "reiniciar" → reiniciar qual projeto? (listar 3 mais recentes)
- "criar campanha" → campanha de quê? (produto/público/objetivo)

---

## 8) Classificação de risco (v1)
Cada ação recebe um risco:

- **baixo**: gerar docs, planejar, listar, mostrar
- **médio**: criar scaffold, instalar dependências, criar arquivos de projeto
- **alto**: apagar arquivos, `rm -rf`, mexer em secrets, deploy, terraform, restore, reset

Regras:
- risco alto sempre passa por gate
- risco médio passa por gate em modo lento e planejar
- risco baixo nunca precisa gate

---

## 9) Saída padrão do Maestro (formato de resposta)
Quando receber um comando, o Maestro responde sempre em 3 blocos:

1) **Entendi assim:** (resumo do intent, projeto, fase, modo)
2) **Plano:** (lista de ações)
3) **Preciso de você?:** (sim/não + por quê)

Se for execução:
- mostra o comando/diff resumido
- pede confirmação se necessário

---

## 10) Exemplos canônicos (v1)
### Exemplo A — Criar projeto app
Usuário: "criar SaaS para clínica com auth e dashboard"
Maestro:
- Entendi assim: create_project + domain_app + fase 0 (pensar)
- Plano: definir objetivos, stack, arquitetura, riscos, checkpoints
- Preciso de você?: sim (confirmar stack preferida se não existir padrão)

### Exemplo B — Só planejar marketing
Usuário: "só planejar campanha de lançamento do MedEscala"
Maestro:
- Entendi assim: plan_only + domain_marketing
- Plano: público, proposta, canais, funil, cronograma, peças
- Preciso de você?: sim (objetivo e oferta)

### Exemplo C — Executar fase 1
Usuário: "executar fase 1"
Maestro:
- Entendi assim: run_phase 1 no projeto ativo
- Plano: scaffold, deps, estrutura, scripts
- Preciso de você?: depende do modo e do risco (gate para shell)

---

## 11) Notas de versão
- v1: define intents, modos, risco, gates e formato de resposta.
- v2 (futuro): inclui DSL por voz, atalhos, macros e preferências por domínio.

