import { pipe } from "ramda";
import {
  apertures,
  drop,
  dropWhile,
  filter,
  fold,
  map,
  replace,
  slices,
  take,
  takeWhile,
  uniq,
  zip,
  flatten,
  chain,
  find,
} from "./reducers";
import { toArray, fromIter, iterColl } from "./transformers";
import { transformIterator } from "./utils";

const mul = (x: number) => (y: number) => x * y;
const odd = (x: number) => x % 2 === 1;

describe("reducers", () => {
  describe("errors", () => {
    const fail = (i: number): number => {
      if (i === 5) throw "failure";
      return i;
    };
    it("shoud rethrow an error (core/transform)", () => {
      expect(() => {
        fromIter([4, 5, 6])(toArray<number>(), map(fail));
      }).toThrowError("failure");
    });
    it("shoud rethrow an error (core/step)", () => {
      const xs: [number, number][] = [];
      for (const x of transformIterator(
        iterColl<number>(),
        [1, 2, 3],
      )<[number, number]>(
        zip(
          iterColl(),
          [4, 5, 6],
          takeWhile((x) => x < 5),
        ),
      )) {
        xs.push(x);
      }
      expect(xs).toEqual([[1, 4]]);
    });
    it("shoud rethrow an error (core/step)", () => {
      expect(() => {
        fromIter([1, 2, 3])(
          toArray<[number, number]>(),
          zip(iterColl(), [4, 5, 6], map(fail)),
        );
      }).toThrowError("failure");
    });
  });
  describe("map", () => {
    test("should map with a type change", () => {
      const toAs = (x: number) => {
        let s = "";
        while (x > 0) {
          x--;
          s += "a";
        }
        return s;
      };
      const xs = fromIter([1, 2, 3])(toArray<string>(), map(toAs));
      expect(xs).toEqual(["a", "aa", "aaa"]);
    });
  });
  describe("take", () => {
    const xs = fromIter(["kayak", "chair", "goat"])(toArray<string>(), take(2));
    it("should take a kayak (and a chair)", () => {
      expect(xs).toEqual(["kayak", "chair"]);
    });
  });
  describe("find", () => {
    const xs = fromIter(["kayak", "chair", "goat"])(
      toArray<string>(),
      find((x: string) => x === "chair"),
    );
    it("should return all results up to seek target", () => {
      expect(xs).toEqual(["kayak", "chair"]);
    });
  });
  describe("drop", () => {
    const xs = fromIter(["kayak", "chair", "goat"])(toArray<string>(), drop(1));
    it("should drop a kayak", () => {
      expect(xs).toEqual(["chair", "goat"]);
    });
  });
  describe("takeWhile", () => {
    it("should take while cond is true", () => {
      const xs = fromIter([1, 3, 4, 5])(toArray<number>(), takeWhile(odd));
      expect(xs).toEqual([1, 3]);
    });
  });
  describe("dropWhile", () => {
    it("should drop while cond is true", () => {
      const xs = fromIter([1, 3, 4, 5])(toArray<number>(), dropWhile(odd));
      expect(xs).toEqual([4, 5]);
    });
  });
  describe("uniq", () => {
    it("should remove consecutive duplicates", () => {
      const xs = fromIter([1, 1, 2, 3, 2])(toArray<number>(), uniq());
      expect(xs).toEqual([1, 2, 3, 2]);
    });
    it("should treat undefined as any other value", () => {
      const xs = fromIter([undefined, 1, 1, undefined, undefined, 3, 1, 3])(
        toArray<number | undefined>(),
        uniq(),
      );
      expect(xs).toEqual([undefined, 1, undefined, 3, 1, 3]);
    });
  });
  describe("filter", () => {
    const xs = fromIter([1, 2, 3])(toArray<number>(), filter(odd));
    it("should keep values satisfying predicate", () => {
      expect(xs).toEqual([1, 3]);
    });
  });
  describe("replace", () => {
    const xs = fromIter([2, 3, 4])(
      toArray<number>(),
      replace(odd, 2 as number),
    );
    it("should replace values satisfying predicate", () => {
      expect(xs).toEqual([2, 2, 4]);
    });
  });
  describe("apertures", () => {
    const xs = fromIter([1, 2, 3])(toArray<number[]>(), apertures(2));
    it("should return sliding windows of length n", () => {
      expect(xs).toEqual([
        [1, 2],
        [2, 3],
      ]);
    });
  });
  describe("slices", () => {
    it("should return consecutive slices of length n, leaving out extra values", () => {
      const xs = fromIter([1, 2, 3, 4, 5])(toArray<number[]>(), slices(2));
      expect(xs).toEqual([
        [1, 2],
        [3, 4],
      ]);
    });
  });
  describe("fold", () => {
    it("should replace list with folded values", () => {
      const xs = fromIter([1, 2, 3])(
        toArray<number>(),
        fold((a: number, b: number) => a + b, 1),
      );
      expect(xs).toEqual([2, 4, 7]);
    });
  });
  describe("map", () => {
    it("should map values with function", () => {
      const f = (x: number) => x * 2;
      const xs = fromIter([1, 2, 3])(toArray<number>(), map(f));
      expect(xs).toEqual([2, 4, 6]);
    });
  });
  describe("flatten", () => {
    it("should flatten once", () => {
      const xs = fromIter([
        [1, 2, 3],
        [4, 5],
      ])(toArray<number>(), flatten(iterColl(), map(mul(2))));
      expect(xs).toEqual([2, 4, 6, 8, 10]);
    });
    it("should flatten twice", () => {
      const xs = fromIter([[[1, 2, 3]]])(
        toArray<number>(),
        pipe(flatten(iterColl()), flatten(iterColl())),
      );
      expect(xs).toEqual([1, 2, 3]);
    });
    it("should flatten then map", () => {
      const xs = fromIter([[1, 2, 3]])(
        toArray<number>(),
        pipe(map(mul(2)), flatten(iterColl())),
      );
      expect(xs).toEqual([2, 4, 6]);
    });
  });
  describe("chain", () => {
    describe("should flatten a structure", () => {
      function ar(n: number) {
        const a = [];
        for (let i = 0; i < n; i++) {
          a.push(i);
        }
        return a;
      }
      it("using chain", () => {
        const xs = fromIter([1, 2, 3])(
          toArray<number>(),
          chain(iterColl(), ar),
        );
        expect(xs).toEqual([0, 0, 1, 0, 1, 2]);
      });
      it("using map then flatten", () => {
        const xs = fromIter([1, 2, 3])(
          toArray<number>(),
          pipe(flatten(iterColl()), map(ar)),
        );
        expect(xs).toEqual([0, 0, 1, 0, 1, 2]);
      });
    });
  });

  describe("zip", () => {
    it("should zip (transpose) two structures", () => {
      const xs = fromIter([1, 2, 3])(
        toArray<[number, number]>(),
        zip(iterColl(), [4, 5, 6]),
      );
      expect(xs).toEqual([
        [1, 4],
        [2, 5],
        [3, 6],
      ]);
    });
    it("should truncate when first sequence is shorter", () => {
      const xs = fromIter([1, 2])(
        toArray<[number, number]>(),
        zip(iterColl(), [4, 5, 6]),
      );
      expect(xs).toEqual([
        [1, 4],
        [2, 5],
      ]);
    });
    it("should truncate when second sequence is shorter", () => {
      const xs = fromIter([1, 2, 3])(
        toArray<[number, number]>(),
        zip(iterColl(), [4, 5]),
      );
      expect(xs).toEqual([
        [1, 4],
        [2, 5],
      ]);
    });
    it("should zip and take", () => {
      const xs = fromIter([1, 2, 3])(
        toArray<[number, number]>(),
        zip(iterColl(), [4, 5, 6], take(1)),
      );
      expect(xs).toEqual([[1, 4]]);
    });
    it("should zip and take while", () => {
      const xs = fromIter([1, 2, 3])(
        toArray<[number, number]>(),
        zip(
          iterColl(),
          [4, 5, 6],
          takeWhile((x: number) => x < 5),
        ),
      );
      expect(xs).toEqual([[1, 4]]);
    });
  });
});
