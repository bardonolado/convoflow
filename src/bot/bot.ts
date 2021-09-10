import vow from "../utils/vow";
import Flow, {FlowTypes} from "../flow/flow";
import {StepFunction} from "../flow/definition";
import Gateway from "../gateway/gateway";
import Session from "./session";
import Message from "../gateway/message";
import Course from "../flow/course";
import Worker from "./worker";
import Emitter, {EmitterEvents, ActionFunction} from "./emitter";

export {EmitterEvents as Events};
export {Message};
export {StepFunction};
export {Session, Course};

export interface BotSettings {
    name: string
};

export class Bot {
    private static readonly WORKER_DELAY = 250;

    private settings: BotSettings;
    private flow: Flow;
    private sessions: Map<string, Session>;
    private emitter: Emitter;
    private gateway: Gateway;
    private worker: Worker;
    private status: boolean;

    constructor(settings: BotSettings) {
        this.settings = settings;

        this.sessions = new Map<string, Session>();
        this.flow = new Flow();
        this.emitter = new Emitter();
        this.gateway = new Gateway();

        this.worker = new Worker(
            () => {return this.consume();}, {delay: Bot.WORKER_DELAY}
        );;

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

        if (!this.worker.start()) {
            return this.stop();
        }

        return true;
    }

    public async stop() {
        if (!this.status) return false;
        this.status = false;

        await vow.handle(this.worker.stop());

        return true;
    }

    public signature() {
        return this.signature;
    }

    public incoming(name: string, chain: StepFunction[]) {
        if (this.status) throw new Error(`Can't insert node after startup`);
        return this.flow.insertNode(name, chain, FlowTypes.INCOMING);
    }

    public trailing(name: string, chain: StepFunction[]) {
        if (this.status) throw new Error(`Can't insert node after startup`);
        return this.flow.insertNode(name, chain, FlowTypes.TRAILING);
    }

    public outgoing(name: string, chain: StepFunction[]) {
        if (this.status) throw new Error(`Can't insert node after startup`);
        return this.flow.insertNode(name, chain, FlowTypes.OUTGOING);
    }

    public event(event: EmitterEvents, action: ActionFunction) {
        if (this.status) throw new Error(`Can't insert event after startup`);
        return this.emitter.set(event, action);
    }

    public push(message: Message) {
        if (!this.status) throw new Error(`Can't insert event before startup`);
        return this.gateway.pushIncoming(message);
    }

    public pull(): (Message | Error) {
        if (!this.status) throw new Error(`Can't insert event before startup`);
        return this.gateway.pullOutgoing();
    }

    private async consume() {
        const message = this.gateway.pullIncoming();
        if (message instanceof Error) {
            throw new Error(`Consuming error: '${message.message}'`);
        }

        const result = await vow.handle(this.execute(message));
        if (result instanceof Error) {
            throw new Error(`Consuming error: '${result.message}'`);
        }
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
            if (message.vendor != null) session.setVendor(message.vendor);
            this.emitter.execute(EmitterEvents.ON_CREATE_SESSION, {session})

            const nodes = this.flow.getNodes();
            if (nodes instanceof Error) throw new Error("Can't get flow nodes");

            const node = nodes.values().next().value;
            if (!node) throw new Error("Can't get flow node");
            
            session.setProgress({
                current: {node: node.name, step: 0},
                detached: []
            });
        }

        session.setMessage(message);
        session.refresh();

        this.emitter.execute(EmitterEvents.ON_RECEIVE_MESSAGE, {session, message});
        this.emitter.execute(EmitterEvents.ON_REFRESH_SESSION, {session});

        session.setActive(true);
        this.emitter.execute(EmitterEvents.ON_LOCK_SESSION, {session});

        const course = new Course(this.flow, session);
        await course.run();

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