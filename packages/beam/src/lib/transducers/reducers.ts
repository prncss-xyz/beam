import { ICollection, Op } from "./core";

export function id<B>(): Op<B, B> {
  return function (ctx) {
    return {
      ...ctx,
      fold: function (a, b) {
        return ctx.fold(a, b);
      },
    };
  };
}

export function take<B>(n: number): Op<B, B> {
  return function (ctx) {
    if (n === 0)
      return {
        ...ctx,
        // ideally, would prevent even the first iteration
        fold: function () {
          return ctx.cut();
        },
      };
    let i = 0;
    return {
      ...ctx,
      fold: function (a, b) {
        i++;
        if (i === n) ctx.close();
        return ctx.fold(a, b);
      },
    };
  };
}

export function drop<B>(n: number): Op<B, B> {
  return function (ctx) {
    let i = 0;
    return {
      ...ctx,
      fold: function (a, b) {
        i++;
        if (i > n) return ctx.fold(a, b);
        return a;
      },
    };
  };
}

export function takeWhile<B>(c: (b: B) => unknown): Op<B, B> {
  return function (ctx) {
    return {
      ...ctx,
      fold: function (a, b) {
        if (c(b)) return ctx.fold(a, b);
        return ctx.cut(); // return is needed to have correct typing
      },
    };
  };
}

export function dropWhile<B>(c: (b: B) => unknown): Op<B, B> {
  return function (ctx) {
    let dropping: unknown = true;
    return {
      ...ctx,
      fold: function (a, b) {
        dropping &&= c(b);
        if (dropping) return a;
        return ctx.fold(a, b);
      },
    };
  };
}
export function find<B>(c: (b: B) => unknown): Op<B, B> {
  return function (ctx) {
    return {
      ...ctx,
      fold: function (a, b) {
        if (c(b)) {
          ctx.close();
          return ctx.fold(a, b);
        }
        return a;
      },
    };
  };
}

export function filter<B>(c: (b: B) => unknown): Op<B, B> {
  return function (ctx) {
    return {
      ...ctx,
      fold: function (a, b) {
        if (c(b)) return ctx.fold(a, b);
        return a;
      },
    };
  };
}

export function replace<B>(c: (b: B) => unknown, v: B): Op<B, B> {
  return function (ctx) {
    return {
      ...ctx,
      fold: function (a, b) {
        if (!c(b)) return ctx.fold(a, b);
        return ctx.fold(a, v);
      },
    };
  };
}

export function uniq<B>(): Op<B, B> {
  return function (ctx) {
    let first = true;
    let last: B | undefined = undefined;
    return {
      ...ctx,
      fold: function (acc, b) {
        const pass = first || last !== b;
        first = false;
        last = b;
        if (pass) return ctx.fold(acc, b);
        return acc;
      },
    };
  };
}

export function map<B, N>(f: (v: B) => N): Op<N, B> {
  return function (ctx) {
    return {
      ...ctx,
      fold: function (a, b) {
        return ctx.fold(a, f(b));
      },
    };
  };
}

export function scan<B, N>(f: (a: N, b: B) => N, init: N): Op<N, B> {
  return function (ctx) {
    let acc_ = init;
    return {
      ...ctx,
      fold: function (a_, b_) {
        acc_ = f(acc_, b_);
        return ctx.fold(a_, acc_);
      },
    };
  };
}

export function slices<B>(len: number): Op<B[], B> {
  if (len <= 0) throw new Error("len must be positive");
  return function (ctx) {
    let acc_: B[] = [];
    return {
      ...ctx,
      fold: function (acc, b) {
        acc_.push(b);
        if (acc_.length === len) {
          const res = acc_;
          acc_ = [];
          return ctx.fold(acc, res);
        }
        return acc;
      },
    };
  };
}

export function apertures<B>(len: number): Op<B[], B> {
  if (len <= 0) throw new Error("len must be positive");
  return function (ctx) {
    let acc_: B[] = [];
    return {
      ...ctx,
      fold: function (acc, b) {
        acc_.push(b);
        if (acc_.length === len) {
          const res = acc_;
          acc_ = acc_.slice(1);
          return ctx.fold(acc, res);
        }
        return acc;
      },
    };
  };
}

// aka flatMap
export function chain<B, Q>(
  coll: ICollection<any, Q, B>,
  f: (b: B) => Q,
  op: Op<B, B> = id<B>(),
): Op<B, B> {
  return function (ctx) {
    return {
      ...ctx,
      fold: function (acc, b) {
        return ctx.transform(op, f(b), coll)(acc, ctx.fold);
      },
    };
  };
}

// aka flatten
export function join<B, Q>(
  coll: ICollection<any, Q, B>,
  op: Op<B, B> = id<B>(),
): Op<B, Q> {
  return function (ctx) {
    return {
      ...ctx,
      fold: function (acc, b) {
        return ctx.transform(op, b, coll)(acc, ctx.fold);
      },
    };
  };
}

export function zip<B, C, Q, R>(
  f: (b: B, c: C) => R,
  coll: ICollection<any, Q, C>,
  right: Q,
  op: Op<C, C> = id(),
): Op<R, B> {
  return function (ctx) {
    const iter = ctx.step(op, right, coll);
    return {
      ...ctx,
      fold: function (acc, b) {
        const r = iter();
        if (r.done) {
          return ctx.cut();
        }
        const c = r.value;
        return ctx.fold(acc, f(b, c));
      },
    };
  };
}
