import OracleDB = require('oracledb');

export type QUERY = {
    statement: string;
    binds?: OracleDB.BindParameters;
    opts?: OracleDB.ExecuteOptions;
    name?: string;
};

export type PROCEDURE = {
    statement: string;
    binds?: OracleDB.BindParameters;
    opts?: OracleDB.ExecuteOptions;
    name?: string;
};

export type UPDATEMANY = {
    statement: string;
    binds: OracleDB.BindParameters[];
    opts: OracleDB.ExecuteManyOptions;
    name?: string;
};

export type INSERT = {
    statement: string;
    binds: OracleDB.BindParameters[];
    opts: OracleDB.ExecuteManyOptions;
    name?: string;
};
