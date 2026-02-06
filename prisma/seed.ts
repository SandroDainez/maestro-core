import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Maestro Core seed starting...");

  const tenant = await prisma.tenant.upsert({
    where: { slug: "default" },
    update: {},
    create: {
      slug: "default",
      name: "Default Tenant",
    },
  });

  console.log("✅ Tenant:", tenant.id);

  const project = await prisma.project.upsert({
    where: {
      tenantId_slug: {
        tenantId: tenant.id,
        slug: "maestro-core",
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      slug: "maestro-core",
      name: "Maestro Core",
      path: "/maestro-core",
    },
  });

  console.log("✅ Project:", project.id);

  const run = await prisma.pipelineRun.create({
    data: {
      projectId: project.id,
      status: "queued",
    },
  });

  console.log("✅ PipelineRun:", run.id);

  const phases = ["init", "auth", "dashboard", "rbac", "seed"];

  for (const name of phases) {
    await prisma.pipelinePhaseRun.create({
      data: {
        runId: run.id,
        name,
        status: "queued",
      },
    });
  }

  console.log("🎉 Seed finalizado com sucesso!");
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

