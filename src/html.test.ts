import test from "ava";
import { parse } from "./html";
import { DOMNode } from "./dom";

const source = "<html><body>Hello, world</body></html>";
test("parse", t => {
  const elem = parse(source);
  t.true(elem instanceof DOMNode);
});
