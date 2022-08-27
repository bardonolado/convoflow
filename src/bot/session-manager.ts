import Session, {StorageData} from "./session";
import Gateway from "../gateway/gateway";
import Emitter from "./emitter";
import vow from "../utils/vow";

export interface Storage {
    get: (token: string) => Promise<StorageData<ObjectLiteral> | undefined>;
    set: (token: string, data?: StorageData<ObjectLiteral>) => Promise<void>;
}

interface Settings {
    bot_name: string,
    state: ObjectLiteral,
    storage?: Storage
}

class SessionManager {
    public storage?: Storage;

    private bot_name: string;
    private state: ObjectLiteral;
    private emitter: Emitter;
	private gateway: Gateway;

    private sessions: Map<string, Session<ObjectLiteral>>;

    constructor(settings: Settings, emitter: Emitter, gateway: Gateway) {
        this.storage = settings.storage;

        this.bot_name = settings.bot_name;
        this.state = settings.state;
        this.emitter = emitter;
        this.gateway = gateway;

        this.sessions = new Map<string, Session<ObjectLiteral>>();
    }

    public async get(token: string) {
        if (!this.storage) return this.sessions.get(token);

        const result = await vow.handle(this.storage.get(token));
        if (result instanceof Error) throw new Error(`Storage 'get' error: '${result.message}'`);

        if (!result) return;

        const session = new Session(token, this.bot_name, result.state, this.gateway, this.emitter);
        session.setProgress(result.progress);
        session.setTimestamp(result.timestamp);
        return session;
    }

    public async create(token: string) {
        const session = new Session(token, this.bot_name, this.state, this.gateway, this.emitter);

        if (!this.storage) this.sessions.set(token, session);
        return session;
    }

    public async sync(token: string, session: Session<ObjectLiteral>) {
        if (!this.storage) return;

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