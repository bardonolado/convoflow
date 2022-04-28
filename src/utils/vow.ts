export class Lock {
	private promise: Promise<any>;
	private resolve: (value?: any) => void;

	constructor() {
		this.resolve = (value?: any) => {};
		this.promise = new Promise((resolve, reject) => {
			this.resolve = resolve;
		});
	}

	public wait(): Promise<any> {
		return this.promise;
	}

	public release() {
		this.resolve();
	}
}

class Vow {
	public async handle<T>(promise: Promise<T>): Promise<Error | T> {
		return promise.then(r => r).catch(e => e);
	}

	public lock() {
		return new Lock();
	}
}

const vow = new Vow();
export default vow;