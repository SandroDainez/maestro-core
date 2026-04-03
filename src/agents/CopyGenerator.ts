type CopyPayload = {
  objective: string;
  product?: string;
  audience?: string;
};

type GeneratedCopy = {
  headline: string;
  description: string;
  cta: string;
  tone: string;
};

export function generateCopy(payload: CopyPayload): GeneratedCopy {
  const product = payload.product?.trim() || "sua solução";
  const audience = payload.audience?.trim() || "clientes ideais";
  const objective = payload.objective.trim() || "dar um salto de receita";

  const headline = `${audience} + ${product}`;
  const description = `Objetivo: ${objective}. Apresente ${product} como a escolha clara para ${audience} com benefícios concretos.`;
  const callToAction = `Descubra como ${product} transforma ${audience}.`;
  const tone = "Confiante e direto";

  return {
    headline,
    description,
    cta: callToAction,
    tone,
  };
}
