import { GHActor } from "./GHActor";
import { GHCommit } from "./GHCommit";
import { GHRepository } from "./GHRepository";
import { GHRunAttempt } from "./GHRunAttempt";
import { GHWorkflow } from "./GHWorkflow";

/**
 * GitHub Run Model
 * Represents a GitHub Actions run with various properties and relationships.
 * A run is defined as a single execution of a workflow in GitHub Actions.
 */
export class GHRun {
    id?: string;
    name?: string;
    displayTitle?: string;
    nodeId?: string;
    runNumber?: number;
    event?: string;
    status?: string;
    conclusion?: string;
    workflowId?: string;
    checkSuiteId?: string;
    url?: string;
    htmlUrl?: string;
    createdAt?: Date;
    updatedAt?: Date;
    runStartedAt?: Date;
    runAttempt?: number;
    actor?: GHActor;
    triggeringActor?: GHActor;
    headCommit?: GHCommit;
    repository?: GHRepository;
    workflow?: GHWorkflow;
    attempts?: GHRunAttempt[];

    constructor(init?: Partial<GHRun>) {
        Object.assign(this, init);
    }

    static fromJSON(dict: any): GHRun {
        return new GHRun({
            id: dict['id'] ?? dict.id,
            name: dict['name'] ?? dict.name,
            displayTitle: dict['display_title'],
            nodeId: dict['node_id'] ?? dict.nodeId,
            runNumber: dict['run_number'] ?? dict.runNumber,
            event: dict['event'] ?? dict.event,
            status: dict['status'] ?? dict.status,
            conclusion: dict['conclusion'] ?? dict.conclusion,
            workflowId: dict['workflow_id'] ?? dict.workflowId,
            checkSuiteId: dict['check_suite_id'] ?? dict.checkSuiteId,
            url: dict['url'] ?? dict.url,
            htmlUrl: dict['html_url'] ?? dict.htmlUrl,
            createdAt: dict['created_at'] ? new Date(dict['created_at']) : undefined,
            updatedAt: dict['updated_at'] ? new Date(dict['updated_at']) : undefined,
            runStartedAt: dict['run_started_at']
                ? new Date(dict['run_started_at'])
                : undefined,
            actor: dict['actor'] ? GHActor.fromJSON(dict['actor']) : undefined,
            triggeringActor: dict['triggering_actor'] ? GHActor.fromJSON(dict['triggering_actor']) : undefined,
            headCommit: dict['head_commit'] ? GHCommit.fromJSON(dict['head_commit']) : undefined,
            repository: dict['repository'] ? GHRepository.fromJSON(dict['repository']) : undefined,
            workflow: dict['workflow'] ? GHWorkflow.fromJSON(dict['workflow']) : undefined,
            attempts: Array.isArray(dict['run_attempts'])
                ? dict['run_attempts'].map((a: any) => GHRunAttempt.fromJSON(a))
                : undefined,
        });
    }

    static fromJSONList(dicts: any[]): GHRun[] {
        return dicts.map((dict) => GHRun.fromJSON(dict));
    }

    getMostRecentStartedAt(): Date {
        return this.runStartedAt || new Date(this.createdAt || Date.now());
    }

    get totalExecutionTime(): number {
        return this.attempts?.reduce((total, attempt) => total + attempt.getExecutionTime(), 0) || 0;
    }

    getTotalExecutionTime(): number {
        let totalTime = 0;
        this.attempts?.forEach(element => {
            totalTime += element.getExecutionTime();
        });
        return totalTime;
    }
}