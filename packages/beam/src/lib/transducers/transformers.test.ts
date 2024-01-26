import { fc } from "@fast-check/vitest";
import {
  IXForm,
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
import { Op, id } from "./reducers";

function identityLaw<T>(arb: fc.Arbitrary<T>, f: (data: T) => T) {
  it("should respect the identity law", () => {
    fc.assert(
      fc.property(arb, (data) => {
        expect(f(data)).toEqual(data);
      }),
    );
  });
}

function zeroLaw<A, T>(
  zero: A,
  f: (init: A) => <A, B, C>(form: IXForm<A, B, C>, op: Op<A, B, T>) => C,
) {
  it("should have a zero element", () => {
    expect(f(zero)(toArray(), id())).toEqual([]);
  });
}

function arbMap<K, V>(key: fc.Arbitrary<K>, value: fc.Arbitrary<V>) {
  return fc
    .uniqueArray(fc.tuple(key, value), {
      selector: (x) => x[0],
    })
    .map((data) => new Map(data));
}

describe("reducers", () => {
  describe("fromArray", () => {
    identityLaw(fc.array(fc.integer()), (data) =>
      fromArray(data)(toArray<number>(), id()),
    );
    zeroLaw([], fromArray);
  });
  describe("fromIter", () => {
    identityLaw(fc.array(fc.integer()), (data) =>
      fromIter(data)(toArray<number>(), id()),
    );
    zeroLaw([], fromIter);
  });
  describe("mapForm", () => {
    identityLaw(arbMap(fc.integer(), fc.integer()), (data) =>
      fromIter(data)(toMap<number, number>(), id()),
    );
    zeroLaw(new Map(), fromIter);
  });
  describe("last", () => {
    it("should return the last value", () => {
      fc.assert(
        fc.property(fc.array(fc.integer()), (data) => {
          const x = fromIter(data)(toLast<number>(), id());
          expect(x).toEqual(data.at(-1));
        }),
      );
    });
  });
  describe("sumForm", () => {
    it("should return the sum of elements", () => {
      fc.assert(
        fc.property(fc.array(fc.integer()), (data) => {
          const x = fromIter(data)(toSum(), id());
          const r = data.reduce((a, b) => a + b, 0);
          expect(x).toBe(r);
        }),
      );
    });
    identityLaw(fc.integer(), (data) => fromSum(data)(toSum(), id()));
    zeroLaw(0, fromSum);
  });
  describe("mulForm", () => {
    it("should return the product of elements", () => {
      fc.assert(
        fc.property(fc.array(fc.integer()), (data) => {
          const x = fromIter(data)(toMul(), id());
          const r = data.reduce((a, b) => a * b, 1);
          expect(x).toBe(r);
        }),
      );
    });
    identityLaw(fc.integer(), (data) => fromMul(data)(toMul(), id()));
    zeroLaw(1, fromMul);
  });
  describe("concatForm", () => {
    it("should return the concatenation of elements", () => {
      fc.assert(
        fc.property(fc.array(fc.string()), (data) => {
          const x = fromIter(data)(toConcat(), id());
          const r = data.reduce((a, b) => a + b, "");
          expect(x).toBe(r);
        }),
      );
    });
    identityLaw(fc.string(), (data) => fromConcat(data)(toConcat(), id()));
    zeroLaw("", fromConcat);
  });
  describe("loopForm", () => {
    it("should loop from value applying step until condition is met", () => {
      fc.assert(
        fc.property(
          fc.record({
            init: fc.integer({ min: 0, max: 10 }),
            step: fc.integer({ min: 1, max: 10 }),
            max: fc.integer({ min: 0, max: 10 }),
          }),
          ({ init, step, max }) => {
            const inc = (x: number) => x + step;
            const cond = (x: number) => x < max;
            const expected: number[] = [];
            for (let i = init; cond(i); i = inc(i)) expected.push(i);
            const actual = fromLoop(cond, inc)(init)(toArray<number>(), id());
            expect(actual).toEqual(expected);
          },
        ),
      );
    });
  });
  describe("rangeForm", () => {
    it("should produce the elements up to value by increment", () => {
      fc.assert(
        fc.property(
          fc.tuple(
            fc.integer({ min: -5, max: 5 }),
            fc.integer({ min: -5, max: 5 }),
            fc.integer({ min: -5, max: 5 }),
          ),
          ([to, step, init]) => {
            if (step === 0) {
              expect(() => {
                fromRange(to, step)(init)(toArray<number>(), id());
              }).toThrowError("step cannot be 0");
              return;
            }
            const xs = fromRange(to, step)(init)(toArray<number>(), id());
            let last: number | undefined;
            for (const x of xs) {
              if (last !== undefined) {
                expect(x - last).toBe(step);
              }
              last = x;
              if (step > 0) {
                expect(x).toBeLessThanOrEqual(to);
                expect(x).toBeGreaterThanOrEqual(init);
              } else {
                expect(x).toBeLessThanOrEqual(init);
                expect(x).toBeGreaterThanOrEqual(to);
              }
            }
            last = last === undefined ? init : last + step;
            if (step > 0) expect(last).toBeGreaterThan(to);
            else expect(last).toBeLessThan(to);
          },
        ),
      );
    });
  });
  describe("forEach", () => {
    it("should call callback for each occurence", () => {
      fc.assert(
        fc.property(fc.uniqueArray(fc.integer()), (data) => {
          const s = new Set(data);
          fromIter(data)(
            forEach<number>((x: number) => s.delete(x)),
            id(),
          );
          expect([...s]).toEqual([]);
        }),
      );
    });
  });
});
