import Session, {StorageData} from "./session";
import {ObjectLiteral} from "./definition";
import Gateway from "../gateway/gateway";
import Emitter from "./emitter";
import vow from "../utils/vow";

export interface Storage<State> {
    get: (token: string) => Promise<StorageData<State> | undefined>;
    set: (token: string, data?: StorageData<State>) => Promise<void>;
}

interface Settings<State> {
    builder_name: string,
    state: State,
    storage?: Storage<State>
}

class SessionManager<State extends ObjectLiteral = ObjectLiteral> {
    public storage?: Storage<State>;

    private builder_name: string;
    private state: State;
    private emitter: Emitter<State>;
	private gateway: Gateway;

    private sessions: Map<string, Session<State>>;

    constructor(settings: Settings<State>, emitter: Emitter<State>, gateway: Gateway) {
        this.storage = settings.storage;

        this.builder_name = settings.builder_name;
        this.state = settings.state;
        this.emitter = emitter;
        this.gateway = gateway;

        this.sessions = new Map<string, Session<State>>();
    }

    public async get(token: string) {
        let session = this.sessions.get(token);
        if (!this.storage) return session;

        const result = await vow.handle(this.storage.get(token));
        if (result instanceof Error) throw new Error(`Storage 'get' error: '${result.message}'`);
        if (!result) return;

        if (!session) {
            session = new Session<State>({token, origin: this.builder_name, state: result.state});
            this.sessions.set(token, session);
        } else {
            session.setState(result.state);
        }

        session.setProgress(result.progress);
        session.setTimestamp(result.timestamp);

        return session;
    }

    public async create(token: string) {
        const session = new Session<State>({token, origin: this.builder_name, state: this.state});
        this.sessions.set(token, session);

        if (this.storage) {
            const result = await vow.handle(this.storage.set(token, session.getStorageData()));
            if (result instanceof Error) throw new Error(`Storage 'sync' error: '${result.message}'`);

            session.need_sync = false;
        }
        return session;
    }

    public async sync(token: string) {
        if (!this.storage) return;

        const session = this.sessions.get(token);
        if (!session?.need_sync) return;

        const result = await vow.handle(this.storage.set(token, session.getStorageData()));
        if (result instanceof Error) throw new Error(`Storage 'sync' error: '${result.message}'`);

        session.need_sync = false;
    }

    public async delete(token: string) {
        if (this.storage) {
            const result = await vow.handle(this.storage.set(token));
            if (result instanceof Error) throw new Error(`Storage 'delete' error: '${result.message}'`);
        }
        this.sessions.delete(token);
    }
}

export default SessionManager;