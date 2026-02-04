import fs from "fs";
import path from "path";
import { MaestroContext, MaestroMode, MaestroProject } from "../../../types";
import { ShellRunner } from "../../../utils/ShellRunner";

export class DatabasePhase {
  id = "database";
  label = "Banco de dados (Postgres + Prisma)";

  async run(
    project: MaestroProject,
    ctx: MaestroContext,
    mode: MaestroMode
  ): Promise<string> {
    const created: string[] = [];

    const base = project.path;

    // ----------------------------
    // 1. Install Prisma + client
    // ----------------------------
    await ShellRunner.exec(
      "npm install prisma @prisma/client",
      base
    );

    created.push("node_modules/prisma");

    // ----------------------------
    // 2. Init Prisma (se não existir)
    // ----------------------------
    const prismaDir = path.join(base, "prisma");

    if (!fs.existsSync(prismaDir)) {
      await ShellRunner.exec("npx prisma init", base);
      created.push("prisma/schema.prisma");
    }

    const schemaPath = path.join(prismaDir, "schema.prisma");

    // ----------------------------
    // 3. Default schema
    // ----------------------------
    if (fs.existsSync(schemaPath)) {
      fs.writeFileSync(
        schemaPath,
        `generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id        String   @id @default(uuid())
  email     String   @unique
  createdAt DateTime @default(now())
}
`
      );
    }

    // ----------------------------
    // 4. Env example update
    // ----------------------------
    const envPath = path.join(base, ".env.example");

    const dbEnv = `
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DATABASE"
`;

    if (fs.existsSync(envPath)) {
      const existing = fs.readFileSync(envPath, "utf-8");

      if (!existing.includes("DATABASE_URL")) {
        fs.appendFileSync(envPath, dbEnv);
        created.push(".env.example (DATABASE_URL)");
      }
    } else {
      fs.writeFileSync(envPath, dbEnv);
      created.push(".env.example");
    }

    // ----------------------------
    // 5. README append
    // ----------------------------
    const readmePath = path.join(base, "README.md");

    if (fs.existsSync(readmePath)) {
      fs.appendFileSync(
        readmePath,
        `

## 🗄 Banco de Dados (Postgres + Prisma)

Este projeto usa Prisma ORM com Postgres.

### Setup:

1. Crie um banco Postgres local ou cloud (Supabase, Neon, Railway, RDS).
2. Atualize \`DATABASE_URL\` no \`.env.local\`.
3. Rode:

\`\`\`bash
npx prisma migrate dev --name init
\`\`\`

4. Gere o client:

\`\`\`bash
npx prisma generate
\`\`\`
`
      );
    }

    return `🗄 Prisma + Postgres configurados (${created.length} artefatos criados).`;
  }
}

