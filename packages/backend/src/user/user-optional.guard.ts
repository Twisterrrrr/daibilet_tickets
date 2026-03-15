import { ExecutionContext, Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

/**
 * Опциональная авторизация пользователя: не блокирует запрос при отсутствии или невалидном токене.
 * Если токен валиден — req.user заполняется; иначе req.user остаётся undefined.
 */
@Injectable()
export class OptionalUserJwtGuard extends AuthGuard('jwt-user') {
  override async canActivate(context: ExecutionContext): Promise<boolean> {
    try {
      const result = await super.canActivate(context);
      return result === true;
    } catch {
      return true;
    }
  }
}
