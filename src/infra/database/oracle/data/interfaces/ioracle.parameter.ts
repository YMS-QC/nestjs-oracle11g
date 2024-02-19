/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
import OracleDB from 'oracledb';

// /**
//  * Interface aux for OracleParameter
//  */
// export interface OracleParamaterType {
//     key: {
//         type: typeof OracleDB.STRING;
//         dir: typeof OracleDB.BIND_IN;
//         val: string;
//     };
// }
/**
 * Oracle statement
 */
export type OracleStatement = {
    sql: string;
    bindParams: OracleDB.BindParameters;
    options: OracleDB.ExecuteOptions;
};

/**
 * Oracle execute many statement
 */
export type OracleExcuteManyStatement = {
    sql: string;
    bindParams: OracleDB.BindParameters[];
    options: OracleDB.ExecuteManyOptions;
};

/**
 * Oracle limit rows
 */
export interface OracleLimitRow {
    top: number;
}

/**
 * Oracle where
 */
export interface IOracleWhere {
    get _IOracleWhere(): boolean;
    value: (withWhere: boolean) => OracleStatement;
}
/**
 * Oracle order
 */
export interface IOracleOrderBy {
    direction?: 'ASC' | 'DESC';
    field: string;
}
/**
 * Oracle pagination
 */
export type OraclePaginationType = {
    /**
     * Page
     */
    page: number;

    /**
     * Page Size
     */
    size: number;

    /**
     * Limit rows
     */
    limit?: number;

    /**
     * Indicate pagination (default true)
     */
    paginate?: boolean;
};
