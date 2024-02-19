import { Injectable } from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import OracleDB from 'oracledb';

import { executeProcedure } from '@/infra/database/oracle/utils/ora-util';

import { ProfileRepository } from '@/modules/basic-data/common/db/entities/profile/profile.repository';
import { PROCESS_STATUS } from '@/modules/basic-data/constants/process-status';
import {
    ItemHisEntity,
    ItemHisRepository,
} from '@/modules/basic-data/srm2/srm2-items/db/entities/item-his.repository';
import {
    ItemOrgHisEntity,
    ItemOrgHisRepository,
} from '@/modules/basic-data/srm2/srm2-items/db/entities/item-org-his.repository';
import { STMT_MARK_ITEM_UPDATES } from '@/modules/basic-data/srm2/srm2-items/db/stmts';

@Injectable()
export class Srm2ItemDbDBActions {
    constructor(
        private readonly config: ConfigService,
        private readonly profileRrepository: ProfileRepository,
        private readonly itemHisRepository: ItemHisRepository,
        private readonly itemOrgHisRepository: ItemOrgHisRepository,
    ) {}

    async markUpdate(params: {
        lookbackDays: number;
        dateFrom: string;
        dateTo: string;
        maxRowNumber: number;
    }) {
        const { lookbackDays, dateFrom, dateTo, maxRowNumber } = params;
        const procedureResult = await executeProcedure('ERP', {
            statement: STMT_MARK_ITEM_UPDATES,
            binds: {
                lookbackDays,
                dateFrom: { dir: OracleDB.BIND_INOUT, val: dateFrom },
                dateTo: { dir: OracleDB.BIND_INOUT, val: dateTo },
                maxRowNumber: {
                    dir: OracleDB.BIND_INOUT,
                    val: maxRowNumber,
                },
                batchNumber: { dir: OracleDB.BIND_OUT },
                rowsUpdated: { dir: OracleDB.BIND_OUT },
            },
        });

        return procedureResult;
    }

    async queryPendingTransport(transportRowLimit: number): Promise<{
        success: boolean;
        data: Array<
            ItemHisEntity & { purchaseMaterialItemList: ItemOrgHisEntity[] }
        >;
        errorCode?: string;
        message?: string;
    }> {
        const { data, success, errorCode, message } =
            await this.itemHisRepository.find(
                {
                    processStatus: PROCESS_STATUS.PENDING,
                },

                { limit: { top: transportRowLimit } },
            );

        if (!success) return { success, errorCode, message, data: null };

        const expandedRows = await Promise.all(
            data.map(async (row) => {
                const purchaseMaterialItemList = (
                    await this.itemOrgHisRepository.find({
                        queueId: row.queueId,
                    })
                ).data;

                const newRow = {
                    ...row,
                    purchaseMaterialItemList,
                };

                return newRow;
            }),
        );

        // console.log(expandedRows);
        return {
            success: true,
            message,
            data: expandedRows,
        };
    }

    async getJobProfile() {
        const env = String(this.config.get('PROFILE_ENV')).toUpperCase();

        const result = await this.profileRrepository.findOneBy({
            env,
            interfaceName: 'srm2-items',
        });

        return result.data;
    }

    async updateJobProfile(profile: any) {
        const env = String(this.config.get('PROFILE_ENV')).toUpperCase();
        const interfaceName = 'srm2-items';
        const profileJson = JSON.stringify(profile);

        return this.profileRrepository.updateCriteria(
            { env, interfaceName },
            { profileJson },
        );
    }

    async asignItemHisRunning(
        params: { queueId: number; transportBatch: number }[],
    ) {
        const realBinds = params.map((r) => {
            return {
                ...r,
                processStatus: PROCESS_STATUS.RUNNING,
                processMessage: null,
            };
        });

        const result = await this.itemHisRepository.updateMany(realBinds, [
            'queueId',
        ]);

        return result;
    }

    async asignItemHisError(
        params: {
            queueId: number;
            transportBatch: number;
            processMessage: string;
        }[],
    ) {
        const realBinds = params.map((r) => {
            return {
                ...r,
                processStatus: PROCESS_STATUS.ERROR,
            };
        });

        const result = await this.itemHisRepository.updateMany(realBinds, [
            'queueId',
        ]);
        return result;
    }

    async asignItemHisSuccess(
        params: {
            queueId: number;
            transportBatch: number;
            processMessage: string;
        }[],
    ) {
        const realBinds = params.map((r) => {
            // console.log(r.processMessage);
            return {
                queueId: r.queueId,
                transportBatch: r.transportBatch,
                processStatus: PROCESS_STATUS.SUCCESS,
                processMessage: r.processMessage,
            };
        });

        const result = await this.itemHisRepository.updateMany(realBinds, [
            'queueId',
        ]);

        return result;
    }

    async asignItemHisPending(
        params: {
            queueId: number;
            transportBatch: number;
            processMessage: string;
        }[],
    ) {
        const realBinds = params.map((r) => {
            return {
                ...r,
                processStatus: PROCESS_STATUS.PENDING,
            };
        });

        const result = await this.itemHisRepository.updateMany(realBinds, [
            'queueId',
        ]);

        return result;
    }
}
