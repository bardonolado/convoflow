import {Chain} from "./definition";

export default class Node {
	public name: string;
	public chain: Chain;

	constructor(name: string, chain: Chain) {
		if (!name.length) throw new Error(`Name must be a valid string`);
		if (!chain.length) throw new Error(`Chain must be a valid array`);

		this.name = name;
		this.chain = chain;
	}
}