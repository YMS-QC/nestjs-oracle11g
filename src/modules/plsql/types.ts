export type ApiData = {
    packageName: string;
    procedureName: string;
    data: any;
    messageId: number;
    apiInfo: any;
    callbackUrl?: string;
};

export type CallBackInfo = {
    URL: string;
};
