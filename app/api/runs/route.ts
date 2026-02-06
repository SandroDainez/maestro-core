// app/api/runs/route.ts

import { NextResponse } from "next/server";
import { prisma } from "../../../src/db/prisma";

export async function GET() {
  try {
    const runs = await prisma.pipelineRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
      include: {
        project: true,
      },
    });

    return NextResponse.json(runs);
  } catch (err) {
    console.error("Erro listando runs:", err);

    return NextResponse.json(
      { error: "Erro ao buscar execuções" },
      { status: 500 }
    );
  }
}

