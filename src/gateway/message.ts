import {v4 as uuid} from "uuid";

export interface MessageStructure {
    token: string
    session: string
    contact: string
    origin: string
    vendor?: string
    data: any
    creation: Date
    extra?: any
}

export default class Message implements MessageStructure {
	public token: string;
	public session: string;
	public contact: string;
	public origin: string;
	public vendor?: string;
	public data: any;
	public creation: Date;
	public extra?: any;

	constructor(contact: string, session: string, origin: string, data: any, creation?: Date) {
		this.token = uuid();
		this.contact = contact;
		this.session = session;
		this.origin = origin;
		this.data = data;
		this.creation = (creation || new Date());
	}

	public validate(): (Error | null) {
		if (!this.token.length) return new Error("Invalid or missing token field");
		if (!this.session.length) return new Error("Invalid or missing session field");
		if (!this.contact.length) return new Error("Invalid or missing contact field");
		if (!this.origin.length) return new Error("Invalid or missing origin field");
		if (this.data == null) return new Error("Invalid or missing data field");
		return null;
	}
}

export function createEmptyMessage() {
	return new Message("", "", "", "");
}