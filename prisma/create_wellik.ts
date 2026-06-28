import "dotenv/config";
import { PrismaClient } from "../src/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

async function main() {
  const user = await prisma.user.update({
    where: { email: "wellikc.leal@zenix.com" },
    data: { role: "DEV" },
  });
  console.log("Atualizado:", user.name, "| Função:", user.role);
}

main()
  .catch((e) => { console.error("Erro:", e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
