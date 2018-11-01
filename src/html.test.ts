import test from "ava";
import { parse } from "./html";
import { DOMNode, ElementData } from "./dom";

test("parse", t => {
  const source = "<html><body>Hello, world</body></html>";
  const elem = parse(source);
  t.true(elem instanceof DOMNode);
  t.true(elem.nodeType instanceof ElementData);
  t.true((elem.nodeType as ElementData).tagName === "html");
  t.true(elem.children.length === 1);
});

test("parse nested html", t => {
  const source = "<html><body><h1>foo</h1></body></html>";
  const elem = parse(source);
  const body = elem.children[0];
  t.true((body.nodeType as ElementData).tagName === "body");
  const h1 = body.children[0];
  t.true((h1.nodeType as ElementData).tagName === "h1");
});
