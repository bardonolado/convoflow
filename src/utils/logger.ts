export type LogType = "error" | "warning" | "success" | "info";
export type LogLevel = "error" | "debug" | "info";

class Logger {
	private static instance: Logger;
	private static readonly LEVELS: Record<LogLevel, number> = {
		"error": 1,
		"debug": 2,
		"info": 3
	}

	private status = false;
	private level: LogLevel = "info";

	constructor() {
		if (Logger.instance) return Logger.instance;
		Logger.instance = this;
	}

	public enable(level: keyof typeof Logger.LEVELS = "info") {
		this.status = true;
		this.level = level;
	}

	public disable() {
		this.status = false;
	}

	public log(type: LogType, message: string) {
		if (!this.status) return;
		switch (type) {
			case "error":
				Logger.LEVELS[this.level] <= Logger.LEVELS["error"] && console.log(`[-] Error: ${message}`);
				break;
			case "warning":
				Logger.LEVELS[this.level] <= Logger.LEVELS["debug"] && console.log(`[!] Warning: ${message}`);
				break;
			case "info":
				Logger.LEVELS[this.level] <= Logger.LEVELS["info"] && console.log(`[#] Info: ${message}`);
				break;
			case "success":
				Logger.LEVELS[this.level] <= Logger.LEVELS["info"] && console.log(`[+] Success: ${message}`);
				break;
		}
	}
}

const logger: Logger = new Logger();
export default logger;