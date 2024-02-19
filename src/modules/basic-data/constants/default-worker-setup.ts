export const DEFAULT_TRANSPORT_ROWS_LIMIT = 10;
export const BASIC_WORKER_OPTIONS = {
    concurrency: 1,
    removeOnComplete: {
        age: 30 * 24 * 3600, // keep up to 1 hour
        count: 1000, // keep up to 1000 jobs
    },
    removeOnFail: {
        age: 30 * 24 * 3600, // keep up to 24 hours
    },
};
