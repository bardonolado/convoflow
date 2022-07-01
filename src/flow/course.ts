import Session from "../bot/session";
import {isStepFunction, Progress} from "./definition";
import Flow, {FlowTypes} from "./flow";
import Node from "./node";

export enum CourseState {
    DEFAULT = "default",
    COMPLETED = "completed",
    OVERLOAD = "overload"
}

export default class Course<StorageType> {
	private static readonly MAX_STACK = 250;

	private flow: Flow<StorageType>;
	private session: Session<StorageType>;
	private current_node: Node<StorageType>;
	private current_step: number;
	private detached_progress: Progress<StorageType>[];
	private lifes: number;
	private lock: boolean;
	private current_flow_type: FlowTypes;
	private state: CourseState;

	constructor(flow: Flow<StorageType>, session: Session<StorageType>) {
		this.flow = flow;
		this.session = session;

		const progress = this.session.getProgress();
		if (progress instanceof Error) {
			throw new Error(`Can't get session progress: '${progress.message}'`);
		}

		const node = this.flow.getNode(progress.current.node);
		if (node instanceof Error) throw new Error(`Can't get flow node '${progress.current.node}'`);

		const detached_progress: Progress<StorageType>[] = [];
		for (const k in progress.detached) {
			const item = progress.detached[k];

			const node = this.flow.getNode(item.node);
			if (node instanceof Error) {
				throw new Error(`Can't get flow node '${item.node}'`);
			}

			detached_progress.push({node, step: item.step});
		}

		this.current_node = node;
		this.current_step = progress.current.step;

		this.detached_progress = detached_progress;

		this.lifes = 1;
		this.lock = false;

		this.current_flow_type = FlowTypes.TRAILING;
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
		while (++stack < Course.MAX_STACK && this.current_step < this.current_node.chain.length && this.lifes > 0) {
			this.lock = false;
			this.state = CourseState.DEFAULT;

			const current_step = this.current_node.chain[this.current_step];
			await (isStepFunction(current_step) ? current_step : current_step.action)(this.session, this);

			this.lifes--;

			// rewind detached progress
			if (this.current_flow_type == FlowTypes.TRAILING && this.detached_progress.length > 0) {
				if (this.current_step > this.current_node.chain.length - 1) {
					const progress = this.detached_progress.pop();
					if (progress != null && progress.node != null) {
						const step = (progress.step || 0) + 1;
						if (step < progress.node.chain.length) {
							this.current_node = progress.node;
							this.current_step = step;
						}
					}
				}
			}
		}

		return true;
	}

	private async trailing() {
		this.current_flow_type = FlowTypes.TRAILING;
		const status = await this.call();
		this.setSessionProgress();
		return status;
	}

	private async middleware(type: FlowTypes) {
		this.current_flow_type = type;

		const node = this.current_node;
		const step = this.current_step;

		const nodes = this.flow.getNodes(type);
		if (nodes instanceof Error) return false;

		this.lifes = 1;

		for (const [key, value] of nodes.entries()) {
			const node = value;

			this.current_node = node;
			this.current_step = 0;

			await this.call();

			if (this.state != CourseState.OVERLOAD) break;
		}

		let match = false;
		for (const [key, value] of nodes.entries()) {
			const node = value;

			if (node.name == this.current_node.name) {
				match = true;
				break;
			}
		}

		if (!match) {
			this.setSessionProgress();
			this.state = CourseState.OVERLOAD;
			return true;
		}

		this.current_node = node;
		this.current_step = step;
		return true;
	}

	private setSessionProgress() {
		this.session.setProgress({
			current: {
				node: this.current_node.name,
				step: this.current_step
			},
			detached: this.detached_progress.map((item) => {
				return {node: item.node.name, step: item.step};
			})
		});
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

		this.current_step++;
		return true;
	}

	public jump(step: number | string) {
		if (this.lock) return false;
		this.lock = true;

		if (typeof step === "string") {
			step = this.current_node.chain.findIndex(value => {
				return isStepFunction(value) ? false : value.name === step;
			});
		}

		if (step < 0) return false;
		if (step > this.current_node.chain.length - 1) {
			return false;
		}

		this.lifes++;
		this.current_step = step;
		return true;
	}

	public skip() {
		if (this.lock) return false;
		this.lock = true;

		if (!this.detached_progress.length) {
			return false;
		}

		this.lifes++;
		this.current_step = this.current_node.chain.length;
		return true;
	}

	public again() {
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

	public begin(name: string) {
		if (this.lock) return false;
		this.lock = true;

		if (!name.length) return false;

		const node = this.flow.getNode(name);
		if (node instanceof Error) return false;

		this.detached_progress.push({
			node: this.current_node,
			step: this.current_step
		});

		this.current_node = node;
		this.current_step = 0;

		this.state = CourseState.DEFAULT;

		this.setSessionProgress();
		this.lifes++;
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

		this.detached_progress = [];

		this.current_flow_type = FlowTypes.TRAILING;
		this.state = CourseState.DEFAULT;

		this.setSessionProgress();
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

		this.detached_progress = [];

		this.setSessionProgress();
		return true;
	}
}