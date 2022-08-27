import Session from "../bot/session";
import Course from "./course";
import Node from "./node";

export type StepFunction<State extends ObjectLiteral> = (session: Session<State>, course: Course) => (any | Promise<any>);

export type WrappedStepFunction<State extends ObjectLiteral> = {
	name: string;
	action: StepFunction<State>;
};

export type Chain<State extends ObjectLiteral = ObjectLiteral> = (StepFunction<State> | WrappedStepFunction<State>)[];

export function isStepFunction<State extends ObjectLiteral>(value: StepFunction<State> | WrappedStepFunction<State>): value is StepFunction<State>  {
	return !(<WrappedStepFunction<State>>value).action;
};

export interface Progress {
    node: Node
    step: number
}