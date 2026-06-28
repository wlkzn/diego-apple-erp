import "dotenv/config";
import { PrismaClient } from "../src/generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as bcrypt from "bcryptjs";

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("Iniciando semeadura do banco de dados...");

  // 1. Criar Usuário Administrador
  const adminEmail = "admin@diegoapple.store";
  const existingAdmin = await prisma.user.findUnique({
    where: { email: adminEmail },
  });

  if (!existingAdmin) {
    const hashedPassword = bcrypt.hashSync("DiegoApple2026!", 10);
    await prisma.user.create({
      data: {
        name: "Diego Apple Store Admin",
        email: adminEmail,
        password: hashedPassword,
        role: "ADMIN",
      },
    });
    console.log("Usuário administrador criado com sucesso!");
  } else {
    console.log("Usuário administrador já existe.");
  }

  // 2. Criar Configuração Padrão da Loja
  const settingsCount = await prisma.companySetting.count();
  if (settingsCount === 0) {
    await prisma.companySetting.create({
      data: {
        name: "Diego Apple Store",
        cnpj: "12.345.678/0001-99",
        address: "Av. das Américas, 500 - Barra da Tijuca, Rio de Janeiro - RJ",
        phone: "(21) 99999-8888",
        email: "contato@diegoapple.store",
        contractTerms: `CLÁUSULA PRIMEIRA - DO OBJETO
O objeto do presente contrato é a venda parcelada do(s) equipamento(s) celular(es) listado(s) no comprovante de compra, com garantia legal e termos estipulados entre as partes.

CLÁUSULA SEGUNDA - DAS PARCELAS E VENCIMENTOS
O COMPRADOR obriga-se a pagar as parcelas nas datas pactuadas. O atraso em qualquer parcela acarretará multa de 2% (dois por cento) sobre o valor vencido, acrescido de juros de mora de 1% (um por cento) ao mês.

CLÁUSULA TERCEIRA - DA GARANTIA
Os aparelhos seminovos possuem garantia de funcionamento de 90 dias a contar da data de entrega, cobrindo apenas defeitos de hardware que não sejam decorrentes de mau uso, quedas ou contato com líquidos. Aparelhos novos seguem a garantia oficial da fabricante Apple de 1 (um) ano.

CLÁUSULA QUARTA - DA INADIMPLÊNCIA
O atraso superior a 30 (trinta) dias de qualquer parcela poderá ensejar a inclusão do COMPRADOR nos órgãos de proteção ao crédito (SPC/SERASA) e a execução judicial do saldo devedor integral remanescente.`,
      },
    });
    console.log("Configurações padrão da loja criadas com sucesso!");
  } else {
    console.log("Configurações da loja já existem.");
  }

  console.log("Semeadura concluída!");
}

main()
  .catch((e) => {
    console.error("Erro na semeadura:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
