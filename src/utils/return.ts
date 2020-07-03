export type error = Error | null;
export type result<T> = [error, T | null];