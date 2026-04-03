import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { getAgentExecutionsRoot } from "@/src/lib/server/paths";

export const runtime = "nodejs";

const AGENT_ROOT = getAgentExecutionsRoot();

type FileEntry = {
  name: string;
  relativePath: string;
  size: number;
  type: string;
};

async function listFiles(dir: string, baseDir: string): Promise<FileEntry[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: FileEntry[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    const relativePath = path.relative(baseDir, fullPath);

    if (entry.isDirectory()) {
      files.push(...(await listFiles(fullPath, baseDir)));
      continue;
    }

    const stats = await fs.stat(fullPath);
    files.push({
      name: entry.name,
      relativePath,
      size: stats.size,
      type: path.extname(entry.name).replace(".", "") || "file",
    });
  }

  return files;
}

function ensureSafePath(runId: string, targetPath: string) {
  const runDir = path.resolve(AGENT_ROOT, runId);
  const resolved = path.resolve(runDir, targetPath);
  if (!resolved.startsWith(runDir)) {
    throw new Error("Caminho inválido");
  }
  return resolved;
}

export async function GET(_req: Request, { params }: { params: { runId: string } }) {
  const { runId } = params;
  const runDir = path.join(AGENT_ROOT, runId);

  try {
    const stats = await fs.stat(runDir);
    if (!stats.isDirectory()) {
      return NextResponse.json({ error: "Run inválido" }, { status: 404 });
    }
  } catch (error) {
    return NextResponse.json({ error: "Execução não encontrada" }, { status: 404 });
  }

  const url = new URL(_req.url);
  const requestedFile = url.searchParams.get("file");

  if (requestedFile) {
    try {
      const resolved = ensureSafePath(runId, requestedFile);
      const data = await fs.readFile(resolved);
      const ext = path.extname(resolved).replace(".", "") || "txt";
      const headers = new Headers({
        "Content-Type": ext === "json" || ext === "md" ? "text/plain" : "application/octet-stream",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(path.basename(resolved))}"`,
      });
      return new NextResponse(data, { status: 200, headers });
    } catch (error: any) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const files = await listFiles(runDir, runDir);
  return NextResponse.json({ files });
}
