import Session from "../bot/session";
import Course from "./course";

export type StepFunction = (session: Session, course: Course) => void;