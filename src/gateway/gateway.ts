import Queue from "../utils/queue";
import Message from "./message";

interface Settings {
	onPushOutgoing?: (message: Message) => Promise<void> | void;
}

export default class Gateway {
	private settings?: Settings;

	private incoming_queue: Queue<Message>;
	private outgoing_queue: Queue<Message>;

	constructor(settings?: Settings) {
		this.settings = settings;

		this.incoming_queue = new Queue<Message>();
		this.outgoing_queue = new Queue<Message>();
	}

	public pushIncoming(message: Message, options?: {beggining?: boolean}) {
		if (options?.beggining) return this.incoming_queue.unshift(message);
		return this.incoming_queue.push(message);
	}

	public pullIncoming() {
		return this.incoming_queue.pull();
	}

	public async pushOutgoing(message: Message) {
		// in case client was created using callback option instead of manually pulling messages
		if (this.settings?.onPushOutgoing) {
			return this.settings.onPushOutgoing(message);
		}
		return this.outgoing_queue.push(message);
	}

	public pullOutgoing() {
		return this.outgoing_queue.pull();
	}
}