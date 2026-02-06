import path from "path";
import { fileExists } from "../../utils/fsx";

export class PrismaScanner {
  scan(projectPath: string) {
    const schema = path.join(projectPath, "prisma", "schema.prisma");
    return { hasPrisma: fileExists(schema) };
  }
}

