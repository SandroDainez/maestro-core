export async function GET() {
  return Response.json({ ok: true, service: "web", ts: Date.now() });
}
