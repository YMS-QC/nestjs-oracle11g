import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';

import { Queue } from 'bullmq';

import dayjs from 'dayjs';

import { SRM2_ACCTORG_TRANSPORT } from '@/modules/basic-data/srm2/srm2-acctorg/constants';

@Injectable()
export class Srm2AcctOrgService {
    constructor(
        @InjectQueue(SRM2_ACCTORG_TRANSPORT)
        private readonly queue: Queue,
    ) {}

    async startJob() {
        // 先开启队列

        if (await this.queue.isPaused()) await this.queue.resume();

        // 检查是否有任务正在运行，正在等待，被延后

        if ((await this.queue.getActiveCount()) > 0) {
            return {
                success: false,
                errorCode: 'EXIST ACTIVE',
                errorMessage: '当前有任务正在运行',
            };
        }

        if ((await this.queue.getWaitingCount()) > 0) {
            return {
                success: false,
                errorCode: 'EXIST WAITTING',
                errorMessage: '当前有任务正在等待',
            };
        }

        if ((await this.queue.getDelayedCount()) > 0) {
            return {
                success: false,
                errorCode: 'EXIST DELAYED',
                errorMessage: '当前有任务被延后',
            };
        }

        // 插入job

        const startupTime = dayjs().format('YYYY-MM-DD HH:mm:ss.SSS');

        const { id } = await this.queue.add(`推送核算组织 ${startupTime}`, {});

        // 返回jobId

        return { success: true, data: { id } };
    }

    async stopJob() {
        await this.queue.drain();
        if (!(await this.queue.isPaused())) {
            await this.queue.pause();
        }
    }
}
