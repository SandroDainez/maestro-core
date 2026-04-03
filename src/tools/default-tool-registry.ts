import { ToolRegistry } from "./ToolRegistry";
import { FileReadTool, FileWriteTool } from "./file-tools";
import { ShellCommandTool } from "./shell-tool";
import { HttpRequestTool } from "./http-tool";
import { LLMCodeGenerationTool } from "./llm-codegen-tool";

export function createDefaultToolRegistry() {
  const registry = new ToolRegistry();
  registry.register(FileReadTool);
  registry.register(FileWriteTool);
  registry.register(ShellCommandTool);
  registry.register(HttpRequestTool);
  registry.register(LLMCodeGenerationTool);
  return registry;
}
