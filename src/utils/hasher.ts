import crypto from "crypto";

class Hasher {
	private static readonly CHARACTER_NORMAL = "QWERTYUIOPASDFGHJKLÇZXCVBNMçabcdefghijklmnopqrstuvwxyz1234567890!@#$%&*()_-+=;:><.,?{}][";
	private static readonly CHARACTER_SAFE = "QWERTYUIOPASDFGHJKLZXCVBNMabcdefghijklmnopqrstuvwxyz1234567890";
	constructor() {

	}

	public create(length: number, safe = false) {
		if (safe) {
			const token = this.generate(Hasher.CHARACTER_SAFE, "sha512", length);
			if (!token) return false;
			return token.replace(/\+/gi, "-").replace(/\//gi, "_").replace(/=/gi, "o");
		}
		return this.generate(Hasher.CHARACTER_NORMAL, "sha512", length);
	}

	public extract(data: string) {
		if (!data.length) return false;

		const hash = crypto.createHash("sha512");
		hash.update(data, "utf8");

		return hash.digest("base64");
	}

	private generate(characters: string, code: string, length: number) {
		if (!(characters.length && code.length && length)) return false;

		let uid = "";

		for (let i = 0; i < length; i++) {
			const index = Math.floor(Math.random() * characters.length);
			uid += characters[index];
		}

		if (!(uid && uid.length)) return false;

		const hash = crypto.createHash(code);
		hash.update(uid, "utf8");

		return hash.digest("base64");
	}
}

const hasher: Hasher = new Hasher();
export default hasher;