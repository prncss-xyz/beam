import {
  forEach,
  fromArray,
  fromConcat,
  fromIter,
  fromLoop,
  fromMul,
  fromRange,
  fromSum,
  toArray,
  toConcat,
  toLast,
  toMap,
  toMul,
  toSum,
} from "./transformers";
import { map } from "./reducers";

const identity = <T>(x: T) => x;
const add = (x: number) => (y: number) => x + y;

describe("reducers", () => {
  describe("fromIter", () => {
    it("should respect the identity law", () => {
      const xs = fromIter([1, 2, 3])(toArray<number>(), identity);
      expect(xs).toEqual([1, 2, 3]);
    });
  });
  describe("mapForm", () => {
    const xs = fromIter(
      new Map([
        [1, 2],
        [3, 4],
      ]),
    )(toMap<number, number>(), identity);
    it("should respect the identity law", () => {
      expect(Array.from(xs.entries())).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });
  });
  describe("last", () => {
    it("should return the last value", () => {
      const x = fromIter([1, 2, 3])(toLast<number>(), identity);
      expect(x).toEqual(3);
    });
  });
  describe("sumForm", () => {
    it("should return the sum of elements", () => {
      const x = fromIter([1, 2])(toSum(), identity);
      expect(x).toEqual(3);
    });
    it("should respect identity law", () => {
      const x = fromSum(3)(toSum(), identity);
      expect(x).toEqual(3);
    });
  });
  describe("mulForm", () => {
    it("should return the product of elements", () => {
      const x = fromIter([1, 2, 3])(toSum(), identity);
      expect(x).toEqual(6);
    });
    it("should respect identity law", () => {
      const x = fromMul(3)(toMul(), identity);
      expect(x).toEqual(3);
    });
  });
  describe("concatForm", () => {
    it("should return the concatenation of elements", () => {
      const x = fromIter(["a", "b", "c"])(toConcat(), identity);
      expect(x).toEqual("abc");
    });
    it("should respect identity law", () => {
      const x = fromConcat("abc")(toConcat(), identity);
      expect(x).toEqual("abc");
    });
    it("should have zero element", () => {
      const x = fromConcat("")(toArray(), identity);
      expect(x).toEqual([]);
    });
  });
  describe("loopForm", () => {
    it("should loop from value applying step until condition is met", () => {
      const x = fromLoop((x) => x < 3, add(1))(0)(toArray<number>(), identity);
      expect(x).toEqual([0, 1, 2]);
    });
  });
  describe("rangeForm", () => {
    describe("should produce the elements up to value by increment", () => {
      it("should not have step 0", () => {
        expect(() => {
          fromRange(4, 0)(0)(toArray<number>(), identity);
        }).toThrowError("step cannot be 0");
      });
      it("ascending", () => {
        const x = fromRange(4, 2)(0)(toArray<number>(), identity);
        expect(x).toEqual([0, 2, 4]);
      });
      it("descending", () => {
        const x = fromRange(-4, -2)(0)(toArray<number>(), identity);
        expect(x).toEqual([0, -2, -4]);
      });
    });
  });
  describe("map", () => {
    it("should map values with function", () => {
      const f = (x: number) => x * 2;
      const xs = fromArray([1, 2, 3])(toArray<number>(), map(f));
      expect(xs).toEqual([2, 4, 6]);
    });
  });
  describe("forEach", () => {
    it("should call callback for each occurence", () => {
      let i = 0;
      const f = (x: number) => x * 2;
      fromIter([1, 2, 3])(
        forEach<number>((x: number) => (i += x)),
        map(f),
      );

      expect(i).toEqual(12);
    });
  });
});
