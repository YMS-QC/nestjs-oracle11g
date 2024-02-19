import { HttpService } from '@nestjs/axios';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import dayjs from 'dayjs';

import {
    getEsbRequestBody,
    makeEsbRequest,
} from '@/modules/basic-data/common/utils';
import { BASIC_WORKER_OPTIONS } from '@/modules/basic-data/constants/default-worker-setup';
import { SRM2_CASHPRJ_TRANSPORT } from '@/modules/basic-data/srm2/srm2-cashprj/constants';
import { Srm2CashPrjDbActions } from '@/modules/basic-data/srm2/srm2-cashprj/db/db-actions';

@Processor(
    { name: SRM2_CASHPRJ_TRANSPORT },
    {
        ...BASIC_WORKER_OPTIONS,
    },
)
export class UpdateCashPrjConsumer extends WorkerHost {
    constructor(
        private readonly dbAction: Srm2CashPrjDbActions,
        private readonly httpService: HttpService,
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        // 获取推送使用的配置文件
        job.log(
            `${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 获取配置文件 开始`,
        );

        const profileResult = await this.dbAction.getJobProfile();
        if (!profileResult.success) {
            job.log('获取配置文件 失败:');
            job.log(JSON.stringify(profileResult, null, '  '));
            return null;
        }
        const profile = profileResult.data;

        job.log(
            `${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 获取配置文件 结束`,
        );

        // 查询数据

        job.log(`${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 查询数据 开始`);

        const queryResult = await this.dbAction.query();

        if (!queryResult.success) {
            job.log('查询数据报错:');
            job.log(JSON.stringify(queryResult, null, '  '));
            return null;
        }

        job.log(`${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 查询数据 结束`);

        // 构建报文
        job.log(`${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 构建报文 开始`);

        const requestInfo: any = {};
        requestInfo.IF_CODE = 'CASHFLOW_IMP';
        requestInfo.RECORD = queryResult.data ?? {};
        const body = getEsbRequestBody(requestInfo);

        job.log(`${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 构建报文 结束`);

        job.log(`报文打印`);

        job.log(JSON.stringify(body, null, '  '));
        // 传输数据

        job.log(`${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 传输数据 开始`);

        const transportResult = await makeEsbRequest(
            this.httpService,
            profile.url,
            JSON.parse(profile.auth),
            body,
        );

        if (!transportResult.success) {
            job.log('传输数据报错:');
            job.log(JSON.stringify(transportResult, null, '  '));
            return null;
        }

        job.log(`${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 传输数据 结束`);

        job.log(`响应打印`);

        job.log(JSON.stringify(transportResult.responseBody, null, '  '));

        return null;
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job<any, any, string>) {
        job.log('运行完成！');
    }
}
