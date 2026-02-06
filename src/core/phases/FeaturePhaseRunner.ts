// src/core/phases/FeaturePhaseRunner.ts

import fs from "fs";
import path from "path";
import { execSync } from "child_process";

import { MaestroAction, PhaseRisk } from "../../types";
import { ProjectRegistry } from "../projects/ProjectRegistry";

export class FeaturePhaseRunner {
  constructor(private registry: ProjectRegistry) {}

  getActions(): MaestroAction[] {
    const projectPath = this.registry.getActiveProject().rootPath;

    return [
      {
        id: "feature-prisma-install",
        name: "Instalar Prisma",
        type: "install",
        risk: PhaseRisk.HIGH,
        execute: async () => {
          console.log("📦 Instalando Prisma...");

          execSync("npm install prisma @prisma/client", {
            cwd: projectPath,
            stdio: "inherit",
          });

          if (!fs.existsSync(path.join(projectPath, "prisma"))) {
            execSync("npx prisma init", {
              cwd: projectPath,
              stdio: "inherit",
            });
          }
        },
      },

      {
        id: "feature-prisma-schema",
        name: "Criar schema base",
        type: "scaffold",
        risk: PhaseRisk.MEDIUM,
        execute: async () => {
          const prismaDir = path.join(projectPath, "prisma");

          fs.mkdirSync(prismaDir, { recursive: true });

          const schemaPath = path.join(prismaDir, "schema.prisma");

          if (fs.existsSync(schemaPath)) {
            console.log("⏭️  skip (exists) prisma/schema.prisma");
            return;
          }

          const schema = `
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  password  String
  role      String
  createdAt DateTime @default(now())
}
`.trim();

          fs.writeFileSync(schemaPath, schema);

          console.log("📝 write prisma/schema.prisma");
        },
      },

      {
        id: "feature-env",
        name: "Criar .env.example",
        type: "config",
        risk: PhaseRisk.LOW,
        execute: async () => {
          const envPath = path.join(projectPath, ".env.example");

          if (fs.existsSync(envPath)) {
            console.log("⏭️  skip (exists) .env.example");
            return;
          }

          fs.writeFileSync(
            envPath,
            `DATABASE_URL="postgresql://user:password@localhost:5432/dbname"`
          );

          console.log("📝 write .env.example");
        },
      },
    ];
  }
}

