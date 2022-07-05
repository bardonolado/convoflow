import Session from "../bot/session";
import Course from "./course";
import Node from "./node";

export type StepFunction<State> = (session: Session<State>, course: Course<State>) => (any | Promise<any>);

export type WrappedStepFunction<State> = {
	name: string;
	action: StepFunction<State>;
};

export type Chain<State> = (StepFunction<State> | WrappedStepFunction<State>)[];

export function isStepFunction<State>(value: StepFunction<State> | WrappedStepFunction<State>): value is StepFunction<State>  {
	return !(<WrappedStepFunction<State>>value).action;
};

export interface Progress<State> {
    node: Node<State>
    step: number
}