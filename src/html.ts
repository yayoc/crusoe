import { elem, text, DOMNode, AttrMap } from "./dom";
import * as assert from "assert";

export function parse(source: string): DOMNode {
  let nodes = new Parser(0, source).parseNodes();
  if (nodes.length === 1) {
    return nodes[0];
  }
  return elem("html", {}, nodes);
}

export class Parser {
  pos: number;
  input: string;

  constructor(pos: number, input: string) {
    this.pos = pos;
    this.input = input;
  }

  // Parse a sequence of sibling nodes.
  parseNodes(): DOMNode[] {
    let nodes: DOMNode[] = [];
    while (true) {
      this.consumeWhitespace();
      if (this.eof() || this.startsWith("</")) {
        break;
      }
      nodes.push(this.parseNode());
    }
    return nodes;
  }

  parseNode(): DOMNode {
    if (this.nextChar() === "<") {
      return this.parseElement();
    }
    return this.parseText();
  }

  parseElement(): DOMNode {
    // Opening tag.
    assert(this.consumeChar() === "<", "char should be <");
    const tagName = this.parseTagName();
    const attrs = this.parseAttributes();
    assert(this.consumeChar() === ">", "char should be >");

    // Contentes.
    const children = this.parseNodes();

    // Closing tag.
    assert(this.consumeChar() === "<", "char should be <");
    assert(this.consumeChar() === "/", "char should be /");
    this.parseTagName(); // tagName
    assert(this.consumeChar() === ">", "char should be >");

    return elem(tagName, attrs, children);
  }

  parseText(): DOMNode {
    return text(this.consumeWhile(s => s !== "<"));
  }

  // Consume and discard zero or more whitespace characters.
  consumeWhitespace() {
    this.consumeWhile(s => s === "");
  }

  parseAttr(): [string, string] {
    const name = this.parseTagName();
    assert(this.consumeChar() === "=", "char should be =");
    const value = this.parseAttrValue();
    return [name, value];
  }

  parseAttrValue(): string {
    const openQuote = this.consumeChar();
    const value = this.consumeWhile(s => s !== openQuote);
    return value;
  }

  parseAttributes(): AttrMap {
    let attributes: AttrMap = {};
    while (true) {
      this.consumeWhitespace();
      if (this.nextChar() === ">") {
        break;
      }
      const [name, value] = this.parseAttr();
      attributes[name] = value;
    }
    return attributes;
  }

  // Parse a tag or attribute name.
  parseTagName(): string {
    const regex = /[a-zA-Z0-9]/;
    return this.consumeWhile(s => s.match(regex) !== null);
  }

  // Return the current character, and advance this.pos to the next character.
  consumeChar(): string {
    const currentChar = this.input[this.pos];
    this.pos += 1;
    return currentChar;
  }

  // Consume characters until `test` returns false.
  consumeWhile(test: (str: string) => boolean): string {
    let result: string = "";
    while (!this.eof() && test(this.nextChar())) {
      result += this.consumeChar();
    }
    return result;
  }

  // Read the current character without consuming it.
  private nextChar(): string {
    return this.input[this.pos];
  }

  // Do the next characters start with the given string?
  private startsWith(str: string): boolean {
    return this.input.substring(this.pos, this.input.length).startsWith(str);
  }

  // Return true if all input is consumed.
  private eof(): boolean {
    return this.pos >= this.input.length;
  }
}
