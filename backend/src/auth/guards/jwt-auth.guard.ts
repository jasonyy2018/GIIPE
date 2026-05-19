import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(context: ExecutionContext): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    // Store isPublic on the request object to pass it to handleRequest
    // which avoids dangerous singleton instance state mutation
    const request = context.switchToHttp().getRequest();
    request.isPublicRoute = isPublic || false;

    // Trigger Passport strategy. It returns true/false or Promise/Observable.
    return super.canActivate(context);
  }

  handleRequest(err: any, user: any, info: any, context: ExecutionContext, status?: any) {
    const request = context.switchToHttp().getRequest();
    const isPublic = request.isPublicRoute;

    // If it's a public route and authentication fails (e.g. no token),
    // we simply return null instead of throwing an UnauthorizedException.
    if (isPublic) {
      return user || null;
    }

    // For non-public routes, strictly enforce authentication
    if (err || !user) {
      throw err || new UnauthorizedException();
    }

    return user;
  }
}