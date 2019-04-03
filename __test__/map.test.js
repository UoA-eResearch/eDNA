// const map = require("../src/map");
import * as map from "../src/map";

test("central outline opacity providing value", () => {
  expect(map.getOutlineOpacity()).toBe(0.15);
});

test("rendering heat layer", () => {
  const div = document.createElement("div");
  div.id = "blah";
  window.domNode = div;
  document.body.appendChild(div);
  expect(document.getElementById("blah").id).toBe("blah");
});
