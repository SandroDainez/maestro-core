export type AgentPhaseDefinition = {
  code: string;
  label: string;
  description: string;
};

export type AgentObjectiveContext = {
  product?: string;
  audience?: string;
  deliverables?: string[];
};

const AGENT_PHASE_LIBRARY: AgentPhaseDefinition[] = [
  {
    code: "research-product",
    label: "Pesquisa do produto",
    description: "Mapeia o produto afiliado, benefícios e proposta de valor.",
  },
  {
    code: "generate-copy",
    label: "Criar cópia",
    description: "Gera títulos, descrições e chamadas para ação.",
  },
  {
    code: "generate-landing",
    label: "Montar landing page",
    description: "Constrói um protótipo de página de captura.",
  },
  {
    code: "launch-campaign",
    label: "Planejar campanha",
    description: "Configura budgets criativos em redes sociais.",
  },
  {
    code: "monitor-performance",
    label: "Monitorar métricas",
    description: "Cria relatório inicial com KPIs e comissões esperadas.",
  },
  {
    code: "produce-slides",
    label: "Produzir slides e roteiro",
    description: "Gera sequência de slides e textos para apresentação.",
  },
  {
    code: "produce-video",
    label: "Planejar vídeo",
    description: "Define roteiro em cenas curtas e mensagens em vídeo.",
  },
  {
    code: "compose-music",
    label: "Criar música",
    description: "Sugere trilha sonora ou jingle para o projeto.",
  },
];

export class AgentPlanner {
  plan(objective: string, context?: AgentObjectiveContext): AgentPhaseDefinition[] {
    const normalized = objective.toLowerCase();
    const basePlan = [
      AGENT_PHASE_LIBRARY[0],
      AGENT_PHASE_LIBRARY[1],
      AGENT_PHASE_LIBRARY[2],
    ];

    if (normalized.includes("campanha") || normalized.includes("afiliado")) {
      return [
        ...basePlan,
        AGENT_PHASE_LIBRARY[3],
        AGENT_PHASE_LIBRARY[4],
      ];
    }

    if (normalized.includes("slides") || normalized.includes("apresenta")) {
      return [
        ...basePlan,
        AGENT_PHASE_LIBRARY[5],
      ];
    }

    if (normalized.includes("vídeo") || normalized.includes("video")) {
      return [
        ...basePlan,
        AGENT_PHASE_LIBRARY[6],
      ];
    }

    if (normalized.includes("música") || normalized.includes("musica") || normalized.includes("jingle")) {
      return [
        ...basePlan,
        AGENT_PHASE_LIBRARY[7],
      ];
    }

    return basePlan;
  }
}
