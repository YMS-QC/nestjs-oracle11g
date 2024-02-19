export abstract class TableEntity {
    rowId!: string;

    id!: string | number;

    [x: string]: any;
}
