import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";

export async function GET() {
  const audits = await prisma.deletionAudit.findMany({
    orderBy: { deletedAt: "desc" },
    take: 10,
  });
  return NextResponse.json({ audits });
}
