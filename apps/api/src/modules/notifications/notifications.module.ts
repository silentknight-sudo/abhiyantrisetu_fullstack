import { Module } from '@nestjs/common';
import { ENV, type Env } from '../../config/env';
import { QuotesModule } from '../quotes/quotes.module';
import { NotificationListeners } from './notification.listeners';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { ConsolePushProvider, ExpoPushProvider, PUSH_PROVIDER } from './providers/push.provider';
import {
  ConsoleWhatsAppProvider,
  MetaWhatsAppProvider,
  WHATSAPP_PROVIDER,
} from './providers/whatsapp.provider';
import { WhatsAppInboundService } from './whatsapp-inbound.service';

@Module({
  imports: [QuotesModule],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationListeners,
    WhatsAppInboundService,
    {
      provide: WHATSAPP_PROVIDER,
      inject: [ENV],
      useFactory: (env: Env) =>
        env.WHATSAPP_PROVIDER === 'meta'
          ? new MetaWhatsAppProvider(env.WHATSAPP_TOKEN!, env.WHATSAPP_PHONE_NUMBER_ID!)
          : new ConsoleWhatsAppProvider(),
    },
    {
      provide: PUSH_PROVIDER,
      inject: [ENV],
      useFactory: (env: Env) =>
        env.PUSH_PROVIDER === 'expo'
          ? new ExpoPushProvider(env.EXPO_ACCESS_TOKEN)
          : new ConsolePushProvider(),
    },
  ],
  exports: [NotificationsService],
})
export class NotificationsModule {}
