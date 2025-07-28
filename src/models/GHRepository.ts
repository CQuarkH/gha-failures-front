import { GHActor } from "./GHActor";

export class GHRepository {
    id?: string;
    fullName?: string;
    description?: string;
    owner?: GHActor;
    fork?: boolean;
    url?: string;

    constructor(init?: Partial<GHRepository>) {
        Object.assign(this, init);
    }

    static fromJSON(dict: any): GHRepository {
        return new GHRepository({
            id: dict['id'] ?? dict.id,
            fullName: dict['full_name'] ?? dict.fullName,
            description: dict['description'] ?? dict.description,
            owner: dict['owner'] ? GHActor.fromJSON(dict['owner']) : undefined,
            fork: dict['fork'] ?? dict.fork,
            url: dict['url'] ?? dict.url,
        });
    }
}