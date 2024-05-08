export type Op<B, N> = <A>(c: Ctx<A, B>) => Ctx<A, N>;

export function toArray<B>(): IXForm<B[], B> {
  return {
    init: () => [],
    fold: function (acc, b) {
      acc.push(b);
      return acc;
    },
  };
}

export interface IXForm<A, B> {
  init: () => A;
  fold: (a: A, b: B) => A;
}

export interface ICollection<P, Q, B> {
  readonly setup: (a: Q) => P;
  readonly unfold: (unacc: P) => readonly [P, B] | undefined;
}

export interface Ctx<A, B> {
  fold: (a: A, b: B) => A;
  cut: () => never;
  close: () => void;
  step: <C, P, Q, N>(
    op: Op<C, N>,
    init: Q,
    coll: ICollection<P, Q, N>,
  ) => () => IteratorResult<C>;
  transform: <P, Q, N>(
    op: Op<N, N>,
    init: Q,
    coll: ICollection<P, Q, N>,
  ) => <A>(acc: A, fold: (a: A, b: N) => A) => A;
}

const cutSymbol = Symbol("cut");

function cut(): never {
  throw cutSymbol;
}

export function transform<B, N, P, Q>(
  op: Op<B, N>,
  init: Q,
  coll: ICollection<P, Q, N>,
) {
  return <A>(acc: A, fold: (a: A, b: B) => A) => {
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
      unacc = r[0];
      const b = r[1];
      try {
        acc = fold_(acc, b);
      } catch (value) {
        if (value !== cutSymbol) throw value;
        close();
      }
    }
    return acc;
  };
}

export function step<B, N, P, Q>(
  op: Op<B, N>,
  init: Q,
  coll: ICollection<P, Q, N>,
) {
  let alive = true;
  function close() {
    alive = false;
  }

  const form = toArray<B>();
  let acc = form.init();
  const fold = form.fold;

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
  return function next(): IteratorResult<B> {
    while (alive) {
      if (acc.length > 0) {
        const res = acc.shift()!;
        return { done: false, value: res };
      }
      const r = unfold(unacc);
      if (r === undefined) {
        close();
        return { done: true, value: undefined };
      }
      let b;
      [unacc, b] = r;
      try {
        acc = fold_(acc, b);
      } catch (value) {
        if (value !== cutSymbol) throw value;
        close();
        return { done: true, value: undefined };
      }
    }
    if (acc.length > 0) {
      const res = acc.shift()!;
      return { done: false, value: res };
    }
    close();
    return { done: true, value: undefined };
  };
}

export const transduce =
  <P, Q, N>(coll: ICollection<P, Q, N>, init: Q) =>
  <A, B>(form: IXForm<A, B>, op: Op<B, N>) => {
    const acc = form.init();
    const fold = form.fold;
    return transform(op, init, coll)(acc, fold);
  };
