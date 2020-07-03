import vow from "../utils/vow";
import {error} from "../utils/return";
import Flow, {Types as FlowTypes} from "../flow/flow";
import {StepFunction} from "../flow/definition";
import Gateway from "../gateway/gateway";
import Session from "./session";
import Message, {Types as MessageTypes} from "../gateway/message";
import Course from "../flow/course";
import Worker from "./worker";
import Emitter, {Events as EmitterEvents, ActionFunction} from "./emitter";

export {EmitterEvents as Events};
export {Message};

export interface BotSettings {
    name: string
    workers?: number
};

export class Bot {
    private static readonly WORKER_DELAY = 250;
    private static readonly WORKER_COUNT = 5;

    private settings: BotSettings;
    private flow: Flow;
    private sessions: Map<string, Session>;
    private emitter: Emitter;
    private gateway: Gateway;
    private workers: Worker[];
    private status: boolean;

    constructor(settings: BotSettings) {
        this.settings = settings;

        this.sessions = new Map<string, Session>();
        this.flow = new Flow();
        this.emitter = new Emitter();
        this.gateway = new Gateway();

        this.workers = [];
        for (let i = 0; i < (this.settings.workers || Bot.WORKER_COUNT); i++) {
            this.workers[i] = new Worker(
                () => {return this.consume();}, {delay: Bot.WORKER_DELAY}
            );
        }

        this.status = false;
    }

    public async start() {
        if (this.status) return false;
        this.status = true;

        const nodes = this.flow.getNodes();
        if (nodes instanceof Error) {
            this.stop();
            throw new Error("Can't get any flow nodes");
        }

        for (let k in this.workers) {
            if (!this.workers[k].start()) {
                return this.stop();
            }
        }

        return true;
    }

    public async stop() {
        if (!this.status) return false;
        this.status = false;

        for (let k in this.workers) {
            await vow.handle(this.workers[k].stop());
        }
        
        return true;
    }

    public signature() {
        return this.signature;
    }

    public incoming(name: string, chain: StepFunction[]): error {
        if (this.status) throw new Error(`Can't insert node after startup`);
        return this.flow.insertNode(name, chain, FlowTypes.INCOMING);
    }

    public trailing(name: string, chain: StepFunction[]): error {
        if (this.status) throw new Error(`Can't insert node after startup`);
        return this.flow.insertNode(name, chain, FlowTypes.TRAILING);
    }

    public outgoing(name: string, chain: StepFunction[]): error {
        if (this.status) throw new Error(`Can't insert node after startup`);
        return this.flow.insertNode(name, chain, FlowTypes.OUTGOING);
    }

    public event(event: EmitterEvents, action: ActionFunction) {
        if (this.status) throw new Error(`Can't insert event after startup`);
        return this.emitter.set(event, action);
    }

    public push(message: Message): error {
        if (!this.status) throw new Error(`Can't insert event before startup`);
        return this.gateway.pushIncoming(message);
    }

    public pull(): (Message | Error) {
        if (!this.status) throw new Error(`Can't insert event before startup`);
        return this.gateway.pullOutgoing();
    }

    private async consume() {
        const message = this.gateway.pullIncoming();
        if (message instanceof Error) return false;

        const result = await vow.handle(this.execute(message));
        return true;
    }

    private async execute(message: Message): Promise<any> {
        const stamp = message.session;
        if (!stamp.length) throw new Error(`Invalid or missing Message session token`);

        let session = this.sessions.get(stamp);
        if (session && session.isActive()) {
            this.gateway.pushIncoming(message);
            throw new Error(`Session already active`);
        }

        if (session && session.isExpired()) {
            this.emitter.execute(EmitterEvents.ON_EXPIRE_SESSION, {session});
            this.emitter.execute(EmitterEvents.ON_DELETE_SESSION, {session});
            session = undefined;
            this.sessions.delete(stamp);
        }

        if (!session) {
            session = new Session(stamp, this.settings.name, this.gateway, this.emitter);
            this.sessions.set(stamp, session);

            session.setContact(message.contact);
            this.emitter.execute(EmitterEvents.ON_CREATE_SESSION, {session})

            const nodes = this.flow.getNodes();
            if (nodes instanceof Error) throw new Error("Can't get flow nodes");

            const node = nodes.values().next().value;
            if (!node) throw new Error("Can't get flow node");
            
            session.setProgress(node.name, 0);
        }

        session.setMessage(message);
        session.refresh();

        this.emitter.execute(EmitterEvents.ON_RECEIVE_MESSAGE, {session, message});
        this.emitter.execute(EmitterEvents.ON_REFRESH_SESSION, {session});

        session.setActive(true);
        this.emitter.execute(EmitterEvents.ON_LOCK_SESSION, {session});

        try {
            const course = new Course(this.flow, session);
            await course.run();
        } catch(e) {
                console.log(e)
            }

        session.setActive(false);
        this.emitter.execute(EmitterEvents.ON_UNLOCK_SESSION, {session});

        if (!session.getStatus()) {
            this.emitter.execute(EmitterEvents.ON_DELETE_SESSION, {session});
            session = undefined;
            this.sessions.delete(stamp);
        }

        return true;
    }
}