import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const email = process.argv[2];
const passwordHash = process.argv[3];

if (!email || !passwordHash) {
  console.log("Uso:");
  console.log("  node scripts/set-password-hash.mjs EMAIL HASH");
  process.exit(1);
}

async function main() {
  console.log("Atualizando user:", email);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log("❌ Usuário não encontrado:", email);
    return;
  }

  console.log("User atual:", { id: user.id, email: user.email, passwordHash: user.passwordHash });

  const updated = await prisma.user.update({
    where: { email },
    data: { passwordHash },
  });

  console.log("✅ Atualizado com sucesso!");
  console.log("Depois:", { id: updated.id, email: updated.email, passwordHash: updated.passwordHash });
}

main()
  .catch((e) => {
    console.error("❌ ERRO ao atualizar:");
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
