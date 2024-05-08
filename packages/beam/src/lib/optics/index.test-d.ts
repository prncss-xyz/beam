import { eq } from "./index";

function isNumber(x: unknown): x is number {
  return typeof x === "number";
}

describe("lens", () => {
  test("compose", () => {
    const t = { a: { b: "toto" } };
    type T = typeof t;
    const x = eq<T>().prop("a").prop("b").getter(t);
    expectTypeOf(x).toEqualTypeOf<string>;
  });
  describe("prop", () => {
    type T = { a: number; b?: string };
    const t = { a: 1, b: "toto" };
    it("returns prop", () => {
      const p = eq<T>().prop("a").getter(t);
      expectTypeOf(p).toEqualTypeOf<number>;
      const q = eq<T>().propOpt("b").getter(t);
      expectTypeOf(q).toEqualTypeOf<string | undefined>;
    });
    it("updates prop", () => {
      expect(eq<T>().prop("a").setter(3, t)).toEqual({ a: 3, b: "toto" });
    });

    describe("filter", () => {
      const x = eq<unknown[]>().find(isNumber).getter([]);
      expectTypeOf(x).toEqualTypeOf<number | undefined>;
    });
  });
});
