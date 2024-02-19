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
import { SRM2_RCV_TRANSPORT } from '@/modules/basic-data/srm2/srm2-rcv/constants';
import { Srm2RcvDbDBActions } from '@/modules/basic-data/srm2/srm2-rcv/db/actions';

export type ItemTransportDataType = {
    type: 'batchTransport' | 'errorRetry';
    sleepSeconds?: number;
    transportRowLimit?: number;
    batchData?: any;
    retryData?: any[];
};

function wrapInHeadList(data: any[]) {
    return {
        headList: [
            {
                company: data[0].company,
                factory: data[0].factory,
                supplierCode: data[0].supplierCode,
                purchaseVoucherItemList: [
                    {
                        ...data[0],
                    },
                ],
            },
        ],
    };
}

@Processor(
    { name: SRM2_RCV_TRANSPORT },
    {
        ...BASIC_WORKER_OPTIONS,
    },
)
export class TransportRcvConsumer extends WorkerHost {
    constructor(
        @InjectQueue(SRM2_RCV_TRANSPORT)
        private readonly transportQueue: Queue,
        private readonly dbActions: Srm2RcvDbDBActions,
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
            await this.dbActions.queryPendingTransport(transportRowLimit);

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

        const transportProfile = await this.dbActions.getJobProfile();

        if (!transportProfile) {
            job.log(`查询配置文件失败,结束。`);
            return null;
        }

        job.log(`开始推送:
        ${transportProfile.url}
        `);

        job.log(`由于报文的特殊结构，分组推送`);

        const groupMapRows: Map<string, any> = new Map<string, any>();

        for (const row of pendingRows) {
            const combinedKey = String().concat(
                row.company,
                row.factory,
                row.supplierCode,
            );

            let dataObj;
            dataObj = groupMapRows.get(combinedKey);
            if (!dataObj)
                dataObj = {
                    company: row.company,
                    factory: row.factory,
                    supplierCode: row.supplierCode,
                    purchaseVoucherItemList: [],
                };

            dataObj.purchaseVoucherItemList = [].concat(
                dataObj.purchaseVoucherItemList,
                row,
            );

            groupMapRows.set(combinedKey, dataObj);
        }

        for (const entry of groupMapRows.entries()) {
            job.log(`推送分组 ${entry[0]}`);

            job.log(`将要推送的行状态改成 RUNNING`);

            const body = { headList: [].concat(entry[1]) };
            const itemList = entry[1].purchaseVoucherItemList;

            await this.dbActions.asignRunning(
                itemList.map((row: any) => {
                    return { transactionId: row.transactionId, transportBatch };
                }),
            );

            job.log(`展示报文`);
            job.log(JSON.stringify(body));

            const transportResult = await makeEsbRequest(
                this.httpService,
                transportProfile.url,
                JSON.parse(transportProfile.auth),
                body,
            );

            if (transportResult.status === PROCESS_STATUS.ERROR) {
                job.log(`调用接口报错！`);
                job.log(JSON.stringify(transportResult));

                await this.dbActions.asignError(
                    itemList.map((row: any) => {
                        return {
                            transactionId: row.transactionId,
                            transportBatch,
                            processMessage: String(
                                transportResult.responseBody.esbInfo.returnMsg,
                            ).substring(0, 1000),
                        };
                    }),
                );

                job.log(`逐条错误重试1次`);

                itemList.forEach(async (row: any) => {
                    const jobData: ItemTransportDataType = {
                        type: 'errorRetry',
                        retryData: [].concat(row),
                    };
                    await this.transportQueue.add(`错误重试`, jobData);
                });
            } else {
                job.log(`调用接口成功！`);

                await this.dbActions.asignSuccess(
                    itemList.map((row: any) => {
                        return {
                            transactionId: row.transactionId,
                            transportBatch,
                            processMessage: String(
                                transportResult.responseBody.esbInfo.returnMsg,
                            ),
                        };
                    }),
                );
            }
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

        const transportProfile = await this.dbActions.getJobProfile();

        if (!transportProfile) {
            job.log(`查询配置文件失败,结束`);
            return null;
        }

        // 将要推送的数据标识为running
        job.log(`将要推送的行状态改成 RUNNING`);

        await this.dbActions.asignRunning(
            retryData.map((row) => {
                return { transactionId: row.transactionId, transportBatch };
            }),
        );

        job.log(`开始推送:
        ${transportProfile.url}
        `);

        const transportResult = await makeEsbRequest(
            this.httpService,
            transportProfile.url,
            JSON.parse(transportProfile.auth),
            wrapInHeadList(retryData),
        );

        if (transportResult.status === PROCESS_STATUS.ERROR) {
            job.log(`调用接口报错！`);
            job.log(JSON.stringify(transportResult));

            await this.dbActions.asignError(
                retryData.map((row) => {
                    return {
                        transactionId: row.transactionId,
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

            await this.dbActions.asignSuccess(
                retryData.map((row) => {
                    return {
                        transactionId: row.transactionId,
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
