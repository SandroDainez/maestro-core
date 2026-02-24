import { prisma } from "../../../src/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const runs = await prisma.pipelineRun.findMany({
      orderBy: {
        startedAt: "desc", // 🔥 corrigido aqui
      },
      take: 50,
      include: {
        project: true,
      },
    });

    return NextResponse.json(runs);
  } catch (error) {
    console.error("Erro listando runs:", error);
    return NextResponse.json(
      { error: "Erro ao buscar execuções" },
      { status: 500 }
    );
  }
}