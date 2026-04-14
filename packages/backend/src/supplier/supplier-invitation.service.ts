import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupplierRole } from '@/prisma-client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';

import { PrismaService } from '../prisma/prisma.service';
import { SupplierAuthService } from './supplier-auth.service';

const TOKEN_BYTES = 32;
const EXPIRY_DAYS = 7;

@Injectable()
export class SupplierInvitationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly authService: SupplierAuthService,
  ) {}

  async create(operatorId: string, inviterId: string, email: string, role: SupplierRole) {
    const emailLower = email.toLowerCase().trim();

    const existingUser = await this.prisma.supplierUser.findUnique({
      where: { email: emailLower },
    });
    if (existingUser && existingUser.operatorId === operatorId) {
      throw new ConflictException('Пользователь с этим email уже в команде');
    }

    const pendingInv = await this.prisma.supplierInvitation.findFirst({
      where: { operatorId, email: emailLower, acceptedAt: null },
    });
    if (pendingInv && pendingInv.expiresAt > new Date()) {
      throw new ConflictException('Приглашение на этот email уже отправлено');
    }

    const token = crypto.randomBytes(TOKEN_BYTES).toString('hex');
    const expiresAt = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);

    const inv = await this.prisma.supplierInvitation.create({
      data: { operatorId, email: emailLower, role, token, expiresAt },
    });

    return { id: inv.id, email: inv.email, role: inv.role, expiresAt: inv.expiresAt, token };
  }

  async list(operatorId: string) {
    const items = await this.prisma.supplierInvitation.findMany({
      where: { operatorId },
      orderBy: { createdAt: 'desc' },
    });

    const users = await this.prisma.supplierUser.findMany({
      where: { operatorId },
      select: { id: true, email: true, name: true, role: true, isActive: true },
    });

    return {
      invitations: items.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        token: i.token,
        expiresAt: i.expiresAt,
        acceptedAt: i.acceptedAt,
        createdAt: i.createdAt,
      })),
      users,
    };
  }

  async delete(operatorId: string, id: string) {
    const inv = await this.prisma.supplierInvitation.findFirst({
      where: { id, operatorId },
    });
    if (!inv) throw new NotFoundException('Приглашение не найдено');
    if (inv.acceptedAt) throw new BadRequestException('Приглашение уже принято');

    await this.prisma.supplierInvitation.delete({ where: { id } });
    return { message: 'Приглашение отменено' };
  }

  async accept(token: string, name: string, password: string) {
    const inv = await this.prisma.supplierInvitation.findUnique({
      where: { token },
      include: { operator: true },
    });

    if (!inv) throw new NotFoundException('Приглашение не найдено');
    if (inv.acceptedAt) throw new BadRequestException('Приглашение уже принято');
    if (inv.expiresAt < new Date()) throw new BadRequestException('Приглашение истекло');

    const existingUser = await this.prisma.supplierUser.findUnique({
      where: { email: inv.email },
    });
    if (existingUser) throw new ConflictException('Email уже зарегистрирован');

    const passwordHash = await bcrypt.hash(password, 10);

    await this.prisma.$transaction(async (tx) => {
      await tx.supplierUser.create({
        data: {
          operatorId: inv.operatorId,
          email: inv.email,
          passwordHash,
          name,
          role: inv.role,
        },
      });

      await tx.supplierInvitation.update({
        where: { id: inv.id },
        data: { acceptedAt: new Date(), acceptedBy: null },
      });
    });

    const user = await this.prisma.supplierUser.findUnique({
      where: { email: inv.email },
      select: { id: true, email: true, role: true, operatorId: true },
    });
    if (!user) throw new Error('User creation failed');

    return this.authService.issueTokensForUser(user.id, user.email, user.role, user.operatorId);
  }
}
