import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const audits = await prisma.deletionAudit.findMany({
    orderBy: { deletedAt: "desc" },
    take: 10,
  });
  return NextResponse.json({ audits });
}
