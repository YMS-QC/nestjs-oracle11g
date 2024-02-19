import {
    Catch,
    ArgumentsHost,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { BaseExceptionFilter } from '@nestjs/core';

import { IResponse } from '@/common/Iresponse/Iresponse';

@Catch()
export class GlobalExceptionsFilter extends BaseExceptionFilter {
    catch(exception: unknown, host: ArgumentsHost): void {
        const httpStatus =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;
        const httpAdapter = this.httpAdapterHost?.httpAdapter ?? null;

        if (httpStatus >= 400 && httpAdapter) {
            // In certain situations `httpAdapter` might not be available in the
            // constructor method, thus we should resolve it here.
            const ctx = host.switchToHttp();
            const path = httpAdapter.getRequestUrl(ctx.getRequest());

            // console.log(path);

            // 处理特殊路由的错误，按照原有格式返回
            if (String(path).startsWith('/plsql/restful/'))
                super.catch(exception, host);
            // 其他的按照 IResponse 返回

            const responseBody: IResponse = {
                success: false,
                errorCode: String(httpStatus),
                message:
                    (exception as HttpException).message ??
                    'INTERNAL_SERVER_ERROR',
            };

            httpAdapter.reply(ctx.getResponse(), responseBody, httpStatus);
        }

        super.catch(exception, host);
    }
}
