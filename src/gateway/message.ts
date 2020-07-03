import {v4 as uuid} from "uuid";
import {error} from "../utils/return";

enum MessageTypes {
    TEXT = "text",
    AUDIO = "audio",
    VOICE = "voice",
    VIDEO = "video",
    IMAGE = "image",
    ANIMATION = "animation",
    DOCUMENT = "document",
    STICKER = "sticker",
    CONTACT = "contact",
    LOCATION = "location"
};

export {MessageTypes as Types};

export default class Message {
    public static readonly Types = MessageTypes;

    public token: string;
    public session: string;
    public contact: string;
    public origin: string;
    public vendor?: string;
    public data: string;
    public type: MessageTypes;
    public creation: Date;
    public extra?: any

    constructor(contact: string, session: string, origin: string, data: string, type: MessageTypes, creation?: Date) {
        this.token = uuid();
        this.contact = contact;
        this.session = session;
        this.origin = origin;
        this.data = data;
        this.type = type;
        this.creation = creation || new Date();
    }

    public validate(): error {
        if (!this.token.length) return new Error("Invalid or missing token field");
        if (!this.session.length) return new Error("Invalid or missing session field");
        if (!this.contact.length) return new Error("Invalid or missing contact field");
        if (!this.origin.length) return new Error("Invalid or missing origin field");
        if (!this.data.length) return new Error("Invalid or missing data field");
        if (!this.type.length) return new Error("Invalid or missing type field");
        return null;
    }
}