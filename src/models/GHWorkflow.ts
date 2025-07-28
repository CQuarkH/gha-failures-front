export class GHWorkflow {
    id?: string;
    nodeId?: string;
    name?: string;
    path?: string;
    state?: string;
    htmlUrl?: string;
    createdAt?: Date;
    updatedAt?: Date;
    runners?: string[];

    constructor(init?: Partial<GHWorkflow>) {
        Object.assign(this, init);
    }

    static fromJSON(dict: any): GHWorkflow {
        return new GHWorkflow({
            id: dict['id'] ?? dict.id,
            nodeId: dict['node_id'] ?? dict.nodeId,
            name: dict['name'] ?? dict.name,
            path: dict['path'] ?? dict.path,
            state: dict['state'] ?? dict.state,
            htmlUrl: dict['html_url'] ?? dict.htmlUrl,
            createdAt: dict['created_at'] ? new Date(dict['created_at']) : undefined,
            updatedAt: dict['updated_at'] ? new Date(dict['updated_at']) : undefined,
            runners: Array.isArray(dict['runners']) ? dict['runners'] : undefined,
        });
    }
}
