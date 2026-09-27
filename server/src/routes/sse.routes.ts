import { Router, Request, Response } from 'express';
import { verifyToken } from '../utils/jwt.js';
import { sseService } from '../services/sse.service.js';
import { prisma } from '../prisma.js';

const router = Router();

router.get('/stream', async (req: Request, res: Response) => {
  try {
    const token = (req.query.token as string) || req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ success: false, message: 'Token required for SSE connection' });
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    // Determine shopId if role is SHOP
    let shopId: string | undefined;
    if (payload.role === 'SHOP') {
      const shop = await prisma.shop.findUnique({
        where: { userId: payload.userId }
      });
      if (shop) shopId = shop.id;
    }

    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders();

    const clientId = `sse_${payload.userId}_${Date.now()}`;
    sseService.addClient(clientId, payload.userId, payload.role, res, shopId);

    // Keep connection alive with periodic heartbeats
    const heartbeatInterval = setInterval(() => {
      res.write(': heartbeat\n\n');
    }, 25000);

    req.on('close', () => {
      clearInterval(heartbeatInterval);
      sseService.removeClient(clientId);
    });
  } catch (error: any) {
    console.error('SSE connection error:', error);
    return res.status(500).end();
  }
});

export default router;
