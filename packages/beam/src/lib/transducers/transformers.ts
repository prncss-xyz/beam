import { ICollection, IXForm, toArray, transduce } from "./core";

const identity = <T>(x: T) => x;
const constant =
  <T>(x: T) =>
  () =>
    x;

export function toLast<A>(): IXForm<A | undefined, A> {
  return {
    init: constant(undefined),
    fold: (_acc, b) => b,
  };
}

export function forEach<T>(cb: (a: T) => void) {
  return {
    init: constant(cb),
    fold: (acc: (a: T) => void, b: T) => {
      acc(b);
      return acc;
    },
  };
}

function getIter<T>(iterable: Iterable<T>) {
  const obj = iterable[Symbol.iterator]();
  return () => obj.next();
}

export function fromEmpty<T>() {
  return transduce(emptyColl<T>(), undefined as void);
}

export function emptyColl<T>(): ICollection<void, void, T> {
  return {
    setup: () => {},
    unfold: function () {
      return undefined;
    },
  };
}

export function fromOnce<T>(x: T) {
  return transduce(onceColl<T>(), x);
}

const done = Symbol("done");
export function onceColl<T>(): ICollection<T | typeof done, T, T> {
  return {
    setup: (x) => x,
    unfold: function (x) {
      if (x === done) return undefined;
      return [done, x];
    },
  };
}

export function iterColl<T>(): ICollection<
  () => IteratorResult<T, any>,
  Iterable<T>,
  T
> {
  return {
    setup: getIter,
    unfold: function (next) {
      const { value, done } = next();
      if (done) return undefined;
      return [next, value];
    },
  };
}

export function fromIter<T>(init: Iterable<T>) {
  return transduce(iterColl<T>(), init);
}

export function toMap<K, V>() {
  return {
    init: () => new Map<K, V>(),
    fold: function (acc: Map<K, V>, [k, v]: [K, V]) {
      acc.set(k, v);
      return acc;
    },
  };
}

export { toArray };

export const arrayColl = <T>(): ICollection<T[], T[], T> => {
  return {
    setup: (xs) => [...xs],
    unfold: function (xs) {
      const x = xs.shift();
      if (x === undefined) {
        return undefined;
      }
      return [xs, x];
    },
  };
};

export function fromArray<T>(init: T[]) {
  return transduce<T[], T[], T>(arrayColl(), init);
}

// this makes sense for any group
function toOpFactory<T>(id: T, op: (a: T, b: T) => T) {
  return function () {
    return {
      init: constant(id),
      fold: op,
    };
  };
}

// for the sake of respecting the identity law
function opCollFactory<T>(id: T): ICollection<T, T, T> {
  return {
    setup: identity,
    unfold: function (acc) {
      if (acc === id) return undefined;
      return [id, acc];
    },
  };
}

function fromOpFactory<T>(id: T) {
  return function (init: T) {
    return transduce(opCollFactory(id), init);
  };
}

export const toSum = toOpFactory(0, (a: number, b: number) => a + b);
export const fromSum = fromOpFactory(0);
export const toMul = toOpFactory(1, (a: number, b: number) => a * b);
export const fromMul = fromOpFactory(1);
export const toConcat = toOpFactory("", (a: string, b: string) => a + b);
export const fromConcat = fromOpFactory("");

export function loopColl<T>(
  cond: (b: T) => unknown,
  step: (b: T) => T,
): ICollection<T, T, T> {
  return {
    setup: identity,
    unfold: (acc) => {
      const b = acc;
      if (!cond(b)) return undefined;
      acc = step(acc);
      return [acc, b];
    },
  };
}
export function fromLoop<T>(cond: (b: T) => unknown, step: (b: T) => T) {
  return function (init: T) {
    return transduce(loopColl(cond, step), init);
  };
}

export function fromRange(to: number, step: number) {
  if (step === 0) throw new Error("step cannot be 0");
  // Stryker disable EqualityOperator
  const cond = step > 0 ? (v: number) => v <= to : (v: number) => v >= to;
  // const cond = step >= 0 ? (v: number) => v <= to : (v: number) => v >= to;
  return fromLoop(cond, (v) => v + step);
}
