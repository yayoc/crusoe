import test from "ava";
import { parse, Stylesheet } from "./css";

test("parse", t => {
  const source =
    "h1, h2, h3 { margin: auto; color: #cc0000; } div.note { margin-bottom: 20px; padding: 10px; } #answer { display: none; }";
  const stylesheet = parse(source);
  t.true(stylesheet instanceof Stylesheet);
});
