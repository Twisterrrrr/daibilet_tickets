import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { ChatAuthorType, ChatConversationStatus, Prisma } from '@/prisma-client';
import { createHash, randomBytes, timingSafeEqual } from 'crypto';

import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';

function sha256Hex(input: string): string {
  return createHash('sha256').update(input, 'utf8').digest('hex');
}

function safeEqualHex(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  try {
    return timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

@Injectable()
export class ChatService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  private assertHoneypot(honey?: string) {
    if (typeof honey === 'string' && honey.trim().length > 0) {
      throw new BadRequestException('Invalid request');
    }
  }

  async startConversation(data: { name?: string; email?: string; message: string; honey?: string }) {
    this.assertHoneypot(data.honey);

    const guestToken = randomBytes(24).toString('hex');
    const guestTokenHash = sha256Hex(guestToken);

    const now = new Date();

    const conversation = await this.prisma.chatConversation.create({
      data: {
        status: ChatConversationStatus.OPEN,
        guestName: data.name?.trim() || null,
        guestEmail: data.email?.trim().toLowerCase() || null,
        guestTokenHash,
        lastCustomerMessageAt: now,
        messages: {
          create: {
            authorType: ChatAuthorType.CUSTOMER,
            authorName: data.name?.trim() || null,
            text: data.message,
          },
        },
      },
      select: { id: true, guestName: true, guestEmail: true },
    });

    // Fire-and-forget: email support about a new chat that needs reply.
    void this.mail.notifyAdminChatNeedsReply({
      conversationId: conversation.id,
      guestName: conversation.guestName,
      guestEmail: conversation.guestEmail,
      message: data.message,
    });

    return {
      conversationId: conversation.id,
      guestToken,
    };
  }

  async assertConversationOwner(conversationId: string, guestToken: string) {
    const conv = await this.prisma.chatConversation.findUnique({
      where: { id: conversationId },
      select: { id: true, guestTokenHash: true },
    });
    if (!conv) throw new NotFoundException('Conversation not found');

    const expected = conv.guestTokenHash;
    if (!expected) throw new BadRequestException('Conversation has no guest token');

    const actual = sha256Hex(guestToken);
    if (!safeEqualHex(expected, actual)) {
      throw new NotFoundException('Conversation not found');
    }
  }

  async listMessages(conversationId: string, guestToken: string, after?: string) {
    await this.assertConversationOwner(conversationId, guestToken);

    let afterDate: Date | undefined;
    if (after) {
      const d = new Date(after);
      if (!Number.isNaN(d.getTime())) afterDate = d;
    }

    const where: Prisma.ChatMessageWhereInput = {
      conversationId,
      ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
    };

    const items = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 50,
      select: {
        id: true,
        authorType: true,
        authorName: true,
        text: true,
        createdAt: true,
      },
    });

    return { items };
  }

  async sendCustomerMessage(conversationId: string, guestToken: string, data: { text: string; honey?: string }) {
    this.assertHoneypot(data.honey);
    await this.assertConversationOwner(conversationId, guestToken);

    const now = new Date();
    const conv = await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        lastCustomerMessageAt: now,
        status: ChatConversationStatus.OPEN,
        messages: {
          create: {
            authorType: ChatAuthorType.CUSTOMER,
            text: data.text,
          },
        },
      },
      select: { id: true, guestName: true, guestEmail: true },
    });

    void this.mail.notifyAdminChatNeedsReply({
      conversationId: conv.id,
      guestName: conv.guestName,
      guestEmail: conv.guestEmail,
      message: data.text,
    });

    return { status: 'ok' };
  }

  async adminListConversations(params: { status?: string; needsReply?: boolean; search?: string; limit: number }) {
    const where: Prisma.ChatConversationWhereInput = {};
    if (params.status) where.status = params.status as ChatConversationStatus;
    if (params.search) {
      where.OR = [
        { guestEmail: { contains: params.search, mode: 'insensitive' } },
        { guestName: { contains: params.search, mode: 'insensitive' } },
      ];
    }

    const raw = await this.prisma.chatConversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: Math.min(200, Math.max(1, params.limit)),
      select: {
        id: true,
        status: true,
        guestName: true,
        guestEmail: true,
        userId: true,
        lastCustomerMessageAt: true,
        lastAdminMessageAt: true,
        updatedAt: true,
        _count: { select: { messages: true } },
      },
    });

    const items = params.needsReply
      ? raw.filter((c) => {
          if (!c.lastCustomerMessageAt) return false;
          if (!c.lastAdminMessageAt) return true;
          return c.lastCustomerMessageAt > c.lastAdminMessageAt;
        })
      : raw;

    return { items };
  }

  async adminSendMessage(conversationId: string, data: { text: string; adminId?: string; adminName?: string }) {
    const now = new Date();
    await this.prisma.chatConversation.update({
      where: { id: conversationId },
      data: {
        lastAdminMessageAt: now,
        messages: {
          create: {
            authorType: ChatAuthorType.ADMIN,
            authorAdminId: data.adminId ?? null,
            authorName: data.adminName ?? 'Поддержка',
            text: data.text,
          },
        },
      },
    });
    return { status: 'ok' };
  }

  async adminListMessages(conversationId: string, after?: string) {
    let afterDate: Date | undefined;
    if (after) {
      const d = new Date(after);
      if (!Number.isNaN(d.getTime())) afterDate = d;
    }

    const where: Prisma.ChatMessageWhereInput = {
      conversationId,
      ...(afterDate ? { createdAt: { gt: afterDate } } : {}),
    };

    const items = await this.prisma.chatMessage.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: 50,
      select: {
        id: true,
        authorType: true,
        authorName: true,
        text: true,
        createdAt: true,
      },
    });

    return { items };
  }
}

