import Session from "../bot/session";
import Message from "../gateway/message";

export enum EmitterEvents {
    ON_CREATE_SESSION = "on-create-session",
    ON_DELETE_SESSION = "on-delete-session",
    ON_EXPIRE_SESSION = "on-expire-session",
    ON_LOCK_SESSION = "on-lock-session",
    ON_UNLOCK_SESSION = "on-unlock-session",
    ON_REFRESH_SESSION = "on-refresh-session",
    ON_RECEIVE_MESSAGE = "on-receive-message",
    ON_SEND_MESSAGE = "on-send-message"
}

export interface ActionParams {
    session?: Session<ObjectLiteral>
    message?: Message
}

export type ActionFunction = (params: ActionParams) => void;

export default class Emitter {
	private events: Map<EmitterEvents, ActionFunction[]>;

	constructor() {
		this.events = new Map<EmitterEvents, ActionFunction[]>();
	}

	public set(event: EmitterEvents, action: ActionFunction): (Error | null) {
		const item = this.events.get(event);

		if (!item) this.events.set(event, [action]);
		else item.push(action);

		return null;
	}

	public get(event: EmitterEvents): (ActionFunction[] | Error) {
		const item = this.events.get(event);
		if (!item) return new Error("Can't get any event");
		return item;
	}

	public execute(event: EmitterEvents, params: ActionParams): (Error | null) {
		const actions = this.get(event);
		if (actions instanceof Error) return actions;

		for (const k in actions) {
			actions[k](params);
		}
		return null;
	}}