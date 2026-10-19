import { Response } from 'express';

interface SSEClient {
  id: string;
  userId: string;
  role: 'CUSTOMER' | 'SHOP';
  shopId?: string;
  res: Response;
}

class SSEService {
  private clients: Map<string, SSEClient> = new Map();

  constructor() {
    // Send 25s keepalive ping comments to prevent cloud reverse proxies (Render, Cloudflare) from closing idle streams
    setInterval(() => {
      for (const client of this.clients.values()) {
        try {
          client.res.write(': keepalive\n\n');
        } catch (e) {
          this.removeClient(client.id);
        }
      }
    }, 25000);
  }

  addClient(id: string, userId: string, role: 'CUSTOMER' | 'SHOP', res: Response, shopId?: string) {
    this.clients.set(id, { id, userId, role, shopId, res });
    console.log(`[SSE] Client connected: ${id} (User: ${userId}, Role: ${role}, Shop: ${shopId || 'N/A'})`);

    // Send initial handshake
    this.sendToClient(id, 'connected', { message: 'SSE connection established', clientId: id });
  }

  removeClient(id: string) {
    this.clients.delete(id);
    console.log(`[SSE] Client disconnected: ${id}`);
  }

  sendToClient(clientId: string, event: string, data: any) {
    const client = this.clients.get(clientId);
    if (client) {
      try {
        client.res.write(`event: ${event}\n`);
        client.res.write(`data: ${JSON.stringify(data)}\n\n`);
      } catch (err) {
        console.error(`[SSE] Error sending event to ${clientId}:`, err);
        this.removeClient(clientId);
      }
    }
  }

  notifyUser(userId: string, event: string, data: any) {
    for (const client of this.clients.values()) {
      if (client.userId === userId) {
        this.sendToClient(client.id, event, data);
      }
    }
  }

  notifyShop(shopId: string, event: string, data: any) {
    for (const client of this.clients.values()) {
      if (client.shopId === shopId || (client.role === 'SHOP' && client.shopId === shopId)) {
        this.sendToClient(client.id, event, data);
      }
    }
  }

  broadcast(event: string, data: any) {
    for (const client of this.clients.values()) {
      this.sendToClient(client.id, event, data);
    }
  }
}

export const sseService = new SSEService();
