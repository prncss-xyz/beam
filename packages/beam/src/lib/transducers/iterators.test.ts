import { map, take, id, takeWhile } from "./reducers";
import { iterColl } from "./transformers";
import { transformIterator } from "./iterators";
import { fc } from "@fast-check/vitest";

describe("iterators", () => {
  describe("transformIterator", () => {
    it("should iterate", () => {
      fc.assert(
        fc.property(fc.array(fc.integer()), (data) => {
          const xs: number[] = [];
          for (const x of transformIterator(
            iterColl<number>(),
            data,
          )<number>(id())) {
            xs.push(x);
          }
          expect(xs).toEqual(data);
        }),
      );
    });
    it("should iterate, and stop(close)", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }).chain((max) =>
            fc.record({
              n: fc.integer({ min: 1, max }),
              data: fc.array(fc.integer(), { minLength: max + 1 }),
            }),
          ),
          ({ n, data }) => {
            const xs: number[] = [];
            for (const x of transformIterator(
              iterColl<number>(),
              data,
            )<number>(take(n))) {
              xs.push(x);
            }
            expect(xs).toEqual(data.slice(0, n));
          },
        ),
      );
    });
    it("should iterate, and stop(cut)", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }).chain((max) =>
            fc.record({
              n: fc.integer({ min: 1, max }),
              data: fc.array(fc.integer(), { minLength: max + 1 }),
            }),
          ),
          ({ n, data }) => {
            let i = 0;
            const check = (_x: number) => {
              i++;
              return i <= n;
            };
            const xs: number[] = [];
            for (const x of transformIterator(
              iterColl<number>(),
              data,
            )<number>(takeWhile(check))) {
              xs.push(x);
            }
            expect(xs).toEqual(data.slice(0, n));
          },
        ),
      );
    });
    it("should iterate, and fail", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: 5 }).chain((max) =>
            fc.record({
              n: fc.integer({ min: 1, max }),
              data: fc.array(fc.integer(), { minLength: max }),
            }),
          ),
          ({ n, data }) => {
            let i = 0;
            const fail = () => {
              i++;
              if (i === n) throw "failure";
            };
            expect(() => {
              for (const _x of transformIterator(
                iterColl<number>(),
                data,
                // eslint-disable-next-line no-empty
              )<void>(map(fail))) {
              }
            }).toThrowError("failure");
          },
        ),
      );
    });
  });
});
