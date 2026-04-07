import { Queue, Worker, QueueEvents } from 'bullmq';
import logger from './logger';

const connection = {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
};

export const createQueue = (name: string) => {
    return new Queue(name, { connection });
};

export const createWorker = <T = unknown>(
    name: string,
    processor: (job: { data: T }) => Promise<void>
) => {
    const worker = new Worker(name, async (job) => {
        logger.info({ jobId: job.id, queue: name }, 'Processing job');
        await processor(job);
    }, { connection });

    worker.on('completed', (job) => {
        logger.info({ jobId: job.id, queue: name }, 'Job completed');
    });

    worker.on('failed', (job, err) => {
        logger.error({ jobId: job?.id, queue: name, error: err.message }, 'Job failed');
    });

    return worker;
};

export const createQueueEvents = (name: string) => {
    return new QueueEvents(name, { connection });
};
