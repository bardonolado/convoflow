import Session, {StorageData} from "./session";
import Gateway from "../gateway/gateway";
import Emitter from "./emitter";

export interface Storage {
    get: (token: string) => Promise<StorageData<any>>;
    set: (token: string, data: StorageData<any>) => Promise<void>;
    delete: (token: string) => Promise<void>;
}

interface Settings<State> {
    bot_name: string,
    state: State,
    storage?: Storage
}

class SessionManager<State> {
    public storage?: Storage;

    private bot_name: string;
    private state: State;
    private emitter: Emitter<State>;
	private gateway: Gateway;

    private sessions: Map<string, Session<State>>;

    constructor(settings: Settings<State>, emitter: Emitter<State>, gateway: Gateway) {
        this.storage = settings.storage;

        this.bot_name = settings.bot_name;
        this.state = settings.state;
        this.emitter = emitter;
        this.gateway = gateway;

        this.sessions = new Map<string, Session<State>>();
    }

    public async get(token: string) {
        if (this.storage) {
            const storage_data = await this.storage.get(token);
            if (storage_data) {
                const session = new Session<State>(token, this.bot_name, storage_data.state, this.gateway, this.emitter);
                session.setProgress(storage_data.progress);
                session.setTimestamp(storage_data.timestamp);
                return session;
            }
        }
        return this.sessions.get(token);
    }

    public async set(token: string, session?: Session<State>) {
        if (!session) session = new Session<State>(token, this.bot_name, this.state, this.gateway, this.emitter);
        this.sessions.set(token, session);
        return session;
    }

    public async sync(token: string) {
        if (!this.storage) return;

        const session = this.sessions.get(token);
        if (!session || !session.need_sync) return;

        await this.storage.set(token, session.getStorageData());
        session.need_sync = false;
    }

    public async delete(token: string) {
        if (this.storage) await this.storage.delete(token);
        this.sessions.delete(token);
    }
}

export default SessionManager;