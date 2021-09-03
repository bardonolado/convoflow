import Session from "../bot/session";
import Course from "./course";
import Node from "./node";

export type StepFunction = (session: Session, course: Course) => (any | Promise<any>);

export interface Progress {
    node: Node
    step: number
};