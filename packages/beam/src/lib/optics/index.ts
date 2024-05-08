type GetterFn<A, S> = (s: S) => A;
type SetterFn<A, S> = (a: A, s: S) => S;
type RemoverFn<S> = (s: S) => S;

// TODO: nth(tuples)
// TODO: traversals/folds

type OptionalKeys<T> = {
  [K in keyof T]: object extends Pick<T, K> ? K : never;
}[keyof T];
type NonOptionalKeys<T> = {
  [K in keyof T]: object extends Pick<T, K> ? never : K;
}[keyof T];

type Optic<A, S> =
  | Getter<A, S>
  | GetterOpt<A, S>
  | Lens<A, S>
  | Optional<A, S>
  | Removable<A, S>;

export function eq<S>() {
  return new Lens<S, S>({
    getter: (s) => s,
    setter: (s) => s,
  });
}

class GetterOpt<A, S> {
  getter: GetterFn<A | undefined, S>;
  constructor({ getter }: { getter: GetterFn<A | undefined, S> }) {
    this.getter = getter;
  }
  compose<B>(right: Optic<B, A>): GetterOpt<B, S> {
    return new GetterOpt<B, S>({
      getter: (s: S) => {
        const a = this.getter(s);
        if (a === undefined) return undefined;
        return right.getter(a);
      },
    });
  }
  to<B>(getter: (a: A) => B) {
    return new Getter({ getter });
  }
  toOpt<B>(getter: (a: A) => B | undefined) {
    return new GetterOpt({ getter });
  }
}

class Getter<A, S> {
  getter: GetterFn<A, S>;
  constructor({ getter }: { getter: GetterFn<A, S> }) {
    this.getter = getter;
  }
  compose<B>(right: GetterOpt<B, A> | Optional<B, A>): GetterOpt<B, S>;
  compose<B>(right: Getter<B, A> | Lens<B, A>): Getter<B, S>;
  compose<B>(right: Optic<B, A>): Optic<B, S> {
    if (right instanceof Lens || right instanceof Getter)
      return new Getter({
        getter: (s: S) => right.getter(this.getter(s)),
      });
    return new GetterOpt<B, S>({
      getter: (s: S) => right.getter(this.getter(s)),
    });
  }
  to<B>(getter: (s: A) => B): Getter<B, S> {
    return this.compose(new Getter({ getter }));
  }
  toOpt<B>(getter: (a: A) => B | undefined) {
    return new GetterOpt({ getter });
  }
}

class Lens<A, S> {
  getter: GetterFn<A, S>;
  setter: SetterFn<A, S>;
  constructor({
    getter,
    setter,
  }: {
    getter: GetterFn<A, S>;
    setter: SetterFn<A, S>;
  }) {
    this.getter = getter;
    this.setter = setter;
  }
  compose<B>(right: Removable<B, A>): Removable<B, S>;
  compose<B>(right: Lens<B, A>): Lens<B, S>;
  compose<B>(right: Optional<B, A>): Optional<B, S>;
  compose<B>(right: Getter<B, A>): Getter<B, S>;
  compose<B>(right: GetterOpt<B, A>): GetterOpt<B, S>;
  compose<B>(right: Optic<B, A>): Optic<B, S> {
    if (right instanceof Removable)
      return new Removable({
        getter: (s: S) => right.getter(this.getter(s)),
        setter: (b, s) => this.setter(right.setter(b, this.getter(s)), s),
        remover: (s: S) => this.setter(right.remover(this.getter(s)), s),
      });
    if (right instanceof Lens)
      return new Lens({
        getter: (s: S) => right.getter(this.getter(s)),
        setter: (b, s) => this.setter(right.setter(b, this.getter(s)), s),
      });
    if (right instanceof Optional)
      return new Optional<B, S>({
        getter: (s: S) => right.getter(this.getter(s)),
        setter: (b, s) => this.setter(right.setter(b, this.getter(s)), s),
      });
    if (right instanceof Getter)
      return new Getter<B, S>({
        getter: (s: S) => right.getter(this.getter(s)),
      });
    return new GetterOpt<B, S>({
      getter: (s: S) => right.getter(this.getter(s)),
    });
  }

  to<B>(getter: (s: A) => B): Getter<B, S> {
    return this.compose(new Getter({ getter }));
  }
  toOpt<B>(getter: (a: A) => B | undefined) {
    return new GetterOpt({ getter });
  }
  lens<B>(getter: (s: A) => B, setter: (b: B, s: A) => A): Lens<B, S> {
    return this.compose(new Lens({ getter, setter }));
  }
  optional<B>(
    getter: (s: A) => B | undefined,
    setter: (b: B, s: A) => A,
  ): Optional<B, S> {
    return this.compose(new Optional({ getter, setter }));
  }
  removable<B>(
    getter: (s: A) => B | undefined,
    setter: (b: B, s: A) => A,
    remover: (s: A) => A,
  ) {
    return this.compose(new Removable({ getter, setter, remover }));
  }
  prop<Key extends keyof A>(key: Key & NonOptionalKeys<A>) {
    return this.lens(
      (s) => s[key],
      (a, s) => ({ ...s, [key as any]: a }),
    );
  }
  propOpt<Key extends keyof A>(key: Key & OptionalKeys<A>) {
    return this.removable(
      (s) => s[key],
      (a, s) => ({ ...s, [key]: a }),
      (s) => {
        const s_ = { ...s };
        delete s_[key];
        return s_;
      },
    );
  }

  at<X>(index: A extends readonly X[] ? number : never) {
    return this.compose(at(index) as Removable<X, unknown> as Removable<X, A>);
  }

  find<X, B extends X>(
    p: A extends X[] ? (x: X) => x is B : never,
  ): Removable<B, S>;
  find<X>(p: A extends X[] ? (x: X) => unknown : never): Removable<X, S>;
  find<X>(p: A extends X[] ? (x: X) => unknown : never) {
    return this.compose(find(p) as Removable<X, unknown> as Removable<X, A>);
  }

  // TODO: overload for type guard
  filter<X>(p: A extends X[] ? (x: X) => unknown : never): Lens<A, S>;
  filter<X>(p: A extends X[] ? (x: X) => unknown : never): Lens<A, S> {
    return this.compose(filter(p) as Lens<unknown, unknown> as Lens<A, A>);
  }

  includes<X>(x: A extends X[] ? X : never): Lens<boolean, S> {
    return this.compose(
      includes(x) as Lens<boolean, unknown> as Lens<boolean, A>,
    );
  }

  linear(m: A extends number ? number : any, b = 0): Lens<number, S> {
    return this.compose(
      linear(m, b) as Lens<number, unknown> as Lens<number, A>,
    );
  }

  rewrite(f: (a: A) => A) {
    return this.lens(
      (s) => f(s),
      (s) => s,
    );
  }
  reread(f: (a: A) => A) {
    return this.lens(
      (s) => s,
      (s) => f(s),
    );
  }
  when<B extends A>(p: (a: A) => a is B): Optional<B, S>;
  when(p: (a: A) => unknown): Optional<A, S>;
  when(p: (a: A) => unknown) {
    return this.optional(
      (s) => (p(s) ? s : undefined),
      (s) => s,
    );
  }
}

class Optional<A, S> {
  getter: GetterFn<A | undefined, S>;
  setter: SetterFn<A, S>;
  constructor({
    getter,
    setter,
  }: {
    getter: GetterFn<A | undefined, S>;
    setter: SetterFn<A, S>;
  }) {
    this.getter = getter;
    this.setter = setter;
  }
  compose<B>(right: Removable<B, A>): Removable<B, S>;
  compose<B>(right: Lens<B, A>): Optional<B, S>;
  compose<B>(right: Optional<B, A>): Optional<B, S>;
  compose<B>(right: GetterOpt<B, A>): GetterOpt<B, S>;
  compose<B>(right: Getter<B, A>): GetterOpt<B, S>;
  compose<B>(right: Optic<B, A>): Optic<B, S> {
    if (right instanceof Removable)
      return new Removable({
        getter: (s: S) => {
          const a = this.getter(s);
          if (a === undefined) return undefined;
          return right.getter(a);
        },
        setter: (b, s) => {
          const a = this.getter(s);
          if (a === undefined) return s;
          return this.setter(right.setter(b, a), s);
        },
        remover: (s) => {
          const a = this.getter(s);
          if (a === undefined) return s;
          return this.setter(right.remover(a), s);
        },
      });
    if (right instanceof Lens)
      return new Optional({
        getter: (s: S) => {
          const a = this.getter(s);
          if (a === undefined) return undefined;
          return right.getter(a);
        },
        setter: (b, s) => {
          const a = this.getter(s);
          if (a === undefined) return s;
          return this.setter(right.setter(b, a), s);
        },
      });
    if (right instanceof Optional)
      return new Optional({
        getter: (s: S) => {
          const a = this.getter(s);
          if (a === undefined) return undefined;
          return right.getter(a);
        },
        setter: (b, s) => {
          const a = this.getter(s);
          if (a === undefined) return s;
          return this.setter(right.setter(b, a), s);
        },
      });
    return new GetterOpt<B, S>({
      getter: (s: S) => {
        const a = this.getter(s);
        if (a === undefined) return undefined;
        return right.getter(a);
      },
    });
  }

  to<B>(getter: (s: A) => B): GetterOpt<B, S> {
    return this.compose(new GetterOpt({ getter }));
  }
  toOpt<B>(getter: (a: A) => B | undefined) {
    return new GetterOpt({ getter });
  }
  lens<B>(getter: (s: A) => B, setter: (b: B, s: A) => A): Optional<B, S> {
    return this.compose(
      new Lens({
        getter,
        setter,
      }),
    );
  }
  optional<B>(
    getter: (s: A) => B | undefined,
    setter: (b: B, s: A) => A,
  ): Optional<B, S> {
    return this.compose(new Optional({ getter, setter }));
  }
  removable<B>(
    getter: (s: A) => B | undefined,
    setter: (b: B, s: A) => A,
    remover: (s: A) => A,
  ) {
    return this.compose(new Removable({ getter, setter, remover }));
  }
  prop<Key extends keyof A>(key: Key & NonOptionalKeys<A>) {
    return this.lens(
      (s) => s[key],
      (a, s) => ({ ...s, [key as any]: a }),
    );
  }
  propOpt<Key extends keyof A>(key: Key & OptionalKeys<A>) {
    return this.removable(
      (s) => s[key],
      (a, s) => ({ ...s, [key]: a }),
      (s) => {
        const s_ = { ...s };
        delete s_[key];
        return s_;
      },
    );
  }

  at<X>(index: A extends readonly X[] ? number : never) {
    return this.compose(at(index) as Removable<X, unknown> as Removable<X, A>);
  }

  find<X, B extends X>(
    p: A extends X[] ? (x: X) => x is B : never,
  ): Removable<B, S>;
  find<X>(p: A extends X[] ? (x: X) => unknown : never): Removable<X, S>;
  find<X>(p: A extends X[] ? (x: X) => unknown : never) {
    return this.compose(find(p) as Removable<X, unknown> as Removable<X, A>);
  }

  // TODO: overload for type guard
  filter<X>(p: A extends X[] ? (x: X) => unknown : never): Optional<A, S>;
  filter<X>(p: A extends X[] ? (x: X) => unknown : never): Optional<A, S> {
    return this.compose(filter(p) as Lens<unknown, unknown> as Lens<A, A>);
  }

  includes<X>(x: A extends X[] ? X : never): Optional<boolean, S> {
    return this.compose(
      includes(x) as Lens<boolean, unknown> as Lens<boolean, A>,
    );
  }

  linear(m: A extends number ? number : any, b = 0): Optional<number, S> {
    return this.compose(
      linear(m, b) as Lens<number, unknown> as Lens<number, A>,
    );
  }

  rewrite(f: (a: A) => A) {
    return this.lens(
      (s) => f(s),
      (s) => s,
    );
  }
  reread(f: (a: A) => A) {
    return this.lens(
      (s) => s,
      (s) => f(s),
    );
  }
  when<B extends A>(p: (a: A) => a is B): Optional<B, S>;
  when(p: (a: A) => unknown): Optional<A, S>;
  when(p: (a: A) => unknown) {
    return this.optional(
      (s) => (p(s) ? s : undefined),
      (s) => s,
    );
  }
}

class Removable<A, S> extends Optional<A, S> {
  remover: RemoverFn<S>;
  constructor({
    getter,
    setter,
    remover,
  }: {
    getter: GetterFn<A | undefined, S>;
    setter: SetterFn<A, S>;
    remover: RemoverFn<S>;
  }) {
    super({ getter, setter });
    this.remover = remover;
  }
}

function at<B>(index: number) {
  return new Removable<B, B[]>({
    getter: (s) => s.at(index),
    setter: (a, s) => s.map((v, i) => (i === index ? a : v)),
    remover: (s) => s.filter((_v, i) => i !== index),
  });
}

function find<X>(p: (x: X) => unknown) {
  return new Removable({
    getter: (xs: X[]) => xs.find(p),
    setter: (x: X, xs: X[]) => {
      const i = xs.findIndex(p);
      if (i < 0) return [...xs, x];
      xs = [...xs];
      xs[i] = x;
      return xs;
    },
    remover: (xs: X[]) => {
      const i = xs.findIndex(p);
      if (i < 0) return xs;
      const r = xs.slice(0, i);
      r.push(...xs.slice(i + 1));
      return r;
    },
  });
}

function filter<X>(p: (x: X) => unknown) {
  return new Lens({
    getter: (xs: X[]) => xs.filter(p),
    setter: (fs: X[], xs: X[]) => {
      const rs = [];
      let i = 0;
      let j = 0;
      let k = 0;
      for (i = 0; i < xs.length; i++) {
        const x = xs[i];
        if (p(x)) {
          if (j < fs.length) {
            rs[k++] = fs[j++];
          }
        } else {
          rs[k++] = x;
        }
      }
      for (; j < fs.length; j++, i++) {
        rs[k++] = fs[j];
      }
      return rs;
    },
  });
}

function includes<X>(x: X) {
  return new Lens<boolean, X[]>({
    getter: (xs) => xs.includes(x),
    setter: (v, xs) => {
      if (xs.includes(x) === v) return xs;
      if (v) return [...xs, x];
      return xs.filter((x_) => x_ !== x);
    },
  });
}

function linear(m: number, b = 0) {
  return new Lens<number, number>({
    getter: (x) => m * x + b,
    setter: (y) => (y - b) / m,
  });
}

// TODO: tuple types
export function nth<T>(i: number) {
  return new Lens<T, T[]>({
    getter: (s) => s[i],
    setter: (v, s) => {
      const s_ = s.slice();
      s_[i] = v;
      return s_;
    },
  });
}

export function entries<T>() {
  return new Lens({
    getter: (o: Record<string, T>) => Object.entries(o),
    setter: (entries) => Object.fromEntries(entries),
  });
}

export function indexed<T>() {
  return new Lens({
    getter: (xs: T[]) => xs.map((v, i) => [i, v] as const),
    setter: (entries: (readonly [number, T])[]) => {
      const res: T[] = [];
      for (const [index, value] of entries) {
        res[index] = value;
      }
      return res;
    },
  });
}

export function join(separator = ",") {
  return new Lens<string, string[]>({
    getter: (xs) => xs.join(separator),
    setter: (str) => {
      return str.split(separator);
    },
  });
}

export function split(separator = ",") {
  return new Lens<string[], string>({
    getter: (str) => str.split(separator),
    setter: (xs) => {
      return xs.join(separator);
    },
  });
}

export function append<X>(x: X) {
  return function (xs: X[]) {
    return [...xs, x];
  };
}

export function prepend<X>(x: X) {
  return function (xs: X[]) {
    return [x, ...xs];
  };
}

export function isNum(u: unknown): u is number {
  return typeof u === "number";
}

export function strToNum() {
  return new Optional({
    getter: (s: string) => {
      const num = Number(s);
      if (isNaN(num)) return undefined;
      return num;
    },
    setter: (n) => String(n),
  });
}
