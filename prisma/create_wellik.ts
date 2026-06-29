import "dotenv/config";
import { PrismaClient } from "../src/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const hash = await bcrypt.hash("wlkzn", 10);
  const user = await prisma.user.upsert({
    where: { email: "wellikc.leal@zenix.com" },
    update: { role: "DEV", password: hash },
    create: {
      name: "Wellik Leal",
      email: "wellikc.leal@zenix.com",
      password: hash,
      role: "DEV",
    },
  });
  console.log("Usuário DEV garantido:", user.email);
}

main()
  .catch((e) => { console.error("Erro:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
