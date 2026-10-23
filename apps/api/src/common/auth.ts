import {
  type CanActivate,
  createParamDecorator,
  type ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  SetMetadata,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import type { Role } from '@setu/domain';
import type { Request } from 'express';

export interface AuthUser {
  id: string;
  roles: Role[];
}

export interface AccessTokenPayload {
  sub: string;
  roles: Role[];
}

const IS_PUBLIC = 'isPublic';
const ROLES_KEY = 'roles';

/** Opt a route out of the global JWT guard. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

/** Require at least one of the given roles (in addition to being authenticated). */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);

/** The caller's User-Agent, kept out of the API spec (it is not a client-supplied parameter). */
export const UserAgent = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): string | undefined =>
    ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>().headers[
      'user-agent'
    ],
);

export const CurrentUser = createParamDecorator(
  (_: unknown, ctx: ExecutionContext): AuthUser =>
    ctx.switchToHttp().getRequest<Request & { user: AuthUser }>().user,
);

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    @Inject(JwtService) private readonly jwt: JwtService,
    @Inject(Reflector) private readonly reflector: Reflector,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const targets = [ctx.getHandler(), ctx.getClass()];
    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, targets)) return true;

    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) throw new UnauthorizedException('Missing bearer token');

    let payload: AccessTokenPayload;
    try {
      payload = await this.jwt.verifyAsync<AccessTokenPayload>(token);
    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
    req.user = { id: payload.sub, roles: payload.roles };

    const required = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (required?.length && !required.some((r) => payload.roles.includes(r))) {
      throw new ForbiddenException('Insufficient role');
    }
    return true;
  }
}
