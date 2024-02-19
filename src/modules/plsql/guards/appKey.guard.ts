import {
    CanActivate,
    ExecutionContext,
    HttpException,
    Injectable,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import {
    EsbResponseType,
    get401EsbResponse,
} from '@/modules/plsql/common/esb/esbResponse';

/**
 * @description 校验请求的appKey
 *
 */
@Injectable()
export class AppKeyGuard implements CanActivate {
    constructor(private readonly configService: ConfigService) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();

        const { headers } = request;

        // headers 全部会转成小写

        const { appkey: appKey } = JSON.parse(JSON.stringify(headers));

        // console.log(headers);

        const esbResponse: EsbResponseType = get401EsbResponse();

        // 如果没有提供appKey
        if (!appKey) {
            esbResponse.esbInfo.returnMsg = 'appKey 缺失';
            throw new HttpException(esbResponse, 200);
        }

        // console.log(this.configService.get('ESB_APPKEY'));

        if (appKey !== this.configService.get('ESB_APPKEY')) {
            esbResponse.esbInfo.returnMsg = 'appKey 校验失败';
            throw new HttpException(esbResponse, 200);
        }

        return true;
    }
}
