import {v4 as uuid} from "uuid";

import vow from "../utils/vow";
import logger, {LogLevel} from "../utils/logger";
import Flow, {FlowTypes} from "../flow/flow";
import {Chain, StepFunction} from "../flow/definition";
import Gateway from "../gateway/gateway";
import Session, {StorageData} from "./session";
import Message from "../gateway/message";
import Course from "../flow/course";
import Worker from "./worker";
import Emitter, {EmitterEvents, ActionFunction} from "./emitter";
import SessionManager, {Storage as SessionManagerStorage} from "./session-manager";
import {ObjectLiteral} from "./definition";

export {EmitterEvents as Events};
export {Message};
export {Chain, StepFunction};
export {Session, StorageData, Course};

interface Settings<State> {
	id?: string
    name?: string
	state: State
	log_level?: LogLevel
	dismiss_messages_when_busy?: boolean
	new_messages_ignore_window?: number // milliseconds
	session_storage?: SessionManagerStorage<State>
	onSendMessage?: (message: Message) => Promise<void> | void
}

export class Builder<State extends ObjectLiteral = ObjectLiteral> {
	private static readonly WORKER_REST_TIME = 250;

	private id: string;
	private name: string;
	private state: State;
	private log_level?: LogLevel;
	private dismiss_messages_when_busy?: boolean;
	private new_messages_ignore_window?: number;
	private onSendMessage?: (message: Message) => void;
	
	private flow: Flow<State>;
	private session_manager: SessionManager<State>;
	private emitter: Emitter<State>;
	private gateway: Gateway;
	private worker: Worker;
	private status: boolean;

	constructor(settings: Settings<State>) {
		this.id = settings?.id || uuid();
		this.name = settings?.name || `builder-#${this.id}`;
		this.state = settings.state || {};
		this.log_level = settings?.log_level;
		this.dismiss_messages_when_busy = settings?.dismiss_messages_when_busy;
		this.new_messages_ignore_window = settings?.new_messages_ignore_window;
		this.onSendMessage = settings?.onSendMessage;

		this.flow = new Flow<State>();
		this.emitter = new Emitter();
		this.gateway = new Gateway({onPushOutgoing: this.onSendMessage});
		this.session_manager = new SessionManager(
			{storage: settings?.session_storage, builder_name: this.name, state: this.state},
			this.emitter, this.gateway
		);

		this.worker = new Worker(() => this.consume(), {rest_time: Builder.WORKER_REST_TIME});

		this.status = false;

		if (this.log_level) logger.enable(this.log_level);
	}

	public start() {
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

		return this.worker.stop();
	}

	public signature() {
		return this.signature;
	}

	public incoming(name: string, chain: Chain<State>) {
		if (this.status) throw new Error("Can't insert node after startup");
		return this.flow.insertNode(name, chain, FlowTypes.INCOMING);
	}

	public trailing(name: string, chain: Chain<State>) {
		if (this.status) throw new Error("Can't insert node after startup");
		return this.flow.insertNode(name, chain, FlowTypes.TRAILING);
	}

	public outgoing(name: string, chain: Chain<State>) {
		if (this.status) throw new Error("Can't insert node after startup");
		return this.flow.insertNode(name, chain, FlowTypes.OUTGOING);
	}

	public event(event: EmitterEvents, action: ActionFunction<State>) {
		if (this.status) throw new Error("Can't insert event after startup");
		return this.emitter.set(event, action);
	}

	public push(message: Message) {
		if (!this.status) throw new Error("Can't insert event before startup");
		return this.gateway.pushIncoming(message);
	}

	public pull(): (Message | Error) {
		if (!this.status) throw new Error("Can't insert event before startup");
		if (this.onSendMessage) throw new Error("Can't pull message while using 'onSendMessage' option")
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
		if (!stamp.length) throw new Error("Invalid or missing Message session token");

		let session = await vow.handle(this.session_manager.get(stamp));
		if (session instanceof Error) throw new Error(`Can't get session: '${session.message}'`);

		if (session?.isActive()) {
			// dismiss message when bot is busy
			if (!this.dismiss_messages_when_busy) this.gateway.pushIncoming(message, {beggining: true});
			throw new Error("Session already active");
		}

		if (session?.isExpired()) {
			this.emitter.execute(EmitterEvents.ON_EXPIRE_SESSION, {session});
			this.emitter.execute(EmitterEvents.ON_DELETE_SESSION, {session});
			session = undefined;
			
			const deleted = await vow.handle(this.session_manager.delete(stamp));
			if (deleted instanceof Error) throw new Error(`Can't delete session: '${deleted.message}'`);
		}

		if (!session) {
			session = await vow.handle(this.session_manager.create(stamp));
			if (session instanceof Error) throw new Error(`Can't create session: '${session.message}'`);

			this.emitter.execute(EmitterEvents.ON_CREATE_SESSION, {session});

			const nodes = this.flow.getNodes();
			if (nodes instanceof Error) throw new Error("Can't get flow nodes");

			const node = nodes.values().next().value;
			if (!node) throw new Error("Can't get flow node");

			session.setProgress({current: {node: node.name, step: 0}, detached: []});
		} else {
			if (this.new_messages_ignore_window) {
				const session_timestamp = session.getTimestamp();
				if (session_timestamp > (+new Date() - this.new_messages_ignore_window)) {
					throw new Error("Ignoring message because is inside ignore window");
				}
			}
		}

		session.setContact(message.contact);
		if (message.vendor != null) session.setVendor(message.vendor);

		session.setMessage(message);
		session.refresh();

		this.emitter.execute(EmitterEvents.ON_RECEIVE_MESSAGE, {session, message});
		this.emitter.execute(EmitterEvents.ON_REFRESH_SESSION, {session});

		session.setActive(true);
		this.emitter.execute(EmitterEvents.ON_LOCK_SESSION, {session});

		const course = new Course<State>(this.flow, session);
		await course.run();

		// resolve conversation actions for session
		for (const action of session.conversation_actions) {
			const message = await action();
			if (!message) continue;

			// it's wrapped around self called function because of unhandled promises errors
			(async () => {
				try {
					await this.gateway.pushOutgoing(message);
				} catch (error) {
					logger.log("error", `Error on sending message: '${(error as Error)?.message}'`);
				}
			})();

			this.emitter.execute(EmitterEvents.ON_SEND_MESSAGE, {session, message});
		}

		session.conversation_actions = [];

		const sync = await vow.handle(this.session_manager.sync(stamp));
		if (sync instanceof Error) throw new Error(`Can't sync session: '${session.message}'`);

		session.setActive(false);
		this.emitter.execute(EmitterEvents.ON_UNLOCK_SESSION, {session});

		if (!session.getStatus()) {
			this.emitter.execute(EmitterEvents.ON_DELETE_SESSION, {session});
			session = undefined;
			
			const deleted = await vow.handle(this.session_manager.delete(stamp));
			if (deleted instanceof Error) throw new Error(`Can't delete session: '${deleted.message}'`);
		}

		return true;
	}
}