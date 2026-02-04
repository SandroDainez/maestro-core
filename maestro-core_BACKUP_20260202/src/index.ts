#!/usr/bin/env node

import { Command } from "commander";
import chalk from "chalk";

import { MaestroEngine } from "./core/MaestroEngine";
import { MemoryStore } from "./memory/MemoryStore";
import { AuditLogger } from "./logs/AuditLogger";
import { ProjectRegistry } from "./projects/ProjectRegistry";

const program = new Command();

program
  .name("maestro")
  .description("🎼 Maestro — agente orquestrador universal")
  .version("1.0.0");

function createEngine() {
  return new MaestroEngine(
    new MemoryStore(),
    new AuditLogger()
  );
}

/**
 * -----------------------------
 * RUN
 * -----------------------------
 */
program
  .command("run")
  .description("Executar um objetivo usando o Maestro")
  .argument("<goal>", "Objetivo em linguagem natural")
  .action(async (goal: string) => {
    console.log(chalk.blueBright("🎼 Maestro iniciado!"));

    const engine = createEngine();

    try {
      const result = await engine.run(goal, process.cwd());

      console.log(chalk.green("\n✅ Resultado:"));
      console.log(result);
    } catch (err: any) {
      console.error(chalk.red("\n❌ Erro ao executar:"));
      console.error(err?.message || err);
      process.exit(1);
    }
  });

/**
 * -----------------------------
 * PROJECTS
 * -----------------------------
 */
program
  .command("projects")
  .description("Listar projetos registrados")
  .action(() => {
    const registry = new ProjectRegistry();

    const projects = registry.listProjects();

    if (!projects.length) {
      console.log(chalk.yellow("⚠ Nenhum projeto encontrado."));
      return;
    }

    console.log(chalk.cyan("\n📦 Projetos:"));
    for (const p of projects) {
      console.log(
        `• ${chalk.bold(p.id)} — ${p.name} (${p.createdAt})`
      );
    }
  });

/**
 * -----------------------------
 * ROLLBACK
 * -----------------------------
 */
program
  .command("rollback")
  .description("Realizar rollback de um projeto")
  .argument("<projectId>", "ID do projeto")
  .action(async (projectId: string) => {
    console.log(chalk.yellow(`⏪ Rollback solicitado para ${projectId}`));

    const engine = createEngine();

    try {
      // Futuro: engine.rollback(projectId)
      console.log(
        chalk.gray(
          "⚠ Rollback CLI ainda não conectado ao engine. (stub inicial)"
        )
      );
    } catch (err: any) {
      console.error(chalk.red("❌ Erro no rollback"));
      console.error(err?.message || err);
    }
  });

/**
 * -----------------------------
 * AUDIT
 * -----------------------------
 */
program
  .command("audit")
  .description("Rodar auditoria técnica do ambiente/projetos")
  .action(() => {
    console.log(chalk.magenta("🔍 Auditoria ainda não implementada."));
    console.log("Será ligada à AuditPhase futuramente.");
  });

/**
 * -----------------------------
 * FALLBACK
 * -----------------------------
 * Compatibilidade:
 * npm run dev -- "meu objetivo"
 */
program
  .arguments("[goal...]")
  .action(async (goal: string[]) => {
    if (!goal || !goal.length) {
      program.help();
      return;
    }

    const joinedGoal = goal.join(" ");

    console.log(
      chalk.gray(
        "⚠ Usando modo legado: maestro run \"objetivo\" é o recomendado."
      )
    );

    const engine = createEngine();

    try {
      const result = await engine.run(joinedGoal, process.cwd());

      console.log(chalk.green("\n✅ Resultado:"));
      console.log(result);
    } catch (err: any) {
      console.error(chalk.red("\n❌ Erro ao executar:"));
      console.error(err?.message || err);
      process.exit(1);
    }
  });

program.parse(process.argv);

