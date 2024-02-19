import { PlainClass } from '@/infra/database/oracle/data/interfaces/column-mapper';

import { FindOperator } from './find-operator';

export declare class EqualOperator<
    T extends PlainClass,
> extends FindOperator<T> {
    readonly '@instanceof': symbol;
    constructor(value: T | FindOperator<T>);
}
