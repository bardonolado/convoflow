class Logger {
    private static instance: Logger;
    private status: boolean = false;

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

    public error(message: string) {
        if (!this.status) return false;
        return console.log(`[*] Error: ${message}`);
    }

    public success(message: string) {
        if (!this.status) return false;
        return console.log(`[+] Success: ${message}`);
    }

    public fail(message: string) {
        if (!this.status) return false;
        return console.log(`[!] Error: ${message}`);
    }

    public info(message: string) {
        if (!this.status) return false;
        return console.log(`[*] Info: ${message}`);
    }

    public in(message: string) {
        if (!this.status) return false;
        return console.log(`[>] In: ${message}`);
    }
    
    public out(message: string) {
        if (!this.status) return false;
        return console.log(`[<] Out: ${message}`);
    }
}

const logger: Logger = new Logger();
export default logger;