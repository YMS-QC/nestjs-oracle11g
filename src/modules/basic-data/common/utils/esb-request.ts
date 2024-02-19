import { randomUUID } from 'crypto';

import { HttpService } from '@nestjs/axios';

import dayjs from 'dayjs';
import { firstValueFrom, map } from 'rxjs';

import { PROCESS_STATUS } from '@/modules/basic-data/constants/process-status';

export type EsbRequestBody = {
    esbInfo: {
        instId: string;
        requestTime: string;
        attr1?: string;
        attr2?: string;
        attr3?: string;
    };
    queryInfo: { pageSize?: number; currentPage?: number };
    requestInfo: any;
};

export type EsbResponseBody = {
    esbInfo: {
        instId: string;
        requestTime: string;
        responseTime: string;
        returnCode: string;
        returnStatus: string;
        returnMsg: string;
        attr1?: string;
        attr2?: string;
        attr3?: string;
    };
    queryInfo?: { pageSize?: string; currentPage?: string };
    resultInfo?: any;
};

export function getEsbRequestBody(requestInfo: any): EsbRequestBody {
    return {
        esbInfo: {
            instId: randomUUID(),
            requestTime: dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
            attr1: null,
            attr2: null,
            attr3: null,
        },
        queryInfo: { pageSize: 0, currentPage: 0 },
        requestInfo,
    };
}

export async function makeEsbRequest(
    httpService: HttpService,
    URL: string,
    esbAuth: any,
    requestInfo: any,
): Promise<{
    success: boolean;
    status: string;
    responseBody: EsbResponseBody;
}> {
    const requestBody = getEsbRequestBody(requestInfo);

    // console.log(JSON.stringify(requestBody));

    const result = await firstValueFrom(
        httpService
            .post(URL, requestBody, { ...esbAuth })
            .pipe(map((response: any) => response)),
    )
        .catch((err) => {
            console.log(err);

            return {
                success: false,
                status: err.status || PROCESS_STATUS.ERROR,
                reponseBody: err,
            };
        })
        .then((response) => {
            const responseBody = response.data ?? null;
            // console.log(JSON.stringify(responseBody));
            return {
                success: !!String(
                    responseBody?.esbInfo?.returnCode ?? PROCESS_STATUS.ERROR,
                ).startsWith('A'),
                status:
                    // 判断是否是'A'开头的返回码，是，说明业务状态是成功， 否则是失败

                    String(
                        responseBody?.esbInfo?.returnCode ??
                            PROCESS_STATUS.ERROR,
                    ).startsWith('A')
                        ? PROCESS_STATUS.SUCCESS
                        : PROCESS_STATUS.ERROR,
                responseBody: {
                    esbInfo: {
                        instId: null,
                        requestTime:
                            responseBody?.esbInfo?.requestTime ??
                            requestBody.esbInfo.requestTime,
                        responseTime:
                            responseBody?.esbInfo?.responseTime ??
                            dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
                        returnCode:
                            responseBody?.esbInfo?.returnCode ??
                            PROCESS_STATUS.ERROR,
                        returnStatus:
                            responseBody?.esbInfo?.returnStatus ??
                            PROCESS_STATUS.ERROR,
                        returnMsg:
                            responseBody?.esbInfo?.returnMsg ??
                            JSON.stringify(responseBody),
                    },
                    requstInfo: {
                        ...(responseBody?.requestInfo ?? null),
                    },
                    queryInfo: {
                        ...(responseBody?.queryInfo ?? null),
                    },
                },
            };
        });

    return result;
}
