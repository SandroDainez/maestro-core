import fs from "fs";
import path from "path";
import { MaestroContext, MaestroMode, MaestroProject } from "../../../types";
import { ShellRunner } from "../../../utils/ShellRunner";

export class AuthPhase {
  id = "auth";
  label = "Autenticação (Supabase)";

  async run(
    project: MaestroProject,
    ctx: MaestroContext,
    mode: MaestroMode
  ): Promise<string> {
    const created: string[] = [];

    const base = project.path;

    // ----------------------------
    // 1. Install deps
    // ----------------------------
    await ShellRunner.exec("npm install @supabase/supabase-js", base);

    created.push("node_modules/@supabase/supabase-js");

    // ----------------------------
    // 2. Env example
    // ----------------------------
    const envPath = path.join(base, ".env.example");

    if (!fs.existsSync(envPath)) {
      fs.writeFileSync(
        envPath,
        `NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
`
      );

      created.push(".env.example");
    }

    // ----------------------------
    // 3. Lib folder
    // ----------------------------
    const libDir = path.join(base, "lib");

    if (!fs.existsSync(libDir)) {
      fs.mkdirSync(libDir, { recursive: true });
    }

    const supabaseClientPath = path.join(libDir, "supabase.ts");

    if (!fs.existsSync(supabaseClientPath)) {
      fs.writeFileSync(
        supabaseClientPath,
        `import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey
);
`
      );

      created.push("lib/supabase.ts");
    }

    // ----------------------------
    // 4. README append
    // ----------------------------
    const readmePath = path.join(base, "README.md");

    if (fs.existsSync(readmePath)) {
      fs.appendFileSync(
        readmePath,
        `

## 🔐 Autenticação (Supabase)

Este projeto utiliza Supabase para autenticação.

### Setup:

1. Crie um projeto em https://supabase.com
2. Copie as chaves para um arquivo \`.env.local\`
3. Use \`lib/supabase.ts\` para acessar o client.

Providers suportados futuramente:
- Clerk
- Auth.js
`
      );
    }

    return `🔐 Supabase Auth configurado (${created.length} artefatos criados).`;
  }
}

