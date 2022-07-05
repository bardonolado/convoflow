import {Chain} from "./definition";
import Node from "./node";

export enum FlowTypes {
    INCOMING = "incoming",
    TRAILING = "trailing",
    OUTGOING = "outgoing"
}

export default class Flow<State> {
	private nodes: Map<FlowTypes, Map<string, Node<State>>>;

	constructor() {
		this.nodes = new Map<FlowTypes, Map<string, Node<State>>>();
		this.setup();
	}

	private setup() {
		for (const [item, value] of Object.entries(FlowTypes)) {
			this.nodes.set(value, new Map<FlowTypes, Node<State>>());
		}
	}

	public getNode(name: string, type: FlowTypes = FlowTypes.TRAILING): (Error | Node<State>) {
		const nodes = this.nodes.get(type);
		if (!nodes) return new Error("Can't get any node");

		for (const [key, value] of nodes.entries()) {
			if (value.name == name) return value;
		}
		return new Error("Can't get any node");
	}

	public getNodes(type: FlowTypes = FlowTypes.TRAILING): (Error | Map<string, Node<State>>) {
		const nodes = this.nodes.get(type);
		if (!(nodes && nodes.size)) return new Error("Can't get any nodes");
		return nodes;
	}

	public insertNode(name: string, chain: Chain<State>, type: FlowTypes = FlowTypes.TRAILING): (Error | null) {
		if (!(this.getNode(name, type) instanceof Error)) {
			return new Error("Node already exist");
		}

		const nodes = this.nodes.get(type);
		if (!nodes) return new Error("Nodes map do not exist");

		nodes.set(name, new Node(name, chain));
		return null;
	}
}