import { ProjectScanner } from "./ProjectScanner";

export class AutopilotEngine {
  static scan(path: string) {
    return ProjectScanner.scan(path);
  }
}

