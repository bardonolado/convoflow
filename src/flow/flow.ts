import {error} from "../utils/return";
import {StepFunction} from "./definition";
import Node from "./node";

enum FlowTypes {
    INCOMING = "incoming",
    TRAILING = "trailing",
    OUTGOING = "outgoing"
};

export {FlowTypes as Types};

export default class Flow {
    private static readonly Types = FlowTypes;

    private nodes: Map<FlowTypes, Map<string, Node>>;

    constructor() {
        this.nodes = new Map<FlowTypes, Map<string, Node>>();
        this.setup();
    }

    private setup() {
        for (let [item, value] of Object.entries(Flow.Types)) {
            this.nodes.set(value, new Map<FlowTypes, Node>());
        }
    }

    public getNode(name: string, type: FlowTypes = Flow.Types.TRAILING): (Error | Node) {
        const nodes = this.nodes.get(type);
        if (!nodes) return new Error("Can't get any node");

        for (const [key, value] of nodes?.entries()) {
            if (value.name == name) return value;
        }
        return new Error("Can't get any node");
    }

    public getNodes(type: FlowTypes = Flow.Types.TRAILING): (Error | Map<string, Node>) {
        const nodes = this.nodes.get(type);
        if (!(nodes && nodes.size)) return new Error("Can't get any nodes");
        return nodes;
    }

    public insertNode(name: string, chain: StepFunction[], type: FlowTypes = Flow.Types.TRAILING): error {
        if (!(this.getNode(name, type) instanceof Error)) {
            return new Error("Node already exist");
        }

        const nodes = this.nodes.get(type);
        if (!nodes) return new Error("Nodes map do not exist");

        nodes.set(name, new Node(name, chain));
        return null;
    }
}