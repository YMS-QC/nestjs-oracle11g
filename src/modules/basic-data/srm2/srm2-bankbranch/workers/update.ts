import { HttpService } from '@nestjs/axios';
import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import dayjs from 'dayjs';

import { sleep } from '@/common/helper';
import {
    getEsbRequestBody,
    makeEsbRequest,
} from '@/modules/basic-data/common/utils';
import { BASIC_WORKER_OPTIONS } from '@/modules/basic-data/constants/default-worker-setup';
import { SRM2_BANKBRANCH_TRANSPORT } from '@/modules/basic-data/srm2/srm2-bankbranch/constants';
import { Srm2BankBranchDbActions } from '@/modules/basic-data/srm2/srm2-bankbranch/db/db-actions';

@Processor(
    { name: SRM2_BANKBRANCH_TRANSPORT },
    {
        ...BASIC_WORKER_OPTIONS,
    },
)
export class UpdateBankBranchConsumer extends WorkerHost {
    constructor(
        private readonly dbAction: Srm2BankBranchDbActions,
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

        // 开始分页循环,每次传输1000条数据

        let hasNext = false;
        let cursor = null;
        const pageSize = 100;

        job.log(`${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 循环推送 开始`);

        do {
            // 查询数据

            job.log(
                `${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 查询数据 开始`,
            );

            job.log(
                `${dayjs(Date()).format(
                    'YYYY-MM-DD HH:mm:ss',
                )} 数据游标 ${cursor}`,
            );

            const queryResult = await this.dbAction.query(cursor, pageSize);

            if (!queryResult.success) {
                job.log('查询数据报错:');
                job.log(JSON.stringify(queryResult, null, '  '));
                return null;
            }

            if ((queryResult.data.list ?? []).length <= 1) {
                job.log('没有需要推送的数据，推送完成:');
                job.log(JSON.stringify(queryResult, null, '  '));
                return null;
            }

            job.log(
                `${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 查询数据 结束`,
            );

            // 构建报文
            job.log(
                `${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 构建报文 开始`,
            );

            const requestInfo: any = {};
            requestInfo.IF_CODE = 'BANK_BRANCH_IMP';
            requestInfo.RECORD = queryResult.data.list ?? {};
            const body = getEsbRequestBody(requestInfo);

            job.log(
                `${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 构建报文 结束`,
            );

            // 传输数据

            job.log(
                `${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 传输数据 开始`,
            );

            const transportResult = await makeEsbRequest(
                this.httpService,
                profile.url,
                JSON.parse(profile.auth),
                body,
            );

            if (!transportResult.success) {
                job.log(`报文打印`);
                job.log(JSON.stringify(body, null, '  '));
                job.log('传输数据报错:');
                job.log(JSON.stringify(transportResult, null, '  '));
                job.log(`响应打印`);

                job.log(
                    JSON.stringify(transportResult.responseBody, null, '  '),
                );
                return null;
            }

            job.log(
                `${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 传输数据 结束`,
            );

            hasNext = queryResult.data.hasNext;

            cursor = queryResult.data.nextCursor;

            sleep(30); // TODO 可配置
        } while (hasNext);

        job.log(`${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 循环推送 结束`);

        return null;
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job<any, any, string>) {
        job.log('运行完成！');
    }
}
