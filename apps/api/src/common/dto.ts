import { createZodDto } from 'nestjs-zod';
import {
  cancelRequirementSchema,
  otpSendSchema,
  otpVerifySchema,
  reasonSchema,
  refreshSchema,
  resolveDisputeSchema,
  scheduleJobSchema,
  startJobSchema,
} from '@setu/schemas';

/** Nest DTO classes generated from the shared Zod schemas (validation + OpenAPI). */
export class OtpSendDto extends createZodDto(otpSendSchema) {}
export class OtpVerifyDto extends createZodDto(otpVerifySchema) {}
export class RefreshDto extends createZodDto(refreshSchema) {}
export class CancelRequirementDto extends createZodDto(cancelRequirementSchema) {}
export class ScheduleJobDto extends createZodDto(scheduleJobSchema) {}
export class StartJobDto extends createZodDto(startJobSchema) {}
export class ReasonDto extends createZodDto(reasonSchema) {}
export class ResolveDisputeDto extends createZodDto(resolveDisputeSchema) {}
