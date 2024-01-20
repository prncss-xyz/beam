import { Op } from "./reducers";
import { ICollection, IXForm, toArray } from "./transformers";

export interface Ctx<A, B> {
  fold: (a: A, b: B) => A;
  cut: () => never;
  close: () => void;
  step: <C, P, Q, N>(
    op: Op<C[], C, N>,
    init: Q,
    coll: ICollection<P, Q, N>,
  ) => () => IteratorResult<C>;
  transform: <P, Q, N>(
    op: Op<A, N, N>,
    acc: A,
    fold: (a: A, b: N) => A,
    init: Q,
    coll: ICollection<P, Q, N>,
  ) => A;
}

const cutSymbol = Symbol("cut");

function cut(): never {
  throw cutSymbol;
}

export function transform<A, B, N, P, Q>(
  op: Op<A, B, N>,
  acc: A,
  fold: (a: A, b: B) => A,
  init: Q,
  coll: ICollection<P, Q, N>,
): A {
  let alive = true;
  function close() {
    alive = false;
  }
  const ctx = op({
    cut,
    close,
    fold,
    transform,
    step,
  });
  const fold_ = ctx.fold;
  let unacc = coll.setup(init);
  const unfold = coll.unfold;
  while (alive) {
    const r = unfold(unacc);
    if (r === undefined) break;
    let b;
    [unacc, b] = r;
    try {
      acc = fold_(acc, b);
    } catch (value) {
      if (value !== cutSymbol) throw value;
      close();
    }
  }
  return acc;
}

export function step<B, N, P, Q>(
  op: Op<B[], B, N>,
  init: Q,
  coll: ICollection<P, Q, N>,
) {
  let alive = true;
  function complete() {
    alive = false;
  }

  const form = toArray<B>();
  let acc = form.init();
  const fold = form.fold;

  const ctx = op({
    cut,
    close: complete,
    fold,
    transform,
    step,
  });
  const fold_ = ctx.fold;
  let unacc = coll.setup(init);
  const unfold = coll.unfold;
  return function next(): IteratorResult<B> {
    while (alive) {
      if (acc.length > 0) {
        const res = acc.shift() as B;
        return { done: false, value: res };
      }
      const r = unfold(unacc);
      if (r === undefined) {
        complete();
        return { done: true, value: undefined };
      }
      let b;
      [unacc, b] = r;
      try {
        acc = fold_(acc, b);
      } catch (value) {
        if (value !== cutSymbol) throw value;
        complete();
        return { done: true, value: undefined };
      }
    }
    if (acc.length > 0) {
      const res = acc.shift() as B;
      return { done: false, value: res };
    }
    complete();
    return { done: true, value: undefined };
  };
}

export const transduce =
  <P, Q, N>(coll: ICollection<P, Q, N>, init: Q) =>
  <A, B, C>(form: IXForm<A, B, C>, op: Op<A, B, N>) => {
    const acc = form.init();
    const fold = form.fold;
    return form.result(transform(op, acc, fold, init, coll));
  };
