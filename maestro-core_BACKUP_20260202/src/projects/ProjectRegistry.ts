import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

export type ProjectRecord = {
  id: string;
  name: string;
  path: string;
  createdAt: Date;
};

export class ProjectRegistry {
  private baseDir: string;

  constructor() {
    this.baseDir = path.resolve(
      process.cwd(),
      "src/projects/data"
    );

    if (!fs.existsSync(this.baseDir)) {
      fs.mkdirSync(this.baseDir, { recursive: true });
    }
  }

  listProjects(): ProjectRecord[] {
    if (!fs.existsSync(this.baseDir)) return [];

    const dirs = fs.readdirSync(this.baseDir);

    return dirs.map((dir) => {
      const full = path.join(this.baseDir, dir);

      return {
        id: dir,
        name: dir,
        path: full,
        createdAt: fs.statSync(full).ctime,
      };
    });
  }

  create(name: string): ProjectRecord {
    const slug = name
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)+/g, "");

    const id = randomUUID();

    const folder = `${slug}`;

    const projectPath = path.join(this.baseDir, folder);

    if (!fs.existsSync(projectPath)) {
      fs.mkdirSync(projectPath, { recursive: true });
    }

    return {
      id,
      name,
      path: projectPath,
      createdAt: new Date(),
    };
  }
}

