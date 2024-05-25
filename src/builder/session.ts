import lodash from "lodash";

import Message, {createEmptyMessage} from "../gateway/message";
import {toWatchable} from "../utils/proxy";

import {ObjectLiteral} from "./definition";

export interface SessionProperties<State> {
	token: string
	origin: string,
	state: State
}

export interface Progress {
    node: string
    step: number
}

export interface ProgressData {
    current: Progress
    detached: Progress[]
}

export interface StorageData<State> {
	progress: ProgressData
	state: State
	timestamp: number
	expiration: number
}

export default class Session<State extends ObjectLiteral = ObjectLiteral> {
	private static readonly EXPIRATION = 16 * 60 * 60 * 1000; // milliseconds

	public state: State;
	public need_sync: boolean;
	
	public token: string;
	public origin: string;
	public message: Message | null;
	public contact: string;
	public vendor: string;
	public active: boolean;
	public status: boolean;
	public progress: ProgressData;
	public timestamp: number;
	public conversation_actions: (() => Promise<Message | null>)[];

	constructor({token, origin, state}: SessionProperties<State>) {
		if (!token.length) throw new Error("Invalid or missing token string");
		if (!origin.length) throw new Error("Invalid or missing origin string");

		this.state = toWatchable<State>(lodash.cloneDeep(state), {
			onUpdate: () => this.need_sync = true
		});
		this.need_sync = true;

		this.token = token;
		this.origin = origin;

		this.message = null;
		this.contact = "";
		this.vendor = "";

		this.active = false;
		this.status = true;

		this.progress = {current: {node: "", step: 0}, detached: []};

		this.timestamp = +new Date();

		this.conversation_actions = [];
	}

	public isActive() {
		return this.active;
	}

	public getStatus() {
		return this.status;
	}

	public getProgress() {
		return this.progress;
	}

	public getMessage() {
		return this.message || createEmptyMessage();
	}

	public getContact() {
		return this.contact;
	}

	public getVendor() {
		return this.vendor;
	}

	public getTimestamp() {
		return this.timestamp;
	}

	public getStorageData(): StorageData<State> {
		return {progress: this.progress, state: this.state, timestamp: this.timestamp, expiration: Session.EXPIRATION};
	}

	public isExpired() {
		return +new Date() > (this.timestamp + Session.EXPIRATION);
	}

	public setActive(value: boolean) {
		return this.active = value;
	}

	public setStatus(value: boolean) {
		return this.status = value;
	}

	public setMessage(value: Message) {
		return this.message = value;
	}

	public setContact(value: string) {
		return this.contact = value;
	}

	public setVendor(value: string) {
		return this.vendor = value;
	}

	public setProgress(progress: ProgressData): (Error | null) {
		if (progress == null) return new Error("Progress object is missing or invalid");

		if (progress.current == null) return new Error("Progress (current) is missing or invalid");
		if (!progress.current.node.length) return new Error("Progress (current) Node (name) must be a valid string");
		if (progress.current.step < 0) return new Error("Progress (current) Step (node's step) must be a valid integer 0+");

		if (progress.detached == null) return new Error("Progress (detached) is missing or invalid");
		for (const k in progress.detached) {
			const item = progress.detached[k];

			if (item == null) return new Error("Progress (detached item) is missing or invalid");
			if (!item.node.length) return new Error("Progress (detached item) Node (name) must be a valid string");
			if (item.step < 0) return new Error("Progress (detached item) Step (node's step) must be a valid integer 0+");
		}

		this.progress = progress;
		this.need_sync = true;
		return null;
	}

	public setTimestamp(value: number) {
		return this.timestamp = value;
	}

	public setState(value: State) {
		this.state = toWatchable<State>(lodash.cloneDeep(value), {
			onUpdate: () => this.need_sync = true
		});
	}

	public refresh() {
		return this.timestamp = +new Date();
	}

	public send(data: any) {
		if (data == null) throw new Error("Data can't be null");
		const message = new Message({contact: this.contact, session: this.token, origin: this.origin, data});
		if (this.vendor != "") message.vendor = this.vendor;

		this.conversation_actions.push(async () => message);

		return "Message sent with success";
	}

	public stall(milliseconds: number) {
		milliseconds = Math.max(0, milliseconds);

		this.conversation_actions.push(() => new Promise((resolve) => {
			setTimeout(() => resolve(null), milliseconds);
		}));
	}

	public end() {
		return this.status = false;
	}	
}