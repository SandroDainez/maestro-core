// src/core/projects/ProjectRegistry.ts

import { MaestroProject } from "../../types";
import * as crypto from "crypto";

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export class ProjectRegistry {
  private projects: MaestroProject[] = [];
  private activeProjectId?: string;

  list(): MaestroProject[] {
    return [...this.projects];
  }

  create(name: string): MaestroProject {
    const cleaned = name.trim();
    if (!cleaned) {
      throw new Error("Nome do projeto vazio.");
    }

    const slug = slugify(cleaned);
    const id = crypto.randomUUID();

    const project: MaestroProject = {
      id,
      name: cleaned,
      slug,
      createdAt: new Date(),
    };

    this.projects.push(project);
    this.activeProjectId = project.id;
    return project;
  }

  /**
   * Ativa um projeto por id, slug ou nome (case-insensitive).
   */
  activate(nameOrId: string): MaestroProject {
    const key = nameOrId.trim();
    if (!key) throw new Error("Informe o nome/slug/id do projeto.");

    const found =
      this.projects.find((p) => p.id === key) ||
      this.projects.find((p) => p.slug === slugify(key)) ||
      this.projects.find((p) => p.name.toLowerCase() === key.toLowerCase());

    if (!found) {
      throw new Error(`Projeto não encontrado: ${key}`);
    }

    this.activeProjectId = found.id;
    return found;
  }

  getActiveProject(): MaestroProject | null {
    if (!this.activeProjectId) return null;
    return this.projects.find((p) => p.id === this.activeProjectId) ?? null;
  }

  /**
   * Útil para debug
   */
  getActiveProjectId(): string | null {
    return this.activeProjectId ?? null;
  }
}

