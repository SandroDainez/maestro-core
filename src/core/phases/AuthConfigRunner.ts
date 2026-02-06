import { MaestroAction, PhaseRisk } from "../../types";

export class AuthConfigRunner {
  getActions(): MaestroAction[] {
    return [
      {
        id: "auth-env",
        name: "Criar variáveis de ambiente auth",
        type: "config",
        risk: PhaseRisk.LOW,
        execute: async () => {
          console.log("Gerando variáveis auth...");
        },
      },
      {
        id: "auth-gitignore",
        name: "Atualizar .gitignore para auth",
        type: "config",
        risk: PhaseRisk.LOW,
        execute: async () => {
          console.log("Atualizando .gitignore...");
        },
      },
      {
        id: "auth-install-deps",
        name: "Instalar dependências de auth",
        type: "install",
        risk: PhaseRisk.MEDIUM,
        execute: async () => {
          console.log("Instalando deps auth...");
        },
      },
    ];
  }
}

