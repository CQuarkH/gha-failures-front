export class GHActor {
    id?: string;
    login?: string;
    url?: string;
    type?: string;

    constructor(init?: Partial<GHActor>) {
        Object.assign(this, init);
    }

    /** Parsea un JSON en un GHActor */
    static fromJSON(dict: any): GHActor {
        return new GHActor({
            id: dict['id'] ?? dict.id,
            login: dict['login'] ?? dict.login,
            url: dict['url'] ?? dict.url,
            type: dict['type'] ?? dict.type,
        });
    }
}