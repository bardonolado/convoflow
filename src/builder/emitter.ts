import Session from "../builder/session";
import Message from "../gateway/message";
import {ObjectLiteral} from "./definition";

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

export interface ActionParams<State extends ObjectLiteral> {
    session?: Session<State>
    message?: Message
}

export type ActionFunction<State extends ObjectLiteral> = (params: ActionParams<State>) => void;

export default class Emitter<State extends ObjectLiteral> {
	private events: Map<EmitterEvents, ActionFunction<State>[]>;

	constructor() {
		this.events = new Map<EmitterEvents, ActionFunction<State>[]>();
	}

	public set(event: EmitterEvents, action: ActionFunction<State>): (Error | null) {
		const item = this.events.get(event);

		if (!item) this.events.set(event, [action]);
		else item.push(action);

		return null;
	}

	public get(event: EmitterEvents): (ActionFunction<State>[] | Error) {
		const item = this.events.get(event);
		if (!item) return new Error("Can't get any event");
		return item;
	}

	public execute(event: EmitterEvents, params: ActionParams<State>): (Error | null) {
		const actions = this.get(event);
		if (actions instanceof Error) return actions;

		for (const k in actions) {
			actions[k](params);
		}
		return null;
	}}