const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

async function main() {
  const email = "sandrodainez@hotmail.com";
  const name = "Sandro";
  const tenantSlug = "sandro";
  const tenantName = "Sandro (Local)";
  const projectSlug = "medescala";
  const projectName = "MedEscala Oficial";

  const passwordHash =
    "$2b$10$mVAiBfpa3Z1.12Ge/RBFcuJQvdho8/3XXUZvN8/025NXTYfDu6BNO";

  const tenant = await prisma.tenant.upsert({
    where: { slug: tenantSlug },
    update: { name: tenantName },
    create: { slug: tenantSlug, name: tenantName },
  });

  const user = await prisma.user.upsert({
    where: { email },
    update: { name, passwordHash },
    create: { email, name, passwordHash },
  });

  await prisma.tenantUser.upsert({
    where: {
      userId_tenantId: {
        userId: user.id,
        tenantId: tenant.id,
      },
    },
    update: {},
    create: {
      userId: user.id,
      tenantId: tenant.id,
    },
  });

  const project = await prisma.project.upsert({
    where: { slug: projectSlug },
    update: {
      name: projectName,
      path: "/projects/medescala",
    },
    create: {
      slug: projectSlug,
      name: projectName,
      path: "/projects/medescala",
      tenantId: tenant.id,
    },
  });

  console.log("✅ Seed OK");
  console.log({
    tenantId: tenant.id,
    userId: user.id,
    projectId: project.id,
  });
}

main()
  .catch((e) => {
    console.error("❌ Seed error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
