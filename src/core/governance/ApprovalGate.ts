import type { AutopilotRisk } from "../../types";

export type ApprovalRequest = {
  required: boolean;
  reason?: string;
  token?: string;
};

export class ApprovalGate {
  evaluate(input: {
    autoExecute: boolean;
    approved?: boolean;
    risks: AutopilotRisk[];
  }): ApprovalRequest {
    if (!input.autoExecute) {
      return { required: false };
    }

    const hasHighRisk = input.risks.some((risk) => risk.risk === "HIGH");

    if (!hasHighRisk) {
      return { required: false };
    }

    if (input.approved) {
      return { required: false };
    }

    return {
      required: true,
      reason: "Execucao bloqueada ate aprovacao humana explicita por risco HIGH.",
      token: "human-approval-required",
    };
  }
}
