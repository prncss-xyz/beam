import { eq } from "./index";

const isOdd = (x: number) => x % 2 === 1;

describe("lens", () => {
  describe("compose", () => {
    const t = { a: { b: "toto" } };
    type T = typeof t;
    it("returns prop", () => {
      expect(eq<T>().prop("a").prop("b").getter(t)).toBe("toto");
    });
  });
  describe("prop", () => {
    type T = { a: number; b?: string };
    const t = { a: 1, b: "toto" };
    it("gets prop", () => {
      expect(eq<T>().prop("a").getter(t)).toBe(1);
    });
    it("sets prop", () => {
      expect(eq<T>().prop("a").setter(3, t)).toEqual({ a: 3, b: "toto" });
    });
  });
  describe("at", () => {
    it("gets nth index", () => {
      const xs = [5, 6, 7, 8];
      const x = eq<number[]>().at(2).getter(xs);
      expect(x).toBe(7);
    });
    it("sets nth index", () => {
      const xs = [5, 6, 7, 8];
      const x = eq<number[]>().at(2).setter(0, xs);
      expect(x).toEqual([5, 6, 0, 8]);
    });
    it("removes nth index", () => {
      const xs = [5, 6, 7, 8];
      const x = eq<number[]>().at(2).remover(xs);
      expect(x).toEqual([5, 6, 8]);
    });
  });
  describe("when", () => {
    it("gets value when satisfying condition", () => {
      expect(eq<number>().when(isOdd).getter(3)).toBe(3);
    });
    it("gets undefined when not satisfying condition", () => {
      expect(eq<number>().when(isOdd).getter(4)).toBeUndefined();
    });
  });
  describe("linear", () => {
    const o = eq<unknown>().linear(2, 3);
    it("gets value applying linear transformation", () => {
      expect(o.getter(2)).toBe(7);
    });
    it("sets value inverting linear transformation", () => {
      expect(o.setter(7, 0)).toBe(2);
    });
  });
  describe("find", () => {
    const xs = ["a", "b", "c"];
    const p = (x: string) => x === "b";
    const o = eq<string[]>();
    it("gets prop", () => {
      expect(o.find(p).getter(xs)).toBe("b");
    });
    it("on setter, replace value satisfying condition", () => {
      expect(o.find(p).setter("z", xs)).toEqual(["a", "z", "c"]);
    });
    it("on setter, appends value when no element satisfies condition", () => {
      expect(o.find(p).setter("z", ["a", "c"])).toEqual(["a", "c", "z"]);
    });
    it("remove prop", () => {
      expect(o.find(p).remover(xs)).toEqual(["a", "c"]);
    });
  });
  describe("filter", () => {
    const xs = [4, 5, 6, 7];
    it("gets arrays of values staisfying condition", () => {
      expect(eq<number[]>().filter(isOdd).getter(xs)).toEqual([5, 7]);
    });
    it("sets prop, appending values when replacee is longer than match", () => {
      expect(eq<number[]>().filter(isOdd).setter([0, 2, 4], xs)).toEqual([
        4, 0, 6, 2, 4,
      ]);
    });
    it("sets prop, removing values when replacee is shorter than match", () => {
      expect(eq<number[]>().filter(isOdd).setter([0], xs)).toEqual([4, 0, 6]);
    });
  });
  describe("includes", () => {
    const xs = ["a", "b", "c"];
    it("gets prop", () => {
      expect(eq<string[]>().includes("b").getter(xs)).toBeTruthy();
      expect(eq<string[]>().includes("z").getter(xs)).toBeFalsy();
    });
    it("sets prop", () => {
      expect(eq<string[]>().includes("b").setter(true, xs)).toEqual(xs);
      expect(eq<string[]>().includes("b").setter(false, xs)).toEqual([
        "a",
        "c",
      ]);
      expect(eq<string[]>().includes("z").setter(true, xs)).toEqual([
        "a",
        "b",
        "c",
        "z",
      ]);
      expect(eq<string[]>().includes("z").setter(false, xs)).toEqual(xs);
    });
  });
});
