import Message, {createEmptyMessage} from "../gateway/message";
import Gateway from "../gateway/gateway";
import Emitter, {EmitterEvents} from "./emitter";

export interface Progress {
    node: string
    step: number
}

export interface ProgressData {
    current: Progress
    detached: Progress[]
}

export default class Session<StorageType> {
	private static readonly EXPIRATION = 16 * 60 * 60;
	private static readonly MAX_HISTORY_MARKS = 3;

	public storage: StorageType;

	public token: string;
	public origin: string;
	public gateway: Gateway;
	public emitter: Emitter<StorageType>;
	public message: Message | null;
	public contact: string;
	public vendor: string;
	public active: boolean;
	public status: boolean;
	public progress: ProgressData;
	public timestamp: number;

	constructor(token: string, origin: string, initial_storage: StorageType, gateway: Gateway, emitter: Emitter<StorageType>) {
		if (!token.length) throw new Error("Invalid or missing token string");
		if (!origin.length) throw new Error("Invalid or missing origin string");

		this.storage = initial_storage;

		this.token = token;
		this.origin = origin;

		this.gateway = gateway;
		this.emitter = emitter;

		this.message = null;
		this.contact = "";
		this.vendor = "";

		this.active = false;
		this.status = true;

		this.progress = {current: {node: "", step: 0}, detached: []};

		this.timestamp = Math.floor(+new Date() / 1000);
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

	public isExpired() {
		return (Math.floor(+new Date() / 1000) > (this.timestamp + Session.EXPIRATION));
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
		return null;
	}

	public refresh() {
		return this.timestamp = Math.floor(+new Date() / 1000);
	}

	public async send(data: any) {
		if (data == null) throw new Error("Data can't be null");
		const message = new Message(
			this.contact, this.token, this.origin, data
		);
		if (this.vendor != "") message.vendor = this.vendor;

		if (this.gateway.pushOutgoing(message) instanceof Error) {
			throw new Error("Can't push message to dispacther");
		}

		this.emitter.execute(EmitterEvents.ON_SEND_MESSAGE, {session: this, message});
		return "Message sent with success";
	}

	public end() {
		return this.status = false;
	}
}