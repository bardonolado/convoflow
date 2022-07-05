export {};

declare global {
    type Optional<T, K extends keyof T> = Pick<Partial<T>, K> & Omit<T, K>;
    type NotOptional<T, K extends keyof T> = T & Required<Pick<T, K>>;
    type IfEquals<T, U, Y=unknown, N=never> = (<G>() => G extends T ? 1 : 2) extends (<G>() => G extends U ? 1 : 2) ? Y : N;
    type IfAny<T, Y, N> = 0 extends (1 & T) ? Y : N; 
    type IsAny<T> = IfAny<T, true, false>;
}
