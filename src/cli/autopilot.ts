import { AutopilotEngine } from "../autopilot/AutopilotEngine";

function usage() {
  console.log(`
Uso:
  maestro autopilot run <path>
  maestro autopilot fix <path> [--apply]

Notas:
  - "fix" por padrão é DRY-RUN (não faz push).
  - Use --apply para permitir push da branch no origin.
`);
}

export async function runAutopilot(args: string[]) {
  const sub = args[0];
  const projectPath = args[1];

  if (!sub || !projectPath) {
    usage();
    process.exit(1);
  }

  const engine = new AutopilotEngine();

  if (sub === "run") {
    const result = await engine.runDiagnostics({ projectPath });
    console.log(JSON.stringify(result, null, 2));
    return;
  }

  if (sub === "fix") {
    const apply = args.includes("--apply");
    const result = await engine.runAutoFix({ projectPath, apply });
    console.log(result.summary);
    console.log("Branch:", result.branchName || "-");
    console.log("Commands:");
    for (const c of result.commandsRun) console.log(" -", c);
    if (!result.ok) process.exit(1);
    return;
  }

  usage();
  process.exit(1);
}

