import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seed() {
  console.log("🌱 Starting seed (Cleaning database)...");

  try {
    await prisma.record.deleteMany({});
    await prisma.user.deleteMany({});
    console.log("✅ Database completely cleared of demo data.");
  } catch (err: any) {
    console.error("❌ Seed failed:", err.message);
  } finally {
    await prisma.$disconnect();
  }
}

seed();
