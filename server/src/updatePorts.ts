import { prisma } from './prisma.js';

async function main() {
  await prisma.printer.updateMany({
    where: { type: 'BW' },
    data: { port: 8001 }
  });

  await prisma.printer.updateMany({
    where: { type: 'COLOR' },
    data: { port: 8002 }
  });

  const printers = await prisma.printer.findMany();
  console.log('Updated printers:', printers);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
