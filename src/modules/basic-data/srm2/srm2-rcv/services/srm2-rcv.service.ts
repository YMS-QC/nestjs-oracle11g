import { InjectQueue } from '@nestjs/bullmq';
import {
    Injectable,
    OnApplicationBootstrap,
    OnModuleInit,
} from '@nestjs/common';
import { Queue } from 'bullmq';

import { UpdateProfileDto } from '@/modules/basic-data/dto/update-profile.dto';
import {
    SRM2_RCV_TRANSPORT,
    SRM2_RCV_UPDATE,
} from '@/modules/basic-data/srm2/srm2-rcv/constants';
import { Srm2RcvDbDBActions } from '@/modules/basic-data/srm2/srm2-rcv/db/actions';

@Injectable()
export class Srm2RcvService implements OnModuleInit, OnApplicationBootstrap {
    constructor(
        @InjectQueue(SRM2_RCV_TRANSPORT)
        private readonly transportQueue: Queue,
        @InjectQueue(SRM2_RCV_UPDATE)
        private readonly updateQueue: Queue,
        private readonly dbActions: Srm2RcvDbDBActions,
    ) {}

    /**
     * @description 在模块初始化的时候，暂停队列
     *
     */
    async onModuleInit() {
        await this.pauseQueues();
    }

    /**
     * @description 在应用启动的时候，恢复队列
     *
     */
    async onApplicationBootstrap() {
        await this.resumeQueues();
        await this.startUpdate({
            sleepSeconds: 30,
            lookbackDays: 7,
            maxRowNumber: 1000,
            transportRowLimit: 100,
        });
    }

    /**
     * @description 启动更新队列 启动一个更新任务
     *
     */
    async startUpdate(data: UpdateProfileDto) {
        const {
            sleepSeconds,
            lookbackDays,
            dateFrom,
            dateTo,
            maxRowNumber,
            transportRowLimit,
        } = data;

        // step1 更新配置文件
        await this.dbActions.updateJobProfile({
            sleepSeconds,
            lookbackDays,
            dateFrom,
            dateTo,
            maxRowNumber,
            transportRowLimit,
        });

        // step2 清理队列
        await this.cleanQueues();

        // step2 插入新的更新任务
        await this.updateQueue.add(
            `手工触发更新-${SRM2_RCV_UPDATE}`,

            { delay: sleepSeconds, attempts: 3 },
        );

        await this.resumeQueues();

        return { success: true };
    }

    /**
     * @description 暂停更新队列和传输队列,清理未完成的任务
     * */
    async cleanQueues() {
        // 处理队列
        await this.updateQueue.pause();
        await this.transportQueue.pause();
        // 清空整个更新队列中的未完成的任务
        await this.updateQueue.clean(0, 1000, `wait`);
        await this.updateQueue.clean(0, 1000, `paused`);
        await this.updateQueue.clean(0, 1000, `delayed`);
        await this.updateQueue.clean(0, 1000, `prioritized`);
        await this.updateQueue.clean(0, 1000, 'active');

        //
        // await this.updateQueue.obliterate();

        // 处理传输队列
        // 清空整个更新队列中的未完成的任务
        await this.transportQueue.clean(0, 1000, `wait`);
        await this.transportQueue.clean(0, 1000, `paused`);
        await this.transportQueue.clean(0, 1000, `delayed`);
        await this.transportQueue.clean(0, 1000, `prioritized`);
        await this.transportQueue.clean(0, 1000, 'active');
    }

    /**
     * @description 暂停更新队列和传输队列
     * */
    async pauseQueues() {
        await this.updateQueue.pause();
        await this.transportQueue.pause();
    }

    /**
     * @description 恢复更新队列和传输队列
     * */
    async resumeQueues() {
        await this.updateQueue.resume();
        await this.transportQueue.resume();
    }

    async queryQueueStatus() {
        try {
            const updateQueueStatus = await Promise.all([
                this.updateQueue.isPaused(),
                this.updateQueue.getActiveCount(),
                this.updateQueue.getWaitingCount(),
            ]);

            const transportQueueStatus = await Promise.all([
                this.transportQueue.isPaused(),
                this.transportQueue.getActiveCount(),
                this.transportQueue.getWaitingCount(),
            ]);

            const data: any = [];

            data.push({
                name: SRM2_RCV_UPDATE,
                isPaused: updateQueueStatus[0],
                activeCount: updateQueueStatus[1],
                waitingCount: updateQueueStatus[2],
            });

            data.push({
                name: SRM2_RCV_TRANSPORT,
                isPaused: transportQueueStatus[0],
                activeCount: transportQueueStatus[1],
                waitingCount: transportQueueStatus[2],
            });

            return { success: true, data };
        } catch (error: any) {
            return {
                success: false,
                errorCode: 'QUERY_ERROR',
                errorMessage: `查询队列状态发生错误：${error.message}`,
            };
        }
    }

    async queryProfile() {
        const result = await this.dbActions.getJobProfile();

        try {
            const profile = JSON.parse(result.profileJson ?? '{}');

            return {
                success: true,
                data: profile,
            };
        } catch {
            return { success: true, data: {} };
        }
    }
}
