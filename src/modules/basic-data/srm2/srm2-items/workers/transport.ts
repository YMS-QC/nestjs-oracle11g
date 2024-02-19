import { HttpService } from '@nestjs/axios';
import {
    Processor,
    WorkerHost,
    OnWorkerEvent,
    InjectQueue,
} from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import dayjs from 'dayjs';

import { BasicDataRequestActions } from '@/modules/basic-data/common/db/action';
import { makeEsbRequest } from '@/modules/basic-data/common/utils';
import {
    BASIC_WORKER_OPTIONS,
    DEFAULT_TRANSPORT_ROWS_LIMIT,
} from '@/modules/basic-data/constants';
import { PROCESS_STATUS } from '@/modules/basic-data/constants/process-status';
import { SRM2_ITEM_TRANSPORT } from '@/modules/basic-data/srm2/srm2-items/constants';
import { Srm2ItemDbDBActions } from '@/modules/basic-data/srm2/srm2-items/db/actions';

export type ItemTransportDataType = {
    type: 'batchTransport' | 'errorRetry';
    sleepSeconds?: number;
    transportRowLimit?: number;
    batchData?: any;
    retryData?: any[];
};

function wrapInHeadList(data: any) {
    return { headList: data };
}

@Processor(
    { name: SRM2_ITEM_TRANSPORT },
    {
        ...BASIC_WORKER_OPTIONS,
    },
)
export class TransportItemConsumer extends WorkerHost {
    constructor(
        @InjectQueue(SRM2_ITEM_TRANSPORT)
        private readonly transportQueue: Queue,
        private readonly itemActions: Srm2ItemDbDBActions,
        private readonly requestActions: BasicDataRequestActions,
        private readonly httpService: HttpService,
    ) {
        super();
    }

    async processBatchTransport(
        job: Job<ItemTransportDataType, any, string>,
    ): Promise<any> {
        job.log(`${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 传输数据 开始`);

        const transportRowLimit =
            job.data?.transportRowLimit ?? DEFAULT_TRANSPORT_ROWS_LIMIT;

        job.log(`本次最多传输 ${transportRowLimit} 行`);

        const queryPendingDataResult =
            await this.itemActions.queryPendingTransport(transportRowLimit);

        if (!queryPendingDataResult.success) {
            job.log(`查询数据失败！`);
            job.log(queryPendingDataResult.message);
            return null;
        }

        const pendingRows = queryPendingDataResult.data;
        if (pendingRows.length <= 0) {
            job.log(`没有需要推送的数据！退出任务`);
            // 退出任务
            return null;
        }

        job.log(JSON.stringify(pendingRows));

        job.log(`本次传输 ${pendingRows.length}行`);

        // job.log(JSON.stringify(pendingRows));

        // 获取批次号
        job.log(`获取推送的批次`);
        const transportBatch = await this.requestActions.sequence();

        if (!transportBatch) {
            job.log(`获取推送的批次失败！`);

            return null;
        }

        job.log(`批次号：${transportBatch}`);

        job.log(`查询推送使用的配置文件`);

        const transportProfile = await this.itemActions.getJobProfile();

        if (!transportProfile) {
            job.log(`查询配置文件失败,结束`);
            return null;
        }

        job.log(`将要推送的行状态改成 RUNNING`);

        await this.itemActions.asignItemHisRunning(
            pendingRows.map((row) => {
                return { queueId: row.queueId, transportBatch };
            }),
        );

        job.log(`开始推送:
            ${transportProfile.url}
            `);

        const transportResult = await makeEsbRequest(
            this.httpService,
            transportProfile.url,
            JSON.parse(transportProfile.auth),
            wrapInHeadList(pendingRows),
        );

        if (transportResult.status === PROCESS_STATUS.ERROR) {
            job.log(`调用接口报错！`);
            job.log(JSON.stringify(transportResult));

            await this.itemActions.asignItemHisError(
                pendingRows.map((row) => {
                    return {
                        queueId: row.queueId,
                        transportBatch,
                        processMessage: String(
                            transportResult.responseBody.esbInfo.returnMsg,
                        ).substring(0, 1000),
                    };
                }),
            );

            job.log(`逐条错误重试1次`);

            pendingRows.forEach(async (row) => {
                const jobData: ItemTransportDataType = {
                    type: 'errorRetry',
                    retryData: [].concat(row),
                };
                await this.transportQueue.add(`错误重试`, jobData);
            });
        } else {
            job.log(`调用接口成功！`);

            await this.itemActions.asignItemHisSuccess(
                pendingRows.map((row) => {
                    return {
                        queueId: row.queueId,
                        transportBatch,
                        processMessage: String(
                            transportResult.responseBody.esbInfo.returnMsg,
                        ),
                    };
                }),
            );
        }

        job.log(`${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 传输数据 结束`);

        const sleepSeconds = job.data?.sleepSeconds ?? 30;

        // job.log(`检查时间参数，运行结束后等待 (默认30s) ${sleepSeconds} s`);

        // await sleep(sleepSeconds * 1000);

        // 清除历史任务
        // job.log(`清除已完成的历史任务`);
        // await this.transportQueue.clean(1, 1000, `completed`);
        job.log(`压入下一个任务`);
        await this.transportQueue.add(job.name, { ...job.data, sleepSeconds });
        return null;
    }

    async retrySingleErrorItem(
        job: Job<ItemTransportDataType, any, string>,
    ): Promise<any> {
        job.log(
            `${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 重试错误数据 开始`,
        );

        const { retryData } = job.data;

        if (!retryData || retryData.length === 0) {
            job.log(
                `${dayjs(Date()).format(
                    'YYYY-MM-DD HH:mm:ss',
                )} 没有需要重试的错误数据！`,
            );

            return null;
        }

        job.log(`获取推送的批次`);
        const transportBatch = await this.requestActions.sequence();

        if (!transportBatch) {
            job.log(`获取推送的批次失败！`);

            return null;
        }

        job.log(`批次号：${transportBatch}`);

        job.log(`查询推送使用的配置文件`);

        const transportProfile: any = await this.itemActions.getJobProfile();

        if (!transportProfile) {
            job.log(`查询配置文件失败,结束。`);
            return null;
        }

        // 将要推送的数据标识为running
        job.log(`将要推送的行状态改成 RUNNING`);

        await this.itemActions.asignItemHisRunning(
            retryData.map((row) => {
                return { queueId: row.queueId, transportBatch };
            }),
        );

        job.log(`开始推送:
        ${transportProfile.esbUrl}
        `);

        const transportResult = await makeEsbRequest(
            this.httpService,
            transportProfile.esbUrl,
            JSON.parse(transportProfile.esbAuth),
            wrapInHeadList(retryData),
        );

        if (transportResult.status === PROCESS_STATUS.ERROR) {
            job.log(`调用接口报错！`);
            job.log(JSON.stringify(transportResult));

            await this.itemActions.asignItemHisError(
                retryData.map((row) => {
                    return {
                        queueId: row.queueId,
                        transportBatch,
                        processMessage: String(
                            transportResult.responseBody.esbInfo.returnMsg,
                        ).substring(0, 1000),
                    };
                }),
            );
        } else {
            job.log(`调用接口成功！`);

            const processMessage =
                transportResult.responseBody.esbInfo.returnMsg;

            console.log(processMessage);

            await this.itemActions.asignItemHisSuccess(
                retryData.map((row) => {
                    return {
                        queueId: row.queueId,
                        transportBatch,
                        processMessage,
                    };
                }),
            );
        }

        job.log(
            `${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 重试错误数据 结束`,
        );

        return null;
    }

    async process(job: Job<ItemTransportDataType, any, string>): Promise<any> {
        const jobType = job.data.type ?? 'batchTransport';

        if (jobType === 'batchTransport') {
            await this.processBatchTransport(job);
        }

        if (jobType === 'errorRetry') {
            await this.retrySingleErrorItem(job);
        }

        return null;
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job<any, any, string>) {
        // do some stuff

        job.log(`${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} completed!`);
    }
}
