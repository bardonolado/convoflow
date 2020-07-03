import Message, {MessageTypes, createEmptyMessage} from "../gateway/message";
import Gateway from "../gateway/gateway";
import {Mark} from "../flow/course";
import Emitter, {EmitterEvents} from "./emitter";

export interface Progress {
    node: string
    step: number
};

export default class Session {
    private static readonly EXPIRATION = 16 * 60 * 60;
    private static readonly MAX_HISTORY_MARKS = 3;

    public storage: Map<string, any>;

    public token: string;
    public signature: string;
    public gateway: Gateway;
    public emitter: Emitter;
    public message: Message | null;
    public contact: string;
    public active: boolean;
    public status: boolean;
    public node: string;
    public step: number;
    public marks: Map<string, Mark>;
    public history: {marks: Mark[]};
    public timestamp: number;

    constructor(token: string, signature: string, gateway: Gateway, emitter: Emitter) {
        if (!token.length) throw new Error("Invalid or missing token string");
        if (!signature.length) throw new Error("Invalid or missing signature string");
        
        this.storage = new Map<string, any>();

        this.token = token;
        this.signature = signature;

        this.gateway = gateway;
        this.emitter = emitter;

        this.message = null;
        this.contact = "";

        this.active = false;
        this.status = true;

        this.node = "";
        this.step = 0;

        this.marks = new Map<string, Mark>();

        this.history = {marks : []};
        this.timestamp = Math.floor(+new Date() / 1000);
    }

    public isActive() {
        return this.active;
    }

    public getStatus() {
        return this.status;
    }

    public getProgress() {
        return {node: this.node, step: this.step};
    }

    public getNode() {
        return this.node;
    }

    public getStep() {
        return this.step;
    }

    public getMessage() {
        return this.message || createEmptyMessage();
    }

    public getContact() {
        return this.contact;
    }

    public getMark(value: string) {
        return this.marks.get(value);
    }

    public getLastMark() {
        return this.history.marks[this.history.marks.length - 1];
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

    public setNode(value: string) {
        return this.node = value;
    }

    public setStep(value: number) {
        return this.step = value;
    }

    public setMessage(value: Message) {
        return this.message = value;
    }

    public setContact(value: string) {
        return this.contact = value;
    }

    public setMark(name: string, node: string, step: number): (Error | null) {
        if (!name.length) return new Error("Mark (name) must be a valid string");
        if (!node.length) return new Error("Node (name) must be a valid string");
        if (step < 0) return new Error("Step (node's step) must be a valid integer 0+");

        const mark = {name, node, step};

        if (this.history.marks.length > Session.MAX_HISTORY_MARKS) {
            this.history.marks.shift();
        }
        this.history.marks.push(mark);

        this.marks.set(name, mark);
        return null;
    }

    public setProgress(node: string, step: number = 0): (Error | null) {
        if (!node.length) return new Error("Node (name) must be a valid string");
        if (step < 0) return new Error("Step (node's step) must be a valid integer 0+");

        this.node = node;
        this.step = step;
        return null;
    }

    public refresh() {
        return this.timestamp = Math.floor(+new Date() / 1000);
    }

    public async send(data: string, type: MessageTypes = MessageTypes.TEXT) {
        if (!data.length) throw new Error("Data must be a valid string");
        if (!type.length) throw new Error("Type must be a valid string");

        const message = new Message(
            this.contact, this.token, this.signature, data, type
        );
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