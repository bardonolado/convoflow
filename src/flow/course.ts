import Session from "../bot/session";
import Flow, {FlowTypes} from "./flow";
import Node from "./node";

export type Mark = {
    name: string,
    node: string,
    step: number
};

export enum CourseState {
    DEFAULT = "default",
    COMPLETED = "completed",
    OVERLOAD = "overload"
};

export default class Course {
    private static readonly MAX_STACK = 3;

    private flow: Flow;
    private session: Session;
    private current_node: Node;
    private current_step: number;
    private lifes: number;
    private lock: boolean;
    private state: CourseState;
    
    constructor(flow: Flow, session: Session) {
        this.flow = flow;
        this.session = session;

        const progress = this.session.getProgress();
        if (progress instanceof Error) {
            throw new Error(`Can't get session progress: '${progress.message}'`);
        }

        const node = this.flow.getNode(progress.node);
        if (node instanceof Error) throw new Error(`Can't get flow node '${progress.node}'`);

        this.current_node = node;
        this.current_step = progress.step;
        this.lifes = 1;
        this.lock = false;

        this.state = CourseState.DEFAULT;
    }

    public async run() {
        let status = false;
    
        if (this.state != CourseState.DEFAULT) return false;
        status = await this.middleware(FlowTypes.INCOMING);

        if (status && (this.state as CourseState) != CourseState.OVERLOAD) return false;
        status = await this.trailing();

        if ((this.state as CourseState) == CourseState.COMPLETED) return false;
        status = await this.middleware(FlowTypes.OUTGOING);

        return true;
    }

    private async call() {
        if (this.current_step < 0) return false;

        let stack = 0;
        while (stack < Course.MAX_STACK && this.current_step < this.current_node.chain.length && this.lifes > 0) {
            this.lock = false;
            this.state = CourseState.DEFAULT;
            
            await this.current_node.chain[this.current_step](this.session, this);

            this.lifes--;
            stack++;
        }

        return true;
    }

    private async trailing() {
        const status = await this.call();
        this.session.setProgress(this.current_node.name, this.current_step);
        return status;
    }

    private async middleware(type: FlowTypes) {
        let node = this.current_node;
        let step = this.current_step;

        const nodes = this.flow.getNodes(type);
        if (nodes instanceof Error) return false;

        this.lifes = 1;

        for (let [key, value] of nodes.entries()) {
            const node = value;

            this.current_node = node;
            this.current_step = 0;

            await this.call();

            if (this.state != CourseState.OVERLOAD) break;
        }

        let match = false;
        for (let [key, value] of nodes.entries()) {
            const node = value;

            if (node.name == this.current_node.name) {
                match = true;
                break;
            }
        }

        if (!match) {
            this.session.setProgress(this.current_node.name, this.current_step);
            return true;
        }

        this.current_node = node;
        this.current_step = step;
        return true;
    }

    public next() {
        if (this.lock) return false;
        this.lock = true;

        if (this.current_step >= (this.current_node.chain.length - 1)) {
            this.state = CourseState.OVERLOAD;
        }

        this.current_step++;
        this.lifes++;
        return true;
    }

    public wait() {
        if (this.lock) return false;
        this.lock = true;

        if (this.current_step >= (this.current_node.chain.length - 1)) {
            this.state = CourseState.OVERLOAD;
        }

        this.current_step++;
        return true;
    }

    public jump(index: number) {
        if (this.lock) return false;
        this.lock = true;

        if (index < 0) return false;
        if (index > this.current_node.chain.length - 1) {
            return false;
        }

        this.lifes++;
        this.current_step = index;
        return true;
    }

    public mark(value: string) {
        if (!value.length) return false;
        return this.session.setMark(value, this.current_node.name, this.current_step);
    }

    public hop(name: string) {
        if (this.lock) return false;
        this.lock = true;
        
        if (!name.length) return false;

        const mark = this.session.getMark(name);
        if (!mark) return false;

        const node = this.flow.getNode(mark.node);
        if (node instanceof Error) return false;

        this.current_node = node;
        this.current_step = mark.step;

        this.session.setProgress(mark.node, mark.step);
        this.lifes++;
        return true;
    }

    public back() {
        if (this.lock) return false;
        this.lock = true;

        const mark = this.session.getLastMark();
        if (!mark) return false;

        const node = this.flow.getNode(mark.node);
        if (node instanceof Error) return false;

        this.current_node = node;
        this.current_step = mark.step;

        this.session.setProgress(mark.node, mark.step);
        this.lifes++;
        return true;
    }

    public restart() {
        if (this.lock) return false;
        this.lock = true;

        this.lifes++;
        return true;
    }

    public reset() {
        if (this.lock) return false;
        this.lock = true;

        this.lifes++;
        this.current_step = 0;
        return true;
    }

    public replace(name: string) {
        if (this.lock) return false;
        this.lock = true;

        if (!name.length) return false;

        const node = this.flow.getNode(name);
        if (node instanceof Error) return false;

        this.current_node = node;
        this.current_step = 0;

        this.session.setProgress(name, 0);
        this.lifes++;
        return true;
    }

    public end() {
        if (this.lock) return false;
        this.lock = true;
        
        this.lifes = 0;
        this.state = CourseState.COMPLETED;

        const nodes = this.flow.getNodes();
        if (nodes instanceof Error) return false;

        const node = nodes.values().next().value;
        if (!node) return false;

        this.current_node = node;
        this.current_step = 0;

        this.session.setProgress(node.name, 0);
        return true;
    }
}