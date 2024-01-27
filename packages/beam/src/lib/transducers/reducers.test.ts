import { pipe } from "ramda";
import {
  apertures,
  drop,
  dropWhile,
  filter,
  find,
  scan,
  map,
  replace,
  slices,
  take,
  takeWhile,
  uniq,
  zip,
  join,
  chain,
} from "./reducers";
import { toArray, fromIter, iterColl } from "./transformers";
import { fc } from "@fast-check/vitest";

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
  });
  describe("map", () => {
    test("should map", () => {
      fc.assert(
        fc.property(fc.integer(), fc.array(fc.integer()), (n, xs) => {
          const f = (x: number) => x * n;
          expect(fromIter(xs)(toArray(), map(f))).toEqual(xs.map(f));
        }),
      );
    });
  });
  describe("take", () => {
    it("should take", () => {
      fc.assert(
        fc.property(fc.nat({ max: 5 }), fc.array(fc.integer()), (n, data) => {
          const xs = fromIter(data)(toArray<number>(), take(n));
          const n0 = Math.min(n, data.length);
          expect(xs).toHaveLength(n0);
          for (let i = 0; i < n0; i++) {
            expect(xs[i]).toBe(data[i]);
          }
        }),
      );
    });
  });
  describe("drop", () => {
    it("should drop", () => {
      fc.assert(
        fc.property(fc.nat({ max: 5 }), fc.array(fc.integer()), (n, data) => {
          const xs = fromIter(data)(toArray<number>(), drop(n));
          const n0 = Math.min(n, data.length);
          expect(xs).toHaveLength(data.length - n0);
          for (let i = 0; i < n0; i++) {
            expect(xs[i]).toBe(data[n0 + i]);
          }
        }),
      );
    });
  });
  describe("find", () => {
    it("should takeWhile pred is true", () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 5 }),
          fc.array(fc.nat({ max: 5 })),
          (n, data) => {
            const pred = (x: number) => x === n;
            const xs = fromIter(data)(toArray<number>(), find(pred));
            const index = data.findIndex(pred);
            if (index === -1) expect(xs).toEqual([]);
            else expect(xs).toEqual([n]);
          },
        ),
      );
    });
  });
  describe("takeWhile", () => {
    it("should takeWhile pred is true", () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 5 }),
          fc.array(fc.nat({ max: 5 })),
          (n, data) => {
            const pred = (x: number) => x !== n;
            const xs = fromIter(data)(toArray<number>(), takeWhile(pred));
            const index = data.findIndex((x) => !pred(x));
            const n_ = index === -1 ? data.length : index;
            expect(xs).toHaveLength(n_);
            for (let i = 0; i < n_; i++) {
              expect(xs[i]).toBe(data[i]);
            }
          },
        ),
      );
    });
  });
  describe("dropWhile", () => {
    it("should dropWhile pred is true", () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 5 }),
          fc.array(fc.nat({ max: 5 })),
          (n, data) => {
            const pred = (x: number) => x !== n;
            const xs = fromIter(data)(toArray<number>(), dropWhile(pred));
            const index = data.findIndex((x) => !pred(x));
            const n_ = index === -1 ? 0 : data.length - index;
            expect(xs).toHaveLength(n_);
            for (let i = 0; i < n_; i++) {
              expect(xs[i]).toBe(data[i + index]);
            }
          },
        ),
      );
    });
  });
  describe("uniq", () => {
    it("should remove consecutive duplicates (including undefined)", () => {
      fc.assert(
        fc.property(
          fc.record({
            num: fc.boolean(),
            times: fc.array(fc.integer({ min: 1, max: 5 })),
          }),
          ({ times, num }) => {
            const expected: (number | undefined)[] = [];
            const duped: (number | undefined)[] = [];
            for (const time of times) {
              num = !num;
              const val = num ? 1 : undefined;
              expected.push(val);
              for (let i = 0; i < time; i++) duped.push(val);
            }
            const xs = fromIter(duped)(toArray<number | undefined>(), uniq());
            expect(xs).toEqual(expected);
          },
        ),
      );
    });
  });
  describe("filter", () => {
    it("should filter", () => {
      fc.assert(
        fc.property(fc.nat({ max: 5 }), fc.array(fc.integer()), (n, xs) => {
          const f = (x: number) => x % n === 0;
          expect(fromIter(xs)(toArray(), filter(f))).toEqual(xs.filter(f));
        }),
      );
    });
  });
  describe("replace", () => {
    it("should replace values satisfying predicate", () => {
      fc.assert(
        fc.property(
          fc.nat({ max: 5 }),
          fc.array(fc.nat({ max: 5 })),
          (n, xs) => {
            expect(
              fromIter(xs)(
                toArray(),
                replace((x) => x === n, 0),
              ),
            ).toEqual(xs.map((x: number) => (x === n ? 0 : x)));
          },
        ),
      );
    });
  });
  describe("apertures", () => {
    it("should return sliding windows of length n", () => {
      fc.assert(
        fc.property(
          fc.record({ n: fc.nat({ max: 5 }), xs: fc.array(fc.integer()) }),
          ({ n, xs }) => {
            if (n === 0) {
              expect(() => {
                fromIter(xs)(toArray<number[]>(), apertures(n));
              }).toThrowError("len must be positive");
              return;
            }
            const actual = fromIter(xs)(toArray<number[]>(), apertures(n));
            for (let i = 0; i + n - 1 < xs.length; ++i)
              for (let j = 0; j < n; ++j) expect(actual[i][j]).toBe(xs[i + j]);
          },
        ),
      );
    });
  });
  describe("slices", () => {
    it("should return consecutive slices of length n, leaving out extra values", () => {
      fc.assert(
        fc.property(
          fc.record({ n: fc.nat({ max: 5 }), xs: fc.array(fc.integer()) }),
          ({ n, xs }) => {
            if (n === 0) {
              expect(() => {
                fromIter(xs)(toArray<number[]>(), slices(n));
              }).toThrowError("len must be positive");
              return;
            }
            const actual = fromIter(xs)(toArray<number[]>(), slices(n));
            let i = 0;
            while (true) {
              const p = Math.floor(i / n);
              if (p * n + n - 1 >= xs.length) break;
              /* if (i + n > xs.length) break; */
              const q = i % n;
              expect(actual[p][q]).toBe(xs[i]);
              i++;
            }
          },
        ),
      );
    });
  });
  describe("scan", () => {
    it("should replace list with folded values", () => {
      fc.assert(
        fc.property(fc.array(fc.integer()), (data) => {
          const sum = (a: number, b: number) => a + b;
          const xs = fromIter(data)(toArray<number>(), scan(sum, 0));
          const zs = data.map((_, i) => data.slice(0, i + 1).reduce(sum, 0));
          expect(xs).toEqual(zs);
        }),
      );
    });
  });
  describe("join", () => {
    it("should flatten on level", () => {
      fc.assert(
        fc.property(fc.array(fc.array(fc.integer())), (data) => {
          const xs = fromIter(data)(toArray<number>(), join(iterColl()));
          const zs = data.flat(1);
          expect(xs).toEqual(zs);
        }),
      );
    });
    it("should flatten two levels", () => {
      fc.assert(
        fc.property(fc.array(fc.array(fc.array(fc.integer()))), (data) => {
          const xs = fromIter(data)(
            toArray<number>(),
            pipe(join(iterColl()), join(iterColl())),
          );
          const zs = data.flat(2);
          expect(xs).toEqual(zs);
        }),
      );
    });
  });
  describe("chain", () => {
    it("should flatten a structure", () => {
      function f(n: number) {
        const a = [];
        for (let i = 0; i < n; i++) {
          a.push(i);
        }
        return a;
      }
      fc.assert(
        fc.property(fc.array(fc.nat({ max: 5 })), (data) => {
          const expected = data.flatMap(f);
          const actual = fromIter(data)(
            toArray<number>(),
            chain(iterColl(), f),
          );
          expect(actual).toEqual(expected);
        }),
      );
    });
  });
  describe("zip", () => {
    it("zip two arrays", () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer()),
          fc.array(fc.integer()),
          (data, ys) => {
            const m = (x: number, y: number) => [x, y] as [number, number];
            const xs = fromIter(ys)(
              toArray<[number, number]>(),
              zip(m, iterColl(), data),
            );
            const n0 = Math.min(data.length, ys.length);
            // should trucate to the shortest
            expect(xs).toHaveLength(n0);
            // should return list of pairs
            for (let i = 0; i < n0; i++) {
              expect(xs[i][0]).toBe(ys[i]);
              expect(xs[i][1]).toBe(data[i]);
            }
          },
        ),
      );
    });
  });
});
