"use client";

import { useState } from "react";

type DisplayProduct = {
  name: string;
  title?: string;
  copy?: string;
  postIdea?: string;
};

export default function Home() {
  const [objective, setObjective] = useState("");
  const [result, setResult] = useState<unknown>(null);
  const [rawResult, setRawResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  async function handleRun() {
    if (!objective.trim()) {
      const payload = {
        ok: false,
        error: "Informe um objetivo antes de executar.",
      };
      setErrorMessage("Digite um objetivo para rodar o Maestro.");
      setResult(payload);
      setRawResult(JSON.stringify(payload, null, 2));
      return;
    }

    setLoading(true);
    setErrorMessage("");
    setResult(null);
    setRawResult("");

    try {
      const response = await fetch("/api/run", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ objective }),
      });

      const payload = await response.json();
      setResult(payload);
      setRawResult(JSON.stringify(payload, null, 2));
      setErrorMessage(response.ok ? "" : payload?.error ?? "A execução falhou.");
    } catch (error) {
      const payload = {
        ok: false,
        error: "Falha ao chamar /api/run.",
        details: {
          message: error instanceof Error ? error.message : "Unknown error",
        },
      };
      setErrorMessage("Não foi possível executar agora. Tente novamente.");
      setResult(payload);
      setRawResult(JSON.stringify(payload, null, 2));
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setObjective("");
    setResult(null);
    setRawResult("");
    setErrorMessage("");
  }

  async function copyText(value: string) {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // ignore clipboard failures in the minimal UI
    }
  }

  const products = extractProducts(result);

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        padding: 24,
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 920,
          background: "#fff",
          border: "1px solid #e5e7eb",
          borderRadius: 16,
          padding: 24,
          boxShadow: "0 10px 30px rgba(0,0,0,0.06)",
        }}
      >
        <h1 style={{ fontSize: 32, marginBottom: 8 }}>Maestro</h1>
        <p style={{ marginBottom: 16, color: "#4b5563" }}>
          Digite um objetivo, execute o motor e veja o resultado transformado.
        </p>

        <div style={{ display: "grid", gap: 12 }}>
        <textarea
          value={objective}
          onChange={(event) => setObjective(event.target.value)}
          placeholder="Ex: Encontre 3 produtos de academia como afiliado e gere copy"
          rows={6}
          style={{
            width: "100%",
            padding: 12,
            fontSize: 16,
            border: "1px solid #ccc",
            borderRadius: 8,
            resize: "vertical",
          }}
        />

          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          <button
            type="button"
            onClick={handleRun}
            disabled={loading}
            style={{
              padding: "10px 16px",
              fontSize: 16,
              borderRadius: 8,
              border: "1px solid #111",
              background: loading ? "#ddd" : "#111",
              color: loading ? "#555" : "#fff",
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Running..." : "Run"}
          </button>

            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              style={{
                padding: "10px 16px",
                fontSize: 16,
                borderRadius: 8,
                border: "1px solid #ccc",
                background: "#fff",
                color: "#111",
                cursor: loading ? "not-allowed" : "pointer",
              }}
            >
              Clear
            </button>

            {loading ? (
              <span style={{ fontSize: 14, color: "#4b5563" }}>
                Running...
              </span>
            ) : null}
          </div>

          {errorMessage ? (
            <div
              style={{
                padding: 12,
                borderRadius: 8,
                border: "1px solid #fecaca",
                background: "#fef2f2",
                color: "#b91c1c",
              }}
            >
              {errorMessage}
            </div>
          ) : null}

          <section>
            <h2 style={{ fontSize: 20, marginBottom: 8 }}>Result</h2>
            {products.length > 0 ? (
              <div style={{ display: "grid", gap: 12 }}>
                {products.map((product, index) => (
                  <article
                    key={`${product.name}-${index}`}
                    style={{
                      padding: 12,
                      background: "#f4f4f4",
                      border: "1px solid #ddd",
                      borderRadius: 8,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        gap: 12,
                      }}
                    >
                      <h3 style={{ fontSize: 18, margin: 0 }}>{product.name}</h3>
                      <button
                        type="button"
                        onClick={() =>
                          copyText(
                            [
                              `Produto: ${product.name}`,
                              product.title ? `Título: ${product.title}` : "",
                              product.copy ? `Copy: ${product.copy}` : "",
                              product.postIdea ? `Post: ${product.postIdea}` : "",
                            ]
                              .filter(Boolean)
                              .join("\n")
                          )
                        }
                        style={{
                          padding: "6px 10px",
                          fontSize: 12,
                          borderRadius: 6,
                          border: "1px solid #999",
                          background: "#fff",
                          cursor: "pointer",
                        }}
                      >
                        Copy
                      </button>
                    </div>

                    {product.title ? (
                      <div style={{ marginTop: 10 }}>
                        <strong>Título</strong>
                        <p style={{ margin: "6px 0 0 0" }}>{product.title}</p>
                      </div>
                    ) : null}

                    {product.copy ? (
                      <div style={{ marginTop: 10 }}>
                        <strong>Texto de venda</strong>
                        <p style={{ margin: "6px 0 0 0" }}>{product.copy}</p>
                      </div>
                    ) : null}

                    {product.postIdea ? (
                      <div style={{ marginTop: 10 }}>
                        <strong>Roteiro/Post</strong>
                        <p style={{ margin: "6px 0 0 0", whiteSpace: "pre-wrap" }}>
                          {product.postIdea}
                        </p>
                      </div>
                    ) : null}
                  </article>
                ))}
              </div>
            ) : (
              <pre
                style={{
                  minHeight: 240,
                  padding: 12,
                  overflowX: "auto",
                  background: "#f4f4f4",
                  border: "1px solid #ddd",
                  borderRadius: 8,
                  whiteSpace: "pre-wrap",
                }}
              >
                {rawResult || "Nenhum resultado ainda."}
              </pre>
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function extractProducts(payload: unknown): DisplayProduct[] {
  const matches: DisplayProduct[] = [];

  walk(payload, (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return;
    }

    const record = value as Record<string, unknown>;
    const name = pickString(record, ["product", "name", "produto"]);
    const title = pickString(record, ["title", "titulo"]);
    const copy = pickString(record, [
      "marketingCopy",
      "salesCopy",
      "copy",
      "texto",
      "textoVenda",
    ]);
    const postIdea = pickString(record, [
      "postIdea",
      "postIdeas",
      "roteiro",
      "script",
      "post",
    ]);

    if (name && (title || copy || postIdea)) {
      matches.push({ name, title, copy, postIdea });
    }
  });

  return dedupeProducts(matches);
}

function pickString(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return undefined;
}

function walk(value: unknown, visit: (value: unknown) => void) {
  visit(value);

  if (Array.isArray(value)) {
    for (const item of value) {
      walk(item, visit);
    }
    return;
  }

  if (value && typeof value === "object") {
    for (const item of Object.values(value)) {
      walk(item, visit);
    }
  }
}

function dedupeProducts(products: DisplayProduct[]) {
  const seen = new Set<string>();
  return products.filter((product) => {
    const key = `${product.name}|${product.title}|${product.copy}|${product.postIdea}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
