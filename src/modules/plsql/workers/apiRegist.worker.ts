import { InjectQueue, Processor, WorkerHost } from '@nestjs/bullmq';

import { Job, Queue } from 'bullmq';

import { IResponse } from '@/common/Iresponse/Iresponse';
import { API_REGIST_QUEUE } from '@/modules/plsql/constants';
import { PlsqlDbactions } from '@/modules/plsql/db/dbActions/plsql.dbactions';
import { ApiRegistDto } from '@/modules/plsql/dtos';
import { PlsqlService } from '@/modules/plsql/services';
import { ApiData } from '@/modules/plsql/types';

@Processor(
    { name: API_REGIST_QUEUE },
    {
        concurrency: 30,
        removeOnComplete: {
            age: 3600, // keep up to 1 hour
            count: 1000, // keep up to 1000 jobs
        },
        removeOnFail: {
            age: 24 * 3600, // keep up to 24 hours
        },
    },
)
export class ApiRegistWorker extends WorkerHost {
    constructor(
        @InjectQueue(API_REGIST_QUEUE)
        private readonly apiRegistQueue: Queue, // private readonly dbActions: PlsqlDbactions,
        private readonly registService: PlsqlService,
        private readonly dbAction: PlsqlDbactions,
    ) {
        super();
    }

    /** *
     * @description 默认使用 packageName + procedureName 作为jobName
     *
     */
    async process(
        job: Job<ApiRegistDto, any, string>,
        token?: string,
    ): Promise<IResponse> {
        const jobName = `${job.data.packageName}.${job.data.procedureName}`;

        const activeJobs = await this.apiRegistQueue.getActive();
        const delayedJobs = await this.apiRegistQueue.getDelayed();
        const waitingJobs = await this.apiRegistQueue.getWaiting();
        if (
            activeJobs.find(
                (activeJob: Job) =>
                    jobName === activeJob.name && job.id !== activeJob.id,
            ) ||
            delayedJobs.find(
                (delayJob: Job) =>
                    jobName === delayJob.name && job.id !== delayJob.id,
            ) ||
            waitingJobs.find(
                (waitingJob: Job) =>
                    jobName === waitingJob.name && job.id !== waitingJob.id,
            )
        ) {
            // return {
            //     success: false,
            //     errorCode: 'E0001',
            //     message: '当前接口的注册正在进行中，请稍后再试！',
            // };
            throw new Error('当前接口的注册正在进行中，请稍后再试！');
        }

        const { packageName, procedureName, bizName, remark, lastUpdatedBy } =
            job.data;

        const checkResult = await this.dbAction.checkPackageProcedure(
            packageName,
            procedureName,
        );

        job.log('开始前置校验');

        if (!checkResult.success) {
            throw new Error(checkResult.message);
        }
        job.log('前置校验结束');

        job.log('执行注册流程');
        const result = await this.registService.registPlsqlApi({
            packageName,
            procedureName,
            bizName,
            remark,
            lastUpdatedBy,
        });

        if (result.success) return result;

        throw new Error(result.message);
    }

    /**
     * @description plsqlApi的执行函数
     *
     */

    async plsqlApiProcesser(job: Job<ApiData, any, any>) {
        const result = await this.registService.invokePlsqlApiDirectly(
            job.data,
        );

        job.log(JSON.stringify(result, null, '  '));
    }
}
