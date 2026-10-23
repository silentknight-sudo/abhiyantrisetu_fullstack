import { Module } from '@nestjs/common';
import { ENV, type Env } from '../../config/env';
import { PaymentsController } from './payments.controller';
import { PaymentsService } from './payments.service';
import { FakeGateway, PAYMENT_GATEWAY, RazorpayGateway } from './razorpay.provider';

@Module({
  controllers: [PaymentsController],
  providers: [
    PaymentsService,
    {
      provide: PAYMENT_GATEWAY,
      inject: [ENV],
      useFactory: (env: Env) =>
        env.PAYMENTS_PROVIDER === 'razorpay'
          ? new RazorpayGateway(env.RAZORPAY_KEY_ID!, env.RAZORPAY_KEY_SECRET!)
          : new FakeGateway(),
    },
  ],
  exports: [PaymentsService],
})
export class PaymentsModule {}
