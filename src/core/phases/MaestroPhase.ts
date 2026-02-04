import { MaestroContext, MaestroProject } from "../../types";

/**
 * Resultado padrão de qualquer fase
 */
export interface PhaseResult {
  success: boolean;
  message?: string;
}

/**
 * Classe base para TODAS as fases do Maestro
 */
export abstract class MaestroPhase {
  /** Nome único da fase */
  abstract name: string;

  /** Dependências obrigatórias */
  dependsOn: string[] = [];

  constructor(dependsOn: string[] = []) {
    this.dependsOn = dependsOn;
  }

  /**
   * Execução da fase
   */
  abstract run(
    project: MaestroProject,
    ctx: MaestroContext,
    mode: string
  ): Promise<PhaseResult>;
}

