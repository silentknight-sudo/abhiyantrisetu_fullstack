import {
  adminJobResponse,
  adminOverviewResponse,
  adminPartnerResponse,
  payoutDueResponse,
  payoutRecordedResponse,
  authSessionResponse,
  categoryResponse,
  healthResponse,
  hireResponse,
  jobEventResponse,
  jobPaymentsResponse,
  jobViewResponse,
  leadInboxItemResponse,
  leadResponse,
  ledgerBalancesResponse,
  meResponse,
  notificationResponse,
  otpSentResponse,
  partnerResponse,
  paymentOrderResponse,
  paymentVerifiedResponse,
  quoteDetailResponse,
  quoteResponse,
  quoteRevisionResponse,
  quoteRowResponse,
  requirementResponse,
  startCodeResponse,
  tokenPairResponse,
  waitlistJoinedResponse,
  waitlistPageResponse,
  waitlistSummaryResponse,
} from '@setu/schemas';
import { createZodDto } from 'nestjs-zod';

/** Response DTOs: encode what controllers return into the wire shape and document it. */
export class OtpSentDto extends createZodDto(otpSentResponse, { codec: true }) {}
export class TokenPairDto extends createZodDto(tokenPairResponse, { codec: true }) {}
export class AuthSessionDto extends createZodDto(authSessionResponse, { codec: true }) {}
export class MeDto extends createZodDto(meResponse, { codec: true }) {}
export class HealthDto extends createZodDto(healthResponse, { codec: true }) {}
export class CategoryDto extends createZodDto(categoryResponse, { codec: true }) {}
export class RequirementDto extends createZodDto(requirementResponse, { codec: true }) {}
export class JobViewDto extends createZodDto(jobViewResponse, { codec: true }) {}
export class HireDto extends createZodDto(hireResponse, { codec: true }) {}
export class StartCodeDto extends createZodDto(startCodeResponse, { codec: true }) {}
export class JobEventDto extends createZodDto(jobEventResponse, { codec: true }) {}
export class PartnerDto extends createZodDto(partnerResponse, { codec: true }) {}
export class LeadDto extends createZodDto(leadResponse, { codec: true }) {}
export class LeadInboxItemDto extends createZodDto(leadInboxItemResponse, { codec: true }) {}
export class QuoteRowDto extends createZodDto(quoteRowResponse, { codec: true }) {}
export class QuoteDto extends createZodDto(quoteResponse, { codec: true }) {}
export class QuoteDetailDto extends createZodDto(quoteDetailResponse, { codec: true }) {}
export class QuoteRevisionDto extends createZodDto(quoteRevisionResponse, { codec: true }) {}
export class PaymentOrderDto extends createZodDto(paymentOrderResponse, { codec: true }) {}
export class PaymentVerifiedDto extends createZodDto(paymentVerifiedResponse, { codec: true }) {}
export class JobPaymentsDto extends createZodDto(jobPaymentsResponse, { codec: true }) {}
export class LedgerBalancesDto extends createZodDto(ledgerBalancesResponse, { codec: true }) {}
export class NotificationDto extends createZodDto(notificationResponse, { codec: true }) {}
export class WaitlistJoinedDto extends createZodDto(waitlistJoinedResponse, { codec: true }) {}
export class WaitlistPageDto extends createZodDto(waitlistPageResponse, { codec: true }) {}
export class WaitlistSummaryDto extends createZodDto(waitlistSummaryResponse, { codec: true }) {}
export class AdminPartnerDto extends createZodDto(adminPartnerResponse, { codec: true }) {}
export class AdminOverviewDto extends createZodDto(adminOverviewResponse, { codec: true }) {}
export class AdminJobDto extends createZodDto(adminJobResponse, { codec: true }) {}
export class PayoutDueDto extends createZodDto(payoutDueResponse, { codec: true }) {}
export class PayoutRecordedDto extends createZodDto(payoutRecordedResponse, { codec: true }) {}
