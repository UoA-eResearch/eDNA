const sum = require("./sum");

const plot = require("../src/plot");

test("adds 1 + 2 to equal 3", () => {
  expect(sum(1, 2)).toBe(3);
});
