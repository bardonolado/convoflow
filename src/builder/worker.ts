import {v4 as uuid} from "uuid";
import vow from "../utils/vow";

export type OperationFunction = (...args: any[]) => Promise<any>;

export interface WorkerSettings {
    delay?: number
}

export default class Worker {
	private static readonly DELAY = 250;

	private operation: OperationFunction;
	private settings: WorkerSettings;
	private token: string;
	private status: boolean;

	constructor(operation: OperationFunction, settings: WorkerSettings) {
		this.operation = operation;
		this.settings = settings;
		this.token = uuid();
		this.status = false;
	}

	public async start() {
		if (this.status) throw new Error("Worker already started");
		setImmediate(() => this.run());
		return this.status = true;
	}

	public async stop() {
		if (!this.status) throw new Error("Worker not started yet");
		return this.status = false;
	}

	private async run(): Promise<any> {
		if (!this.status) return false;

		const result = await vow.handle(this.operation(this.token));
		if (result instanceof Error) {
			return setTimeout(() => this.run(), this.settings?.delay || Worker.DELAY);
		}

		return setImmediate(() => this.run());
	}
}