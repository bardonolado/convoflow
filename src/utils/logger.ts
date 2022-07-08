export type LogType = "error" | "success" | "warning" | "info" | "event" | "in" | "out"

class Logger {
	private static instance: Logger;
	private status = false;

	constructor() {
		if (Logger.instance) return Logger.instance;
		Logger.instance = this;
	}

	public enable() {
		this.status = true;
	}

	public disable() {
		this.status = false;
	}

	public log(type: LogType, message: string) {
		if (!this.status) return;
		switch (type) {
			case "error":
				console.log(`[-] Error: ${message}`);
				break;
			case "success":
				console.log(`[+] Success: ${message}`);
				break;
			case "info":
				console.log(`[!] Info: ${message}`);
				break;
			case "warning":
				console.log(`[!] Warning: ${message}`);
				break;
			case "event":
				console.log(`[#] Event: ${message}`);
				break;
			case "in":
				console.log(`[>] In: ${message}`);
				break;
			case "out":
				console.log(`[<] Out: ${message}`);
				break;
		}
	}
}

const logger: Logger = new Logger();
export default logger;