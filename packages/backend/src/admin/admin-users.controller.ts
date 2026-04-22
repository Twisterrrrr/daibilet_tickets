import { Body, Controller, Get, Param, Patch, UseGuards, UseInterceptors } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { AdminRole } from '@/prisma-client';
import { IsBoolean, IsEmail, IsEnum, IsOptional, IsString, MaxLength } from 'class-validator';

import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { Roles, RolesGuard } from '../auth/roles.guard';
import { PrismaService } from '../prisma/prisma.service';
import { AuditInterceptor } from './audit.interceptor';
import { AdminUsersService } from './admin-users.service';

class UpdateAdminUserDto {
  @IsOptional()
  @IsEnum(AdminRole)
  role?: AdminRole;

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

class CreateAdminUserDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MaxLength(120)
  name!: string;

  @IsEnum(AdminRole)
  role!: AdminRole;

  @IsString()
  @MaxLength(200)
  passwordHash!: string;
}

@ApiTags('admin')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@UseInterceptors(AuditInterceptor)
@Controller('admin/users')
export class AdminUsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly adminUsers: AdminUsersService,
  ) {}

  @Get()
  @Roles('ADMIN', 'EDITOR', 'VIEWER')
  async list() {
    const users = await this.prisma.adminUser.findMany({
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true },
      orderBy: { createdAt: 'desc' },
    });
    return { items: users };
  }

  @Patch(':id')
  @Roles('ADMIN')
  async update(@Param('id') id: string, @Body() body: UpdateAdminUserDto) {
    await this.adminUsers.assertPatchDoesNotLockOut(id, { role: body.role, isActive: body.isActive });

    return this.prisma.adminUser.update({
      where: { id },
      data: {
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      },
      select: { id: true, email: true, name: true, role: true, isActive: true, lastLoginAt: true, createdAt: true, updatedAt: true },
    });
  }

  /**
   * MVP: create is disabled by default (we don't want to accept raw passwordHash from UI).
   * Реальный create/reset password flow должен быть через magic link + email (см. docs).
   */
  // @Post()
  // @Roles('ADMIN')
  // async create(@Body() body: CreateAdminUserDto) { ... }
}

