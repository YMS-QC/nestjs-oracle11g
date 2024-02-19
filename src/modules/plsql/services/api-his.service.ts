import { Injectable } from '@nestjs/common';

import dayjs from 'dayjs';

import { ApiHisRepository } from '@/modules/plsql/db/entities';
import { ApiHisQueryDto } from '@/modules/plsql/dtos/apiHisQuery.dto';

@Injectable()
export class ApiHisService {
    constructor(private readonly apiHisRepository: ApiHisRepository) {}

    list(data: ApiHisQueryDto) {
        return this.apiHisRepository.findWithPagination(
            // 查询条件
            [
                {
                    where: {
                        requestTimestamp: data.dateFrom
                            ? dayjs(data.dateFrom).toDate()
                            : dayjs().add(-7, 'day').toDate(),
                    },
                    op: '>=',
                },
                {
                    where: {
                        requestTimestamp: data.dateTo
                            ? dayjs(data.dateTo).toDate()
                            : dayjs().toDate(),
                    },
                    op: '<=',
                },
                {
                    where: {
                        interfaceName: data.interfaceName ?? '%%',
                    },
                    op: '%LIKE%',
                },
                {
                    where: {
                        bizName: data.bizName ?? '%%',
                    },
                    op: '%LIKE%',
                },
                {
                    where: {
                        requestStatus: data.requestStatus ?? '%%',
                    },
                    op: '%LIKE%',
                },
                {
                    where: {
                        requestBody: data.requestBody ?? '%%',
                    },
                    op: '%LIKE%',
                },
                {
                    where: {
                        responseBody: data.responseBody ?? '%%',
                    },
                    op: '%LIKE%',
                },
            ],

            // 分页
            { page: data.page ?? 1, size: data.size ?? 10 },

            // 需要查询的列
            {
                fields: [
                    'messageId',
                    'interfaceName',
                    'bizName',
                    'requestTimestamp',
                    'requestResponded',
                    'requestStatus',
                ],
            },
        );
    }

    requestInfo(id: number) {
        return this.apiHisRepository.findById(id);
    }
}
