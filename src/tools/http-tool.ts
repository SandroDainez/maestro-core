import { z } from "zod";

import type { Tool } from "./types";

export const HttpRequestTool: Tool<
  {
    url: string;
    method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    headers?: Record<string, string>;
    body?: string;
  },
  {
    status: number;
    headers: Record<string, string>;
    body: string;
  }
> = {
  name: "http_request",
  inputSchema: z.object({
    url: z.string().url(),
    method: z.enum(["GET", "POST", "PUT", "PATCH", "DELETE"]).optional(),
    headers: z.record(z.string(), z.string()).optional(),
    body: z.string().optional(),
  }),
  outputSchema: z.object({
    status: z.number().int(),
    headers: z.record(z.string(), z.string()),
    body: z.string(),
  }),
  async execute(input) {
    const response = await fetch(input.url, {
      method: input.method ?? "GET",
      headers: input.headers,
      body: input.body,
    });
    const body = await response.text();
    return {
      status: response.status,
      headers: Object.fromEntries(response.headers.entries()),
      body,
    };
  },
};
