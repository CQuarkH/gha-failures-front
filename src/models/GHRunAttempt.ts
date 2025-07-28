import { GHJob } from "./GHJob";

export class GHRunAttempt {
    runAttempt?: number;
    status?: string;
    conclusion?: string;
    updatedAt?: Date;
    runStartedAt?: Date;
    jobs?: GHJob[];

    constructor(init?: Partial<GHRunAttempt>) {
        Object.assign(this, init);
    }

    /** Parsea un JSON en un GHRunAttempt */
    static fromJSON(dict: any): GHRunAttempt {
        return new GHRunAttempt({
            runAttempt: dict['run_attempt'] ?? dict.runAttempt,
            status: dict['status'],
            conclusion: dict['conclusion'],
            updatedAt: dict['updated_at'] ? new Date(dict['updated_at']) : undefined,
            runStartedAt: dict['run_started_at'] ? new Date(dict['run_started_at']) : undefined,
            jobs: Array.isArray(dict['jobs'])
                ? dict['jobs'].map((j: any) => GHJob.fromJSON(j))
                : undefined
        });
    }

    /** Parsea un array de JSONs en un array de GHRunAttempt */
    static fromJSONArray(arr: any[]): GHRunAttempt[] {
        return Array.isArray(arr)
            ? arr.map(item => GHRunAttempt.fromJSON(item))
            : [];
    }

    get executionTime(): number {
        if (this.runStartedAt && this.updatedAt) {
            return this.updatedAt.getTime() - this.runStartedAt.getTime();
        }
        return 0;
    }

    getExecutionTime(): number {
        if (this.runStartedAt && this.updatedAt) {
            return this.updatedAt.getTime() - this.runStartedAt.getTime();
        }
        return 0;
    }
}