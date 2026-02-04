// src/core/mode/ModeController.ts

import { MaestroEngine } from "../MaestroEngine";
import { MaestroMode } from "../../types";

export class ModeController {
  constructor(private engine: MaestroEngine) {}

  handle(input: string): boolean {
    const cmd = input.trim().toLowerCase();

    if (cmd === "mode plan") {
      this.engine.setMode("plan");
      console.log("🧠 Modo alterado para: PLAN");
      return true;
    }

    if (cmd === "mode execute") {
      this.engine.setMode("execute");
      console.log("🚀 Modo alterado para: EXECUTE");
      return true;
    }

    if (cmd === "mode slow") {
      this.engine.setMode("slow");
      console.log("🐢 Modo alterado para: SLOW");
      return true;
    }

    return false;
  }
}

