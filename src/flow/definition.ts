import Session from "../bot/session";
import Course from "./course";
import Node from "./node";

export type StepFunction<StorageType> = (session: Session<StorageType>, course: Course<StorageType>) => (any | Promise<any>);

export type WrappedStepFunction<StorageType> = {
	name: string;
	action: StepFunction<StorageType>;
};

export type Chain<StorageType> = (StepFunction<StorageType> | WrappedStepFunction<StorageType>)[];

export function isStepFunction<StorageType>(value: StepFunction<StorageType> | WrappedStepFunction<StorageType>): value is StepFunction<StorageType>  {
	return !(<WrappedStepFunction<StorageType>>value).action;
};

export interface Progress<StorageType> {
    node: Node<StorageType>
    step: number
}