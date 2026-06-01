import {
  type CallHandler,
  type ExecutionContext,
  Injectable,
  type NestInterceptor,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ListResult } from '../list-result';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(_context: ExecutionContext, next: CallHandler): Observable<unknown> {
    return next.handle().pipe(
      map((data: unknown) => {
        if (data instanceof ListResult) {
          return {
            success: true as const,
            data: data.items,
            meta: {
              total: data.total,
              page: data.page,
              pageSize: data.pageSize,
            },
          };
        }
        return { success: true as const, data };
      }),
    );
  }
}
