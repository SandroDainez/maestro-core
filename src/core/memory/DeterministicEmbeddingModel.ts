import type { EmbeddingModel } from "./types";

export class DeterministicEmbeddingModel implements EmbeddingModel {
  constructor(private readonly dimensions = 128) {}

  async embed(input: string): Promise<number[]> {
    const vector = new Array<number>(this.dimensions).fill(0);
    const normalized = input.trim().toLowerCase();
    const tokens = normalized.match(/[a-z0-9_-]+/g) ?? [];

    if (tokens.length === 0) {
      return vector;
    }

    for (const token of tokens) {
      let hash = 2166136261;
      for (let index = 0; index < token.length; index += 1) {
        hash ^= token.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
      }

      const position = Math.abs(hash) % this.dimensions;
      const sign = hash % 2 === 0 ? 1 : -1;
      vector[position] += sign;
    }

    const magnitude = Math.sqrt(
      vector.reduce((total, value) => total + value * value, 0)
    );

    if (magnitude === 0) {
      return vector;
    }

    return vector.map((value) => value / magnitude);
  }
}
