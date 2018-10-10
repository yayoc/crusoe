import test from "ava";
import { text, elem, ElementData } from "./dom";

test("text", t => {
  const foo = text("foo");
  t.is(foo.nodeType, "foo");
});

test("elem", t => {
  const attrs = { value: "" };
  const bar = elem("input", attrs, []);
  const expected = new ElementData("input", attrs);
  t.deepEqual(bar.nodeType, expected);
});
