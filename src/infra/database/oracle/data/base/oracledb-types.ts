import OracleDB from 'oracledb';
/** *
 *dbTypes
 */
export const OracleDBTypes = {
    VARCHAR2: OracleDB.STRING,

    NUMBER: OracleDB.NUMBER,

    CLOB: OracleDB.STRING,

    DATE: OracleDB.DATE,

    TIMESTAMP: OracleDB.DB_TYPE_TIMESTAMP,
};
