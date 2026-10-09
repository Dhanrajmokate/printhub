import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../prisma.js';
import { generateToken } from '../utils/jwt.js';
import { generateAndSendOtp, verifyOtp } from '../services/email.service.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { authenticate, AuthenticatedRequest } from '../middleware/auth.js';

const router = Router();

// Apply auth rate limiter
router.use(authRateLimiter);

// 1. REGISTER
router.post('/register', async (req, res: Response) => {
  try {
    const { email, password, name, phone, role, shopName, shopAddress } = req.body;

    if (!email || !password || !name) {
      return res.status(400).json({ success: false, message: 'Email, password, and name are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check existing
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail }
    });

    if (existingUser) {
      if (existingUser.isVerified) {
        return res.status(400).json({ success: false, message: 'An account with this email already exists. Please sign in.' });
      }

      // User registered previously but did not verify OTP yet. Update credentials and resend fresh code:
      const hashedPassword = await bcrypt.hash(password, 10);
      const userRole = role === 'SHOP' ? 'SHOP' : 'CUSTOMER';

      await prisma.user.update({
        where: { id: existingUser.id },
        data: {
          name: name.trim(),
          password: hashedPassword,
          phone: phone ? phone.trim() : null,
          role: userRole
        }
      });

      if (userRole === 'SHOP') {
        const existingShop = await prisma.shop.findUnique({ where: { userId: existingUser.id } });
        if (existingShop) {
          await prisma.shop.update({
            where: { id: existingShop.id },
            data: {
              name: shopName ? shopName.trim() : `${name.trim()}'s Print Shop`,
              address: shopAddress ? shopAddress.trim() : '123 Main Market Road',
              phone: phone ? phone.trim() : '9876543210'
            }
          });
        } else {
          const shop = await prisma.shop.create({
            data: {
              userId: existingUser.id,
              name: shopName ? shopName.trim() : `${name.trim()}'s Print Shop`,
              address: shopAddress ? shopAddress.trim() : '123 Main Market Road',
              phone: phone ? phone.trim() : '9876543210',
              bwSingleRate: 2.0,
              bwDuplexRate: 3.0,
              colorSingleRate: 10.0,
              colorDuplexRate: 18.0,
              autoConvert: true
            }
          });
          await prisma.printer.createMany({
            data: [
              { shopId: shop.id, name: 'High-Speed B&W Laser', port: 8001, type: 'BW', supportsDuplex: true, isOnline: true, autoConvert: true },
              { shopId: shop.id, name: 'Pro Glossy Color Inkjet', port: 8002, type: 'COLOR', supportsDuplex: true, isOnline: true, autoConvert: true }
            ]
          });
        }
      }

      const { otp, emailSent } = await generateAndSendOtp(existingUser.email, 'REGISTRATION');

      return res.status(200).json({
        success: true,
        message: emailSent
          ? 'Verification code sent to your email.'
          : 'Registration updated! Check the on-screen verification code.',
        email: existingUser.email,
        debugOtp: otp
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const userRole = role === 'SHOP' ? 'SHOP' : 'CUSTOMER';

    // Create user in transaction
    const user = await prisma.$transaction(async (tx) => {
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          password: hashedPassword,
          name: name.trim(),
          phone: phone ? phone.trim() : null,
          role: userRole,
          isVerified: false
        }
      });

      if (userRole === 'CUSTOMER') {
        // Create Customer Wallet with ₹100 welcome bonus
        const wallet = await tx.wallet.create({
          data: {
            userId: newUser.id,
            balance: 100.0
          }
        });

        await tx.transaction.create({
          data: {
            walletId: wallet.id,
            amount: 100.0,
            type: 'CREDIT',
            description: 'Welcome Bonus (₹100)'
          }
        });
      } else {
        // Create Shop profile & default printers
        const shop = await tx.shop.create({
          data: {
            userId: newUser.id,
            name: shopName ? shopName.trim() : `${name.trim()}'s Print Shop`,
            address: shopAddress ? shopAddress.trim() : '123 Main Market Road',
            phone: phone ? phone.trim() : '9876543210',
            bwSingleRate: 2.0,
            bwDuplexRate: 3.0,
            colorSingleRate: 10.0,
            colorDuplexRate: 18.0,
            autoConvert: true
          }
        });

        // Add default B&W and Color printers
        await tx.printer.createMany({
          data: [
            {
              shopId: shop.id,
              name: 'High-Speed B&W Laser',
              port: 8001,
              type: 'BW',
              supportsDuplex: true,
              isOnline: true,
              autoConvert: true
            },
            {
              shopId: shop.id,
              name: 'Pro Glossy Color Inkjet',
              port: 8002,
              type: 'COLOR',
              supportsDuplex: true,
              isOnline: true,
              autoConvert: true
            }
          ]
        });
      }

      return newUser;
    });

    // Send OTP
    const { otp, emailSent } = await generateAndSendOtp(user.email, 'REGISTRATION');

    return res.status(201).json({
      success: true,
      message: emailSent
        ? 'Registration initiated! Please enter the OTP sent to your email.'
        : 'Registration initiated! Check the on-screen OTP code to verify.',
      email: user.email,
      debugOtp: otp
    });
  } catch (error: any) {
    console.error('Registration error:', error);
    return res.status(500).json({ success: false, message: error.message || 'Registration failed' });
  }
});

// 2. VERIFY OTP
router.post('/verify-otp', async (req, res: Response) => {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ success: false, message: 'Email and OTP are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const isValid = await verifyOtp(normalizedEmail, otp, 'REGISTRATION');

    if (!isValid) {
      return res.status(400).json({ success: false, message: 'Invalid or expired OTP. Please try again.' });
    }

    // Mark user verified
    const user = await prisma.user.update({
      where: { email: normalizedEmail },
      data: { isVerified: true },
      include: {
        wallet: true,
        shop: {
          include: {
            printers: true
          }
        }
      }
    });

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'CUSTOMER' | 'SHOP',
      name: user.name
    });

    return res.json({
      success: true,
      message: 'Account verified successfully!',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        wallet: user.wallet,
        shop: user.shop
      }
    });
  } catch (error: any) {
    console.error('Verify OTP error:', error);
    return res.status(500).json({ success: false, message: 'Verification failed' });
  }
});

// 3. SEND / RESEND OTP
router.post('/send-otp', async (req, res: Response) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ success: false, message: 'Email is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    const { otp, emailSent } = await generateAndSendOtp(user.email, 'REGISTRATION');

    return res.json({
      success: true,
      message: emailSent ? 'New OTP sent to email' : 'New verification code generated',
      debugOtp: otp
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to send OTP' });
  }
});

// 4. LOGIN
router.post('/login', async (req, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: {
        wallet: true,
        shop: {
          include: {
            printers: true
          }
        }
      }
    });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    if (!user.isVerified) {
      // Auto trigger OTP for unverified accounts
      const { otp, emailSent } = await generateAndSendOtp(user.email, 'REGISTRATION');
      return res.status(403).json({
        success: false,
        requiresOtp: true,
        message: emailSent
          ? 'Account not verified. Please enter the OTP sent to your email.'
          : 'Account not verified. Check the on-screen code to activate your account.',
        email: user.email,
        debugOtp: otp
      });
    }

    const token = generateToken({
      userId: user.id,
      email: user.email,
      role: user.role as 'CUSTOMER' | 'SHOP',
      name: user.name
    });

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        wallet: user.wallet,
        shop: user.shop
      }
    });
  } catch (error: any) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Login failed' });
  }
});

// 5. GET /me (Current User Profile & Balance)
router.get('/me', authenticate, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: {
        wallet: true,
        shop: {
          include: {
            printers: true
          }
        }
      }
    });

    if (!user) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    return res.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        phone: user.phone,
        role: user.role,
        isVerified: user.isVerified,
        wallet: user.wallet,
        shop: user.shop
      }
    });
  } catch (error: any) {
    return res.status(500).json({ success: false, message: 'Failed to fetch user' });
  }
});

export default router;
