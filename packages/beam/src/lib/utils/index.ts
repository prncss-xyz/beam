export const curry2 =
  <A, B, R>(f: (a: A, b: B) => R) =>
  (a: A) =>
  (b: B) =>
    f(a, b);
