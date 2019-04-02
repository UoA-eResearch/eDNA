import { strongLine, strongHeader } from "../src/utility";

test("strong line working", () => {
  expect(strongLine("test")).toBe("<strong>test</strong><br />");
});

test("strong header working", () => {
  expect(strongHeader("header", "test")).toBe(
    "<strong>header: </strong> test<br />"
  );
});
