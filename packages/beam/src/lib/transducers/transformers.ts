import { transduce } from "./core";

export const nop = () => {};
export const identity = <T>(x: T) => x;
export const constant =
  <T>(x: T) =>
  () =>
    x;

// TODO: curriend versions (form*)
// TODO: matchAll, RegExp.prototype[@@matchAll]()

export interface IXForm<A, B, C> {
  init: () => A;
  fold: (a: A, b: B) => A;
  result: (a: A) => C;
}

export interface ICollection<P, Q, B> {
  setup: (a: Q) => P;
  unfold: (unacc: P) => readonly [P, B] | undefined;
}

export function toLast<T>() {
  return {
    init: constant(undefined),
    fold: (_acc: T | undefined, b: T) => b,
    result: identity,
  };
}

export function forEach<T>(cb: (a: T) => void) {
  return {
    init: constant(cb),
    fold: (acc: (a: T) => void, b: T) => {
      acc(b);
      return acc;
    },
    result: nop,
  };
}

function getIter<T>(iterable: Iterable<T>) {
  const obj = iterable[Symbol.iterator]();
  return () => obj.next();
}

export function iterColl<T>() {
  const coll = {
    setup: getIter<T>,
    unfold: function (next: () => IteratorResult<T, any>) {
      const { value, done } = next();
      if (done) return undefined;
      return [next, value] as const;
    },
  };
  return coll;
}

export function fromIter<T>(init: Iterable<T>) {
  return transduce<() => IteratorResult<T, any>, Iterable<T>, T>(
    iterColl(),
    init,
  );
}

export function toMap<K, V>() {
  return {
    init: () => new Map<K, V>(),
    fold: function (acc: Map<K, V>, [k, v]: [K, V]) {
      acc.set(k, v);
      return acc;
    },
    result: identity<Map<K, V>>,
  };
}

export function toArray<B>() {
  return {
    init: () => [] as B[],
    fold: function (acc: B[], b: B) {
      acc.push(b);
      return acc;
    },
    result: identity<B[]>,
  };
}

export function arrayColl<T>(): ICollection<T[], T[], T> {
  const coll = {
    setup: identity<T[]>,
    unfold: function (xs: T[]) {
      const x = xs.shift();
      if (x === undefined) {
        return undefined;
      }
      return [xs, x as T] as const;
    },
  };
  return coll;
}

export function fromArray<T>(init: T[]) {
  return transduce<T[], T[], T>(arrayColl(), init);
}

// this makes sense for any group
function toOpFactory<T>(id: T, op: (a: T, b: T) => T) {
  return function () {
    return {
      init: constant(id),
      fold: op,
      result: identity,
    };
  };
}

// for the sake of respecting the identity law
function opCollFactory<T>(id: T) {
  return {
    setup: identity<T>,
    unfold: function (acc: T) {
      if (acc === id) return undefined;
      return [id, acc] as const;
    },
  };
}

function fromOpFactory<T>(id: T) {
  return function (init: T) {
    return transduce<T, T, T>(opCollFactory(id), init);
  };
}

export const toSum = toOpFactory(0, (a: number, b: number) => a + b);
export const fromSum = fromOpFactory(0);
export const toMul = toOpFactory(1, (a: number, b: number) => a * b);
export const fromMul = fromOpFactory(1);
export const toConcat = toOpFactory("", (a: string, b: string) => a + b);
export const fromConcat = fromOpFactory("");

export function loopColl<T>(cond: (b: T) => boolean, step: (b: T) => T) {
  return {
    setup: identity<T>,
    unfold: (acc: T) => {
      const b = acc;
      if (!cond(b)) return undefined;
      acc = step(acc);
      return [acc, b] as const;
    },
  };
}
export function fromLoop<T>(cond: (b: T) => boolean, step: (b: T) => T) {
  return function (init: T) {
    return transduce<T, T, T>(loopColl(cond, step), init);
  };
}

export function fromRange(to: number, step: number) {
  if (step === 0) throw new Error("step cannot be 0");
  // Stryker disable next-line EqualityOperator
  const cond = step > 0 ? (v: number) => v <= to : (v: number) => v >= to;
  return fromLoop(cond, (v) => v + step);
}
