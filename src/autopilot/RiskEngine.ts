import { AutopilotRisk, AutopilotScanResult, PhaseRisk } from "../types";

export class RiskEngine {
  evaluate(scan: AutopilotScanResult): AutopilotRisk[] {
    const risks: AutopilotRisk[] = [];

    if (!scan.stack.includes("git")) {
      risks.push({
        id: "no-git",
        risk: PhaseRisk.MEDIUM,
        title: "Projeto sem Git detectado",
        detail:
          "Sem repositório Git não é possível aplicar fixes com rollback automático.",
      });
    }

    if (scan.stack.includes("prisma") && !scan.hasPrisma) {
      risks.push({
        id: "prisma-missing-schema",
        risk: PhaseRisk.HIGH,
        title: "Prisma sem schema.prisma",
        detail:
          "Dependência Prisma existe mas o arquivo prisma/schema.prisma não foi encontrado.",
      });
    }

    if (scan.hasNext && !scan.scripts.includes("dev")) {
      risks.push({
        id: "next-no-dev",
        risk: PhaseRisk.MEDIUM,
        title: "Next.js sem script dev",
        detail: "Projeto Next normalmente precisa do script 'dev'.",
      });
    }

    if (risks.length === 0) {
      risks.push({
        id: "no-issues",
        risk: PhaseRisk.LOW,
        title: "Nenhum risco estrutural detectado",
        detail: "Scan inicial não encontrou problemas críticos.",
      });
    }

    return risks;
  }
}

