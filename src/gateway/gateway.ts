import Queue from "../utils/queue";
import Message from "./message";

export default class Gateway {
	private incoming_queue: Queue<Message>;
	private outgoing_queue: Queue<Message>;

	constructor() {
		this.incoming_queue = new Queue<Message>();
		this.outgoing_queue = new Queue<Message>();
	}

	public pushIncoming(message: Message) {
		return this.incoming_queue.push(message);
	}

	public pullIncoming() {
		return this.incoming_queue.pull();
	}

	public pushOutgoing(message: Message) {
		return this.outgoing_queue.push(message);
	}

	public pullOutgoing() {
		return this.outgoing_queue.pull();
	}
}