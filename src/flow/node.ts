import {Chain} from "./definition";

export default class Node<StorageType> {
	public name: string;
	public chain: Chain<StorageType>;

	constructor(name: string, chain: Chain<StorageType>) {
		if (!name.length) throw new Error(`Name must be a valid string`);
		if (!chain.length) throw new Error(`Chain must be a valid array`);

		this.name = name;
		this.chain = chain;
	}
}