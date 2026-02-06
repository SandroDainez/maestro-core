// src/core/fs/FsWriter.ts

import fs from "fs";
import path from "path";

export class FsWriter {
  constructor(private root: string) {}

  resolve(...parts: string[]) {
    return path.join(this.root, ...parts);
  }

  ensureDir(relPath: string) {
    const full = this.resolve(relPath);

    if (!fs.existsSync(full)) {
      fs.mkdirSync(full, { recursive: true });
      console.log("📂 mkdir", relPath);
    }
  }

  writeFile(relPath: string, content: string) {
    const full = this.resolve(relPath);

    fs.writeFileSync(full, content);
    console.log("📝 write", relPath);
  }

  writeIfMissing(relPath: string, content: string) {
    const full = this.resolve(relPath);

    if (fs.existsSync(full)) {
      console.log("⏭️  skip (exists)", relPath);
      return;
    }

    fs.writeFileSync(full, content);
    console.log("📝 write", relPath);
  }

  exists(relPath: string) {
    return fs.existsSync(this.resolve(relPath));
  }
}

