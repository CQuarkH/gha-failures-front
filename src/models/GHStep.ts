export class GHStep {
    name?: string;
    status?: string;
    number?: number;
    conclusion?: string;
    startedAt?: Date;
    completedAt?: Date;
    log?: string;
    workflowCode?: string;

    constructor(init?: Partial<GHStep>) {
        Object.assign(this, init);
    }

    /**
   * Parsea un JSON en un GHStep
   */
    static fromJSON(dict: any): GHStep {
        return new GHStep({
            name: dict['name'],
            number: dict['number'],
            status: dict['status'],
            conclusion: dict['conclusion'],
            startedAt: dict['started_at'] ? new Date(dict['started_at']) : undefined,
            completedAt: dict['completed_at'] ? new Date(dict['completed_at']) : undefined,
            log: dict['log_content'] ?? '',
            workflowCode: dict['workflow_code'] ?? ''
        });
    }

    /**
     * Parsea un array de JSONs en un array de GHStep
     */
    static fromJSONArray(dicts: any[]): GHStep[] {
        if (!Array.isArray(dicts)) return [];
        return dicts.map(d => GHStep.fromJSON(d));
    }

    /**
     * Calcula el tiempo de ejecución del step
     * @returns Tiempo en milisegundos
     */
    get executionTime(): number {
        if (this.startedAt && this.completedAt) {
            return this.completedAt.getTime() - this.startedAt.getTime();
        }
        return 0;
    }
}