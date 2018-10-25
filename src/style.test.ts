import test from "ava";

import { styleTree, StyleNode } from "./style";
import { elem } from "./dom";
import { parse } from "./css";

test("styleTree", t => {
  const attrs = { value: "" };
  const inputElem = elem("input", attrs, []);
  const source =
    "h1, h2, h3 { margin: auto; color: #cc0000; } div.note { margin-bottom: 20px; padding: 10px; } #answer { display: none; }";
  const stylesheet = parse(source);
  const tree = styleTree(inputElem, stylesheet);
  t.true(tree instanceof StyleNode);
});
