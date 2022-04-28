interface INode<T> {
    value: T
    next: Node<T>
}

type Node<T> = INode<T> | null;

export type ComparationFunction<T> = (value: T) => boolean;

export default class Queue<T> {
	private head: Node<T>;
	private tail: Node<T>;
	private size: number;

	constructor() {
		this.head = null;
		this.tail = null;
		this.size = 0;
	}

	public push(value: T): (Error | null) {
		const node: Node<T> = {value, next: null};

		if (!this.size) {
			this.head = node;
			this.tail = node;
			node.next = this.tail;
			this.size++;
			return null;
		}

		if (this.tail) this.tail.next = node;
		this.tail = node;
		this.size++;
		return null;
	}

	public pull(): (T | Error) {
		if (!this.size) return new Error("Queue is empty");

		const node: Node<T> = this.head;
		if (!node) return new Error("Can't get any values from queue");

		if (this.size == 1) {
			this.head = null;
			this.tail = null;
			this.size--;
			return node.value;
		}

		if (!this.head) return new Error("Can't get any values from queue");

		this.head = this.head.next;
		this.size--;

		return node.value;
	}

	public find(operator: ComparationFunction<T>): (T | Error) {
		const iterator = this.items();
		let item = iterator.next();
		while (item) {
			if (operator(item.value)) return item.value;
			item = iterator.next();
		}
		return new Error("Can't find any matches for this comparation");
	}

	public *items(): IterableIterator<T> {
		let node: Node<T> = this.head;
		while (node) {
			yield node.value;
			node = node.next;
		}
	}
}