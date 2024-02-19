/* eslint-disable @typescript-eslint/no-redundant-type-constituents */

import { FindOptionsWhere } from './find-options-where';
import { IOracleOrderBy, OraclePaginationType } from './ioracle.parameter';

export interface IRepository<T, M> {
    findById(id: string | number): T | any;

    find(
        criteria: any,
        options?: {
            fields?: Array<string>;
            order?: IOracleOrderBy;
            paginate?: OraclePaginationType;
        },
    ): T[] | any;

    findOneBy(criteria: FindOptionsWhere<M>): T | any;

    save(data: any): any;

    update(id: number | string, data: any): any;

    deleteById(id: number | string): any;

    delete(criteria: any): any;
}
