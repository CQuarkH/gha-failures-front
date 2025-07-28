import { GHStep } from "./GHStep";

export class GHJob {
    id?: string;
    nodeId?: string;
    name?: string;
    status?: string;
    conclusion?: string;
    createdAt?: Date;
    startedAt?: Date;
    completedAt?: Date;
    url?: string;
    htmlUrl?: string;
    runnerName?: string;
    runnerGroupName?: string;
    runAttempt?: number;
    labels?: string[];
    steps?: GHStep[];
    fullLog?: string;

    constructor(init?: Partial<GHJob>) {
        Object.assign(this, init);
    }

    /** Parsea un JSON en un GHJob */
    static fromJSON(dict: any): GHJob {
        return new GHJob({
            id: dict['id'] ?? dict.id,
            nodeId: dict['node_id'] ?? dict.nodeId,
            name: dict['name'] ?? dict.name,
            status: dict['status'] ?? dict.status,
            conclusion: dict['conclusion'] ?? dict.conclusion,
            createdAt: dict['created_at'] ? new Date(dict['created_at']) : undefined,
            startedAt: dict['started_at'] ? new Date(dict['started_at']) : undefined,
            completedAt: dict['completed_at'] ? new Date(dict['completed_at']) : undefined,
            url: dict['url'] ?? dict.url,
            htmlUrl: dict['html_url'] ?? dict.htmlUrl,
            runnerName: dict['runner_name'] ?? dict.runnerName,
            runnerGroupName: dict['runner_group_name'] ?? dict.runnerGroupName,
            runAttempt: dict['run_attempt'] ?? dict.runAttempt,
            labels: Array.isArray(dict['labels']) ? dict['labels'] : undefined,
            steps: Array.isArray(dict['steps'])
                ? dict['steps'].map((s: any) => GHStep.fromJSON(s))
                : undefined,
            fullLog: dict['log'] ?? ''
        });
    }

    /** Parsea un array de JSONs en un array de GHJob, filtrando por conclusion válida */
    static fromJSONArray(dicts: any[]): GHJob[] {
        if (!Array.isArray(dicts)) return [];
        return dicts
            .map(d => d['conclusion'] ?? null)
            .map((_, idx) => ({ dict: dicts[idx], conclusion: dicts[idx]['conclusion'] }))
            .filter(({ conclusion }) =>
                conclusion != null &&
                String(conclusion).trim() !== ''
            )
            .map(({ dict }) => GHJob.fromJSON(dict));
    }

    /**
     * Calcula el tiempo de ejecución del job
     * @returns Tiempo en milisegundos
     */
    getExecutionTime(): number {
        if (this.startedAt && this.completedAt) {
            return this.completedAt.getTime() - this.startedAt.getTime();
        }
        return 0;
    }

    get executionTime(): number {
        return this.getExecutionTime();
    }


}