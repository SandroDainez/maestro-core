import fs from "fs";
import path from "path";
import { AppArchitectAgent } from "../../../agents/AppArchitectAgent";
import { ArchitectureSpec, PipelinePhase } from "../../../types";

export class ArchitecturePhase implements PipelinePhase<ArchitectureSpec> {
  name = "Fase 0 — Arquitetura";
  description = "Gera especificação do produto, módulos, modelos e endpoints.";

  async run({ project, ctx, mode }: any): Promise<ArchitectureSpec> {
    const agent = new AppArchitectAgent();
    const spec = agent.buildSpec(ctx.goal);

    const md = this.toMarkdown(spec);

    if (mode === "executar") {
      fs.writeFileSync(path.join(project.path, "architecture.json"), JSON.stringify(spec, null, 2));
      fs.writeFileSync(path.join(project.path, "architecture.md"), md);
    }

    return spec;
  }

  private toMarkdown(spec: ArchitectureSpec): string {
    return `# Arquitetura — ${spec.productName}

## Problema
${spec.problem}

## Domínio
${spec.domain}

## Usuários
- ${spec.users.join("\n- ")}

## Funcionalidades principais
- ${spec.coreFeatures.join("\n- ")}

## Requisitos não-funcionais
- ${spec.nonFunctional.join("\n- ")}

## Stack
- Frontend: ${spec.stack.frontend}
- Backend: ${spec.stack.backend}
- Database: ${spec.stack.database}
- Auth: ${spec.stack.auth}
- Hosting: ${spec.stack.hosting}

## Módulos
${spec.modules.map(m => `- **${m.name}**: ${m.description}`).join("\n")}

## Modelos de dados
${spec.dataModels.map(m => `- **${m.name}**: ${m.fields.join(", ")}`).join("\n")}

## Endpoints (rascunho)
${spec.apiEndpoints.map(e => `- ${e.method} ${e.path} — ${e.description}`).join("\n")}

## Riscos / Alertas
- ${spec.risks.join("\n- ")}
`;
  }
}

