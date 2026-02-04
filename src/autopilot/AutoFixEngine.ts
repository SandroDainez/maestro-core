import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export type AutoFixOptions = {
  projectPath: string;
  dryRun?: boolean; // default true
  branchPrefix?: string; // default "autofix"
};

export type AutoFixResult = {
  ok: boolean;
  projectPath: string;
  branchName?: string;
  commandsRun: string[];
  summary: string;
};

function exists(p: string) {
  try {
    fs.accessSync(p);
    return true;
  } catch {
    return false;
  }
}

function sh(cmd: string, cwd: string) {
  return execSync(cmd, { cwd, stdio: "pipe", encoding: "utf8" }).trim();
}

function shTry(cmd: string, cwd: string) {
  try {
    const out = execSync(cmd, { cwd, stdio: "pipe", encoding: "utf8" }).trim();
    return { ok: true, out };
  } catch (e: any) {
    const out = (e?.stdout?.toString?.() || "") + "\n" + (e?.stderr?.toString?.() || "");
    return { ok: false, out: out.trim() };
  }
}

function isGitRepo(cwd: string) {
  const r = shTry("git rev-parse --is-inside-work-tree", cwd);
  return r.ok && r.out.includes("true");
}

function hasRemoteOrigin(cwd: string) {
  const r = shTry("git remote get-url origin", cwd);
  return r.ok && r.out.length > 0;
}

function gitDirty(cwd: string) {
  const r = shTry("git status --porcelain", cwd);
  return r.ok && r.out.trim().length > 0;
}

function readPkgScripts(cwd: string) {
  const pkgPath = path.join(cwd, "package.json");
  if (!exists(pkgPath)) return {};
  const raw = fs.readFileSync(pkgPath, "utf8");
  const json = JSON.parse(raw);
  return (json?.scripts || {}) as Record<string, string>;
}

function nowStamp() {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}-${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`;
}

export class AutoFixEngine {
  async run(opts: AutoFixOptions): Promise<AutoFixResult> {
    const projectPath = path.resolve(opts.projectPath);
    const dryRun = opts.dryRun !== false; // default true
    const branchPrefix = opts.branchPrefix || "autofix";

    const commandsRun: string[] = [];

    if (!exists(projectPath)) {
      return { ok: false, projectPath, commandsRun, summary: `Pasta não existe: ${projectPath}` };
    }

    if (!isGitRepo(projectPath)) {
      return { ok: false, projectPath, commandsRun, summary: `Não é repositório git: ${projectPath}` };
    }

    // Segurança: se estiver sujo, aborta (pra não misturar com mudanças locais)
    if (gitDirty(projectPath)) {
      return {
        ok: false,
        projectPath,
        commandsRun,
        summary: "Repo está sujo (git status com mudanças). Faça commit/stash antes do Auto-Fix.",
      };
    }

    const scripts = readPkgScripts(projectPath);
    const hasNode = Object.keys(scripts).length > 0;

    // Cria branch
    const branchName = `${branchPrefix}/${nowStamp()}`;
    commandsRun.push(`git checkout -b ${branchName}`);
    const b = shTry(`git checkout -b ${branchName}`, projectPath);
    if (!b.ok) {
      return { ok: false, projectPath, commandsRun, summary: `Falha ao criar branch: ${b.out}` };
    }

    // Estratégia:
    // 1) Rodar lint/test (se existir)
    // 2) Se falhar, tentar “lint -- --fix” ou scripts de fix
    // 3) Rodar novamente lint/test
    // 4) Se houver mudanças, commit
    // 5) Se --apply e tiver origin, push (senão, fica local)

    const plan: string[] = [];

    if (hasNode) {
      if (scripts["lint"]) plan.push("npm run lint");
      if (scripts["test"]) plan.push("npm test");
      if (plan.length === 0 && scripts["build"]) plan.push("npm run build");
    } else {
      // fallback genérico
      plan.push("git status --porcelain");
    }

    // Rodar “check”
    for (const cmd of plan) {
      commandsRun.push(cmd);
      const r = shTry(cmd, projectPath);
      if (!r.ok) {
        // Tentativas de correção
        const fixAttempts: string[] = [];

        if (hasNode) {
          if (scripts["lint:fix"]) fixAttempts.push("npm run lint:fix");
          if (scripts["format"]) fixAttempts.push("npm run format");
          if (scripts["format:write"]) fixAttempts.push("npm run format:write");

          // tentativa padrão: lint com --fix
          if (scripts["lint"]) fixAttempts.push("npm run lint -- --fix");
        }

        for (const fx of fixAttempts) {
          commandsRun.push(fx);
          shTry(fx, projectPath); // mesmo se falhar, seguimos
        }

        // Re-run do comando que falhou
        commandsRun.push(cmd);
        const r2 = shTry(cmd, projectPath);
        if (!r2.ok) {
          return {
            ok: false,
            projectPath,
            branchName,
            commandsRun,
            summary: `Auto-Fix tentou corrigir, mas ainda falha em: "${cmd}". Saída:\n${r2.out}`,
          };
        }
      }
    }

    // Se gerou mudanças, commit
    const st = shTry("git status --porcelain", projectPath);
    const changed = st.ok && st.out.trim().length > 0;

    if (changed) {
      commandsRun.push("git add -A");
      shTry("git add -A", projectPath);

      const msg = "chore(autofix): apply automatic fixes";
      commandsRun.push(`git commit -m "${msg}"`);
      const c = shTry(`git commit -m "${msg}"`, projectPath);
      if (!c.ok) {
        return {
          ok: false,
          projectPath,
          branchName,
          commandsRun,
          summary: `Falha no commit. Saída:\n${c.out}`,
        };
      }
    }

    // Push opcional
    if (!dryRun) {
      if (!hasRemoteOrigin(projectPath)) {
        return {
          ok: false,
          projectPath,
          branchName,
          commandsRun,
          summary: "Sem remote origin configurado. Configure origin para permitir push.",
        };
      }

      commandsRun.push(`git push -u origin ${branchName}`);
      const p = shTry(`git push -u origin ${branchName}`, projectPath);
      if (!p.ok) {
        return {
          ok: false,
          projectPath,
          branchName,
          commandsRun,
          summary: `Falha no push. Saída:\n${p.out}`,
        };
      }
    }

    return {
      ok: true,
      projectPath,
      branchName,
      commandsRun,
      summary: dryRun
        ? "✅ Auto-Fix terminou em DRY-RUN (sem push). Branch criada e (se houve) commit local feito."
        : "✅ Auto-Fix terminou e fez push da branch para origin.",
    };
  }
}


