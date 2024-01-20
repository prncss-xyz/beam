import { map } from "./reducers";
import { iterColl } from "./transformers";
import { transformIterator } from "./utils";

const mul = (x: number) => (y: number) => x * y;

describe("utils", () => {
  describe("transformIterator", () => {
    it("should iterate", () => {
      const xs: number[] = [];
      for (const x of transformIterator(
        iterColl<number>(),
        [1, 2, 3],
      )<number>(map(mul(2)))) {
        xs.push(x);
      }
      expect(xs).toEqual([2, 4, 6]);
    });
  });
});
