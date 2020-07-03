import {StepFunction} from "./definition";

export default class Node {
    public name: string;
    public chain: StepFunction[];

    constructor(name: string, chain: StepFunction[]) {
        if (!name.length) throw new Error(`Name must be a valid string`)
        if (!chain.length) throw new Error(`Chain must be a valid array`)

        this.name = name;
        this.chain = chain;
    }
}