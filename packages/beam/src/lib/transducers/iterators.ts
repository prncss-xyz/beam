import { ICollection, Op, step } from "./core";

export function transformIterator<N, P, Q>(
  coll: ICollection<P, Q, N>,
  init: Q,
) {
  return function <B>(op: Op<B, N>) {
    const next = step<B, N, P, Q>(op, init, coll);
    return {
      next,
      [Symbol.iterator]() {
        return this;
      },
    };
  };
}
