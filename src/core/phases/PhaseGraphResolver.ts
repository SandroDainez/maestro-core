import { PhaseRegistry } from "./PhaseRegistry";
import { MaestroPhase } from "./MaestroPhase";

export class PhaseGraphResolver {
  static resolve(requested: string[]): MaestroPhase[] {
    const registry = PhaseRegistry.list();

    const map = new Map<string, MaestroPhase>();
    registry.forEach(p => map.set(p.name, p));

    const visited = new Set<string>();
    const visiting = new Set<string>();
    const ordered: MaestroPhase[] = [];

    function visit(name: string) {
      if (visited.has(name)) return;

      if (visiting.has(name)) {
        throw new Error(`Ciclo detectado na DAG: ${name}`);
      }

      const phase = map.get(name);
      if (!phase) {
        throw new Error(`Fase desconhecida: ${name}`);
      }

      visiting.add(name);

      for (const dep of phase.dependsOn || []) {
        visit(dep);
      }

      visiting.delete(name);
      visited.add(name);
      ordered.push(phase);
    }

    requested.forEach(p => visit(p));

    return ordered;
  }
}

