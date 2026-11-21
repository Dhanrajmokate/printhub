import bcrypt from 'bcryptjs';
import { prisma } from './prisma.js';

async function main() {
  console.log('[Seed] Seeding database with demo Customer and Shop data...');

  const hashedPassword = await bcrypt.hash('password123', 10);

  // 0. Create Demo Super Admin
  const adminEmail = 'admin@printhub.com';
  let adminUser = await prisma.user.findUnique({ where: { email: adminEmail } });

  if (!adminUser) {
    adminUser = await prisma.user.create({
      data: {
        email: adminEmail,
        password: hashedPassword,
        name: 'System Super Admin',
        phone: '9999900000',
        role: 'ADMIN',
        isVerified: true
      }
    });
    console.log('[Seed] Created demo admin: admin@printhub.com / password123 (Role: ADMIN)');
  } else if (adminUser.role !== 'ADMIN') {
    await prisma.user.update({
      where: { id: adminUser.id },
      data: { role: 'ADMIN', isVerified: true }
    });
    console.log('[Seed] Updated existing user to role: ADMIN');
  }

  // 1. Create Demo Customer
  const customerEmail = 'customer@printhub.com';
  let customer = await prisma.user.findUnique({ where: { email: customerEmail } });

  if (!customer) {
    customer = await prisma.user.create({
      data: {
        email: customerEmail,
        password: hashedPassword,
        name: 'Alex Johnson',
        phone: '9876500001',
        role: 'CUSTOMER',
        isVerified: true
      }
    });

    const wallet = await prisma.wallet.create({
      data: {
        userId: customer.id,
        balance: 100.0 // ₹100 signup bonus
      }
    });

    await prisma.transaction.create({
      data: {
        walletId: wallet.id,
        amount: 100.0,
        type: 'CREDIT',
        description: 'Welcome Bonus Credit (₹100)'
      }
    });

    console.log('[Seed] Created demo customer: customer@printhub.com / password123 (Wallet: ₹100.00)');
  }

  // 2. Create Demo Shop 1 (Apex QuickPrint Hub)
  const shopEmail = 'shop@printhub.com';
  let shopUser = await prisma.user.findUnique({ where: { email: shopEmail } });

  if (!shopUser) {
    shopUser = await prisma.user.create({
      data: {
        email: shopEmail,
        password: hashedPassword,
        name: 'Apex Printing Co.',
        phone: '9876543210',
        role: 'SHOP',
        isVerified: true
      }
    });

    const shop1 = await prisma.shop.create({
      data: {
        userId: shopUser.id,
        name: 'Apex QuickPrint Hub',
        address: 'Shop #4, Metro Station Arcade, MG Road',
        phone: '9876543210',
        bwSingleRate: 2.0,
        bwDuplexRate: 3.0,
        colorSingleRate: 10.0,
        colorDuplexRate: 18.0,
        upiId: 'kp6755411@ybl',
        upiName: 'Apex QuickPrint Hub',
        autoConvert: true
      }
    });

    await prisma.printer.createMany({
      data: [
        {
          shopId: shop1.id,
          name: 'High-Speed B&W Laser 8001',
          port: 8001,
          type: 'BW',
          supportsDuplex: true,
          isOnline: true,
          autoConvert: true
        },
        {
          shopId: shop1.id,
          name: 'Pro Studio Color Inkjet 8002',
          port: 8002,
          type: 'COLOR',
          supportsDuplex: true,
          isOnline: true,
          autoConvert: true
        }
      ]
    });

    console.log('[Seed] Created demo shop: shop@printhub.com / password123 (Printers: 8001 BW, 8002 Color)');
  }

  // 3. Create Demo Shop 2 (Campus Express Prints)
  const shop2Email = 'campus@printhub.com';
  let shop2User = await prisma.user.findUnique({ where: { email: shop2Email } });

  if (!shop2User) {
    shop2User = await prisma.user.create({
      data: {
        email: shop2Email,
        password: hashedPassword,
        name: 'Campus Print Corner',
        phone: '9123456789',
        role: 'SHOP',
        isVerified: true
      }
    });

    const shop2 = await prisma.shop.create({
      data: {
        userId: shop2User.id,
        name: 'Campus Express Print Hub',
        address: 'Block C, University Student Center',
        phone: '9123456789',
        bwSingleRate: 1.5,
        bwDuplexRate: 2.5,
        colorSingleRate: 8.0,
        colorDuplexRate: 15.0,
        upiId: 'kp6755411@ybl',
        upiName: 'Campus Express Print Hub',
        autoConvert: true
      }
    });

    await prisma.printer.createMany({
      data: [
        {
          shopId: shop2.id,
          name: 'Campus B&W Laser 8001',
          port: 8001,
          type: 'BW',
          supportsDuplex: true,
          isOnline: true,
          autoConvert: true
        },
        {
          shopId: shop2.id,
          name: 'Campus Color Jet 8002',
          port: 8002,
          type: 'COLOR',
          supportsDuplex: true,
          isOnline: true,
          autoConvert: true
        }
      ]
    });

    console.log('[Seed] Created second demo shop: campus@printhub.com / password123');
  }

  // 4. Create Demo Shop 3 (Dhanraj Station Print Shop)
  const dhanrajEmail = 'dhanraj@printhub.com';
  let dhanrajUser = await prisma.user.findUnique({ where: { email: dhanrajEmail } });

  if (!dhanrajUser) {
    dhanrajUser = await prisma.user.create({
      data: {
        email: dhanrajEmail,
        password: hashedPassword,
        name: 'Dhanraj Gopal Mokate',
        phone: '9876543213',
        role: 'SHOP',
        isVerified: true
      }
    });

    const shop3 = await prisma.shop.create({
      data: {
        userId: dhanrajUser.id,
        name: 'Dhanraj Station Print Shop',
        address: 'Railway Station Road, Commercial Complex, Shop #11',
        phone: '9876543213',
        bwSingleRate: 2.0,
        bwDuplexRate: 3.5,
        colorSingleRate: 12.0,
        colorDuplexRate: 20.0,
        upiId: 'dhanraj@upi',
        upiName: 'Dhanraj Station Print',
        autoConvert: true
      }
    });

    await prisma.printer.createMany({
      data: [
        {
          shopId: shop3.id,
          name: 'Dhanraj Heavy-Duty Laser 8001',
          port: 8001,
          type: 'BW',
          supportsDuplex: true,
          isOnline: true,
          autoConvert: true
        },
        {
          shopId: shop3.id,
          name: 'Dhanraj Studio Color Jet 8002',
          port: 8002,
          type: 'COLOR',
          supportsDuplex: true,
          isOnline: true,
          autoConvert: true
        }
      ]
    });

    console.log('[Seed] Created third shop: dhanraj@printhub.com / password123');
  }

  console.log('[Seed] Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('[Seed] Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
