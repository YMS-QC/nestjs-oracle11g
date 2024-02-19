import {
    Body,
    Controller,
    HttpCode,
    Post,
    ValidationPipe,
} from '@nestjs/common';

import dayjs from 'dayjs';

import { IResponse } from '@/common/Iresponse/Iresponse';
import { UpdateProfileDto } from '@/modules/basic-data/dto';
import { Srm2RcvService } from '@/modules/basic-data/srm2/srm2-rcv/services';

@Controller('basic-data/srm2-rcv')
export class SrmRcvController {
    constructor(private readonly service: Srm2RcvService) {}

    @HttpCode(200)
    @Post('/start')
    async startItemUpdate(
        @Body(new ValidationPipe()) data: UpdateProfileDto,
    ): Promise<IResponse> {
        // const { sleepSeconds, dateFrom, dateTo, transportRowLimit } = data;
        const enableDateRange = data.enableDateRange ?? false;
        const lookbackDays = data.lookbackDays ?? 1;
        const sleepSeconds = data.sleepSeconds ?? 30;
        const transportRowLimit = data.transportRowLimit ?? 100;
        const maxRowNumber = data.maxRowNumber ?? 1000;

        const dateFrom = data.dateFrom
            ? dayjs(data.dateFrom).format('YYYY-MM-DD HH:mm:ss')
            : null;

        const dateTo = data.dateTo
            ? dayjs(data.dateTo).format('YYYY-MM-DD HH:mm:ss')
            : null;

        if (enableDateRange) {
            if (!dateFrom) {
                return {
                    success: false,
                    errorCode: 'INVALID_DATE_RANGE',
                    message: '没有填写正确的日期范围',
                };
            }
        }

        await this.service.startUpdate({
            enableDateRange,
            sleepSeconds,
            transportRowLimit,
            maxRowNumber,
            lookbackDays,
            dateFrom,
            dateTo,
        });

        return { success: true };
    }

    @HttpCode(200)
    @Post('/stop')
    async stopItemSync(): Promise<IResponse> {
        await this.service.pauseQueues();

        return { success: true };
    }

    @Post('/profile')
    async queryProfile() {
        return this.service.queryProfile();
    }

    @Post('/queueStatus')
    async queryQueueStatus() {
        return this.service.queryQueueStatus();
    }
}
