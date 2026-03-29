import { Module } from '@nestjs/common';

import { AuditInterceptor } from '../admin/audit.interceptor';
import { AuditService } from '../admin/audit.service';
import { ChatController } from './chat.controller';
import { AdminChatController } from './admin-chat.controller';
import { ChatService } from './chat.service';

@Module({
  controllers: [ChatController, AdminChatController],
  providers: [ChatService, AuditService, AuditInterceptor],
  exports: [ChatService],
})
export class ChatModule {}

