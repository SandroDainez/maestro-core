export function parseArgs(argv: string[]) {
  const subcommand = argv[2] || "help";
  const path = argv[3] || ".";
  const apply = argv.includes("--apply");

  return { subcommand, path, apply };
}

