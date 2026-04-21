import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const email = "nrecordsmeat@gmail.com";
  const password = await hash("password", 10);

  const user = await prisma.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      password,
      name: "Demo Artist",
    },
  });

  console.log(`Seeded user: ${user.email}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
