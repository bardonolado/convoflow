export {};

declare global {
    type Optional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>
    type NotOptional<T, K extends keyof T> = T & Required<Pick<T, K>>;
    type IfEquals<T, U, Y = unknown, N = never> = (<G>() => G extends T ? 1 : 2) extends (<G>() => G extends U ? 1 : 2) ? Y : N;

    type ObjectLiteral = Record<string, any>;
}
