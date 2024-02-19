export type PlainClass = Record<string, any>;

/**
 * Column
 *
 * */

export type TableColumn = {
    /**
     * 是否可以更新
     */
    updatable?: boolean;

    /**
     * 是否可以插入
     */
    insertable?: boolean;

    /**
     * The column name follows Oracle’s standard name-casing rules. It will commonly be uppercase,
     * since most applications create tables using unquoted, case-insensitive names.
     */
    name: string;

    /**
     * The class associated with the database type. This is only set if the database type is an object type.
     */
    // dbTypeClass?: DBObjectClass<T> | undefined;
    /**
     * Name of the database type, such as “NUMBER” or “VARCHAR2”. For object types, this will be the object name.
     */
    dbTypeName: string;
    /**
     * Database byte size. This is only set for DB_TYPE_VARCHAR, DB_TYPE_CHAR and DB_TYPE_RAW column types.
     */
    byteSize?: number | undefined;
    /**
     * Set only for DB_TYPE_NUMBER, DB_TYPE_TIMESTAMP, DB_TYPE_TIMESTAMP_TZ and DB_TYPE_TIMESTAMP_LTZ columns.
     */
    precision?: number | undefined;
    /**
     * Set only for DB_TYPE_NUMBER columns.
     */
    scale?: number | undefined;
    /**
     * Indicates whether NULL values are permitted for this column.
     */
    nullable?: boolean | undefined;

    toEntity?: (data: any) => any;

    toColumn?: (data: any) => any;
};

/**
 * Interface of the simple literal object with any string keys.
 */
export type ColumnMapper<T extends PlainClass> = Record<keyof T, TableColumn>;
export type ExcludeObjectLiteral<
    T extends PlainClass,
    U extends PlainClass,
> = Record<keyof Omit<U, keyof T>, TableColumn>;
