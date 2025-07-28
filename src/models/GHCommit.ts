export class GHCommit {
    id?: string;
    treeId?: string;
    message?: string;
    timestamp?: Date;
    authorName?: string;
    committerName?: string;

    constructor(init?: Partial<GHCommit>) {
        Object.assign(this, init);
    }

    /** Parsea un JSON en un GHCommit */
    static fromJSON(dict: any): GHCommit {
        return new GHCommit({
            id: dict['id'] ?? dict.id,
            treeId: dict['tree_id'] ?? dict.treeId,
            message: dict['message'] ?? dict.message,
            timestamp: dict['timestamp'] ? new Date(dict['timestamp']) : undefined,
            authorName: dict['author_name'] ?? dict.authorName,
            committerName: dict['committer_name'] ?? dict.committerName,
        });
    }
}