import fs from "fs";
import path from "path";
import { z } from "zod";

import type { Tool } from "./types";

function resolveInsideProject(projectRoot: string, targetPath: string) {
  const resolved = path.resolve(projectRoot, targetPath);
  const resolvedRoot = path.resolve(projectRoot);
  if (!resolved.startsWith(resolvedRoot)) {
    throw new Error(`Path escapes project root: ${targetPath}`);
  }
  return resolved;
}

function assertWritablePathAllowed(
  projectRoot: string,
  filePath: string,
  protectedPaths: string[] = []
) {
  const normalized = path.resolve(filePath);
  const protectedResolved = protectedPaths.map((item) =>
    path.resolve(projectRoot, item)
  );

  if (protectedResolved.some((item) => normalized.startsWith(item))) {
    throw new Error(`Write blocked by protected path policy: ${normalized}`);
  }
}

export const FileReadTool: Tool<
  { path: string; allowMissing?: boolean },
  { path: string; exists: boolean; content: string | null }
> = {
  name: "file_read",
  inputSchema: z.object({
    path: z.string().min(1),
    allowMissing: z.boolean().optional(),
  }),
  outputSchema: z.object({
    path: z.string(),
    exists: z.boolean(),
    content: z.string().nullable(),
  }),
  async execute(input, context) {
    const filePath = resolveInsideProject(context.projectRoot, input.path);
    if (!fs.existsSync(filePath)) {
      if (input.allowMissing) {
        return {
          path: filePath,
          exists: false,
          content: null,
        };
      }
      throw new Error(`File not found: ${input.path}`);
    }

    return {
      path: filePath,
      exists: true,
      content: await fs.promises.readFile(filePath, "utf-8"),
    };
  },
};

export const FileWriteTool: Tool<
  { path: string; content: string },
  { path: string; bytesWritten: number }
> = {
  name: "file_write",
  inputSchema: z.object({
    path: z.string().min(1),
    content: z.string(),
  }),
  outputSchema: z.object({
    path: z.string(),
    bytesWritten: z.number().int().nonnegative(),
  }),
  async execute(input, context) {
    const filePath = resolveInsideProject(context.projectRoot, input.path);
    const writableRoots = context.sandbox?.writableRoots ?? [context.projectRoot];
    if (!writableRoots.some((root) => filePath.startsWith(path.resolve(root)))) {
      throw new Error(`Write blocked outside writable roots: ${input.path}`);
    }
    assertWritablePathAllowed(
      context.projectRoot,
      filePath,
      context.sandbox?.protectedPaths ?? []
    );
    await fs.promises.mkdir(path.dirname(filePath), { recursive: true });
    await fs.promises.writeFile(filePath, input.content, "utf-8");
    return {
      path: filePath,
      bytesWritten: Buffer.byteLength(input.content, "utf-8"),
    };
  },
};
