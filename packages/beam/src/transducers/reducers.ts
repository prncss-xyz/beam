import { Ctx } from "./core";
import { ICollection } from "./transformers";

export type Op<A, B, N> = (c: Ctx<A, B>) => Ctx<A, N>;

export function id<A, B>(): Op<A, B, B> {
  return function (ctx) {
    return {
      ...ctx,
      fold: function (a, b) {
        return ctx.fold(a, b);
      },
    };
  };
}

export function take<A, B>(n: number): Op<A, B, B> {
  return function (ctx) {
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

export function drop<A, B>(n: number): Op<A, B, B> {
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

export function takeWhile<A, B>(c: (b: B) => boolean): Op<A, B, B> {
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

export function dropWhile<A, B>(c: (b: B) => boolean): Op<A, B, B> {
  return function (ctx) {
    let dropping = true;
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

export function find<A, B>(c: (b: B) => boolean): Op<A, B, B> {
  return function (ctx) {
    return {
      ...ctx,
      fold: function (a, b) {
        if (!c(b)) return ctx.fold(a, b);
        ctx.close();
        return ctx.fold(a, b);
      },
    };
  };
}

export function filter<A, B>(c: (b: B) => boolean): Op<A, B, B> {
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

export function replace<A, B>(c: (b: B) => boolean, v: B): Op<A, B, B> {
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

export function uniq<A, B>(): Op<A, B, B> {
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

export function map<A, B, N>(f: (v: B) => N): Op<A, N, B> {
  return function (ctx) {
    return {
      ...ctx,
      fold: function (a, b) {
        return ctx.fold(a, f(b));
      },
    };
  };
}

export function fold<A, B, N>(f: (a: N, b: B) => N, init: N): Op<A, N, B> {
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

export function slices<A, B>(len: number): Op<A, B[], B> {
  return function (ctx) {
    let acc_ = [] as B[];
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

export function apertures<A, B>(len: number): Op<A, B[], B> {
  return function (ctx) {
    let acc_ = [] as B[];
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

export function chain<A, B, Q>(
  coll: ICollection<any, Q, B>,
  f: (b: B) => Q,
  op: Op<A, B, B> = id<A, B>(),
): Op<A, B, B> {
  return function (ctx) {
    return {
      ...ctx,
      fold: function (acc, b) {
        return ctx.transform(op, acc, ctx.fold, f(b), coll);
      },
    };
  };
}

export function flatten<A, B, Q>(
  coll: ICollection<any, Q, B>,
  op: Op<A, B, B> = id<A, B>(),
): Op<A, B, Q> {
  return function (ctx) {
    return {
      ...ctx,
      fold: function (acc, b) {
        return ctx.transform(op, acc, ctx.fold, b, coll);
      },
    };
  };
}

export function zip<A, B, C, Q>(
  coll: ICollection<any, Q, C>,
  right: Q,
  op: Op<C[], C, C> = id<C[], C>(),
): Op<A, [B, C], B> {
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
        return ctx.fold(acc, [b, c] as const);
      },
    };
  };
}
