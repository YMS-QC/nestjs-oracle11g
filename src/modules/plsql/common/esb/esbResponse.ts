import { randomUUID } from 'crypto';

import dayjs from 'dayjs';

export type EsbResponseType = {
    esbInfo: {
        instId: string | null;
        requestTime: string | null;
        responseTime: string | null;
        returnCode: string | null;
        returnStatus: string | null;
        returnMsg: string | null;
        attr1?: string | null;
        attr2?: string | null;
        attr3?: string | null;
    };

    queryInfo: { pageSize?: string | null; currentPage?: string | null };

    resultInfo: any;

    //
    dbmsOutput?: any;
};

export function getEsbResponse(): EsbResponseType {
    return {
        esbInfo: {
            instId: null,
            requestTime: null,
            responseTime: null,
            returnCode: null,
            returnStatus: null,
            returnMsg: null,
            attr1: null,
            attr2: null,
            attr3: null,
        },
        queryInfo: { pageSize: null, currentPage: null },
        resultInfo: null,
    };
}

export function get401EsbResponse(): EsbResponseType {
    return {
        esbInfo: {
            instId: randomUUID(),
            requestTime: dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
            responseTime: dayjs().format('YYYY-MM-DD HH:mm:ss.SSS'),
            returnCode: 'E9999',
            returnStatus: 'E',
            returnMsg: ' 401 权限校验失败',
            attr1: null,
            attr2: null,
            attr3: null,
        },
        queryInfo: { pageSize: null, currentPage: null },
        resultInfo: null,
    };
}
