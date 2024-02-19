import { ColumnMapper, PlainClass } from './column-mapper';
import { FindOperatorType } from './find-operator-type';

declare type SqlGeneratorType = (aliasPath: string) => string;
/**
 * Find Operator used in Find Conditions.
 */
export declare class FindOperator<T extends PlainClass> {
    readonly '@instanceof': symbol;

    /**
     * Operator type.
     */
    private _type;

    /**
     * Parameter value.
     */
    private _value;

    /**
     * ObjectLiteral parameters.
     */
    private _objectLiteralParameters;

    /**
     * Indicates if parameter is used or not for this operator.
     */
    private _useParameter;

    /**
     * Indicates if multiple parameters must be used for this operator.
     */
    private _multipleParameters;

    /**
     * SQL generator
     */
    private _getSql;
    constructor(
        type: FindOperatorType,
        value: T | FindOperator<T>,
        useParameter?: boolean,
        multipleParameters?: boolean,
        getSql?: SqlGeneratorType,
        objectLiteralParameters?: ColumnMapper<T>,
    );
    /**
     * Indicates if parameter is used or not for this operator.
     * Extracts final value if value is another find operator.
     */
    get useParameter(): boolean;
    /**
     * Indicates if multiple parameters must be used for this operator.
     * Extracts final value if value is another find operator.
     */
    get multipleParameters(): boolean;
    /**
     * Gets the Type of this FindOperator
     */
    get type(): FindOperatorType;
    /**
     * Gets the final value needs to be used as parameter value.
     */
    get value(): T;
    /**
     * Gets ObjectLiteral parameters.
     */
    get objectLiteralParameters(): ColumnMapper<T> | undefined;
    /**
     * Gets the child FindOperator if it exists
     */
    get child(): FindOperator<T> | undefined;
    /**
     * Gets the SQL generator
     */
    get getSql(): SqlGeneratorType | undefined;
}
