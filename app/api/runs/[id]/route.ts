import { NextResponse } from "next/server";

import { prisma } from "../../../../src/db/prisma";

export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  try {
    const run = await prisma.pipelineRun.findUnique({
      where: {
        id: params.id,
      },
      include: {
        project: true,
        phases: true, // 👈 nome real no Prisma
      },
    });

    if (!run) {
      return NextResponse.json(
        { error: "Execução não encontrada" },
        { status: 404 }
      );
    }

    return NextResponse.json(run);
  } catch (err) {
    console.error("RUN DETAILS ERROR:", err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

