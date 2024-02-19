import {
    Processor,
    WorkerHost,
    OnWorkerEvent,
    InjectQueue,
} from '@nestjs/bullmq';
import { Job, Queue } from 'bullmq';
import dayjs from 'dayjs';

import { sleep } from '@/common/helper';
import {
    BASIC_WORKER_OPTIONS,
    DEFAULT_TRANSPORT_ROWS_LIMIT,
} from '@/modules/basic-data/constants/default-worker-setup';
import {
    SRM2_RCV_UPDATE,
    SRM2_RCV_TRANSPORT,
} from '@/modules/basic-data/srm2/srm2-rcv/constants/queues.constants';
import { Srm2RcvDbDBActions } from '@/modules/basic-data/srm2/srm2-rcv/db/actions';

@Processor(
    { name: SRM2_RCV_UPDATE },
    {
        ...BASIC_WORKER_OPTIONS,
    },
)
export class UpdateRcvConsumer extends WorkerHost {
    constructor(
        @InjectQueue(SRM2_RCV_TRANSPORT)
        private readonly transportQueue: Queue,
        @InjectQueue(SRM2_RCV_UPDATE)
        private readonly updateQueue: Queue,
        private readonly dbActions: Srm2RcvDbDBActions,
    ) {
        super();
    }

    async process(job: Job<any, any, string>): Promise<any> {
        // 从配置文件获取推送配置
        job.log(
            `${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 获取配置文件 开始`,
        );

        const profileData = await this.dbActions.getJobProfile();

        if (!profileData.id) {
            throw new Error('无法获取配置数据');
        }

        // console.log(profileData.profileJson);

        const settings = JSON.parse(profileData.profileJson ?? '{}');

        const lookbackDays = settings.lookbackDays ?? 30;
        const enableDateRange = settings.enableDateRange ?? false;
        const dateFrom = settings.dateFrom ?? null;
        const dateTo = settings.dateTo ?? null;
        const maxRowNumber = settings.maxRowNumber ?? 1000;
        const transportRowLimit =
            settings.transportRowLimit ?? DEFAULT_TRANSPORT_ROWS_LIMIT;
        const sleepSeconds = settings.sleepSeconds ?? 30;

        // job.log('打印现存配置');
        // job.log(profileData.profileJson);
        job.log('打印使用的配置');
        job.log(
            JSON.stringify({
                lookbackDays,
                enableDateRange,
                dateFrom,
                dateTo,
                maxRowNumber,
                transportRowLimit,
                sleepSeconds,
            }),
        );

        job.log(
            `${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 获取配置文件 结束`,
        );

        // 更新数据开始
        job.log(`${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 更新数据 开始`);

        const { success, data, errorCode, message } =
            await this.dbActions.markUpdate({
                lookbackDays: enableDateRange ? null : lookbackDays,
                dateFrom,
                dateTo,
                maxRowNumber,
            });

        if (!success) {
            job.log(`执行错误 ${errorCode} \n ${message}`);
        } else {
            job.log(`扫描完成`);
        }

        job.log(`${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} 更新数据 结束`);

        if (!success) return null;

        const rowsUpdated: number = data?.rowsUpdated ?? 0;

        job.log(`当次更新的数据 ${rowsUpdated}条`);

        job.log(`检查是否存在需要推送的数据`);

        const rowsPending =
            (await this.dbActions.queryPendingTransport(1)).data?.length ?? 0;

        if (rowsPending > 0) {
            // 提交推送任务
            job.log(`存在需要推送的数据`);

            const activeCount: number =
                await this.transportQueue.getActiveCount();
            const waitCount: number =
                await this.transportQueue.getWaitingCount();
            if (activeCount > 0 || waitCount > 0) {
                job.log(`正在运行的推送任务个数 ${activeCount}`);
                job.log(`正在等待的推送任务个数 ${waitCount}`);
                job.log('检查到已经存在推送任务，不添加传输任务');
            } else {
                // 启动推送任务

                const transportJob = await this.transportQueue.add(`推送SRM2`, {
                    transportRowLimit,
                });

                job.log(`提交推送任务成功！jobId:${transportJob.id}`);
            }
        } else {
            job.log(`没有需要推送的数据`);
        }

        job.log(`等待  ${sleepSeconds} s`);

        await sleep(sleepSeconds * 1000);

        job.log(`检查队列内是否有等待，延后的任务`);

        const delayedCount = await this.updateQueue.getDelayedCount();

        job.log(`延后的任务：${delayedCount}个`);

        const waitingCount = await this.updateQueue.getWaitingCount();

        job.log(`正在等待的任务：${waitingCount}`);

        if (delayedCount === 0 && waitingCount === 0) {
            job.log(`任务队列中没有等待或者延迟的任务，提交下一个任务`);

            const nextJob = await this.updateQueue.add(`更新`, {});

            job.log(nextJob.id);
        }

        return null;
    }

    @OnWorkerEvent('completed')
    onCompleted(job: Job<any, any, string>) {
        job.log(`${dayjs(Date()).format('YYYY-MM-DD HH:mm:ss')} completed!`);
    }
}
