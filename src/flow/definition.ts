import {ObjectLiteral} from "../builder/definition";
import Session from "../builder/session";
import Course from "./course";
import Node from "./node";

export type StepFunction<State extends ObjectLiteral> = (session: Session<State>, course: Course<State>) => (any | Promise<any>);

export type WrappedStepFunction<State extends ObjectLiteral> = {
	name: string;
	action: StepFunction<State>;
};

export type Chain<State extends ObjectLiteral = ObjectLiteral> = (StepFunction<State> | WrappedStepFunction<State>)[];

export function isStepFunction<State extends ObjectLiteral = ObjectLiteral>(value: StepFunction<State> | WrappedStepFunction<State>): value is StepFunction<State>  {
	return !(<WrappedStepFunction<State>>value).action;
};

export interface Progress<State extends ObjectLiteral = ObjectLiteral> {
    node: Node<State>
    step: number
}