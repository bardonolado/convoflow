export {};

declare global {
    type PickRequired<T, K extends keyof T> = T & Required<Pick<T, K>>;
}
