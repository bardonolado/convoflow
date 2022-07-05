import {Chain} from "./definition";

export default class Node<State> {
	public name: string;
	public chain: Chain<State>;

	constructor(name: string, chain: Chain<State>) {
		if (!name.length) throw new Error(`Name must be a valid string`);
		if (!chain.length) throw new Error(`Chain must be a valid array`);

		this.name = name;
		this.chain = chain;
	}
}