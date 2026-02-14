import { Module, Global } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { join } from 'path';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [
    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const port = Number(config.get('SMTP_PORT', '587'));
        return {
        transport: {
          host: config.get('SMTP_HOST', ''),
          port,
          secure: port === 465,
          auth: {
            user: config.get('SMTP_USER', ''),
            pass: config.get('SMTP_PASS', ''),
          },
        },
        defaults: {
          from: `"Дайбилет" <${config.get('EMAIL_FROM', 'noreply@daibilet.ru')}>`,
        },
        template: {
          dir: join(__dirname, 'templates'),
          adapter: new HandlebarsAdapter(),
          options: { strict: true },
        },
      };
      },
    }),
  ],
  providers: [MailService],
  exports: [MailService],
})
export class MailModule {}
