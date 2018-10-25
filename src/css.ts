// A simple parser for a tiny subset of CSS.

export class Stylesheet {
  rules: Rule[];
  constructor(rules: Rule[]) {
    this.rules = rules;
  }
}

export class Rule {
  selectors: Selector[];
  declarations: Declaration[];
  constructor(selectors: Selector[], declarations: Declaration[]) {
    this.selectors = selectors;
    this.declarations = declarations;
  }
}

export type Selector = SimpleSelector;

export type Specificity = [number, number, number];

export class SimpleSelector {
  tagName: string;
  id: string;
  class: string[];
  constructor(tagName: string, id: string, c: string[]) {
    this.tagName = tagName;
    this.id = id;
    this.class = c;
  }

  specificity(): Specificity {
    // http://www.w3.org/TR/selectors/#specificity
    const a = this.id === "" ? 0 : 1;
    const b = this.class.length;
    const c = this.tagName === "" ? 0 : 1;
    return [a, b, c];
  }
}

class Declaration {
  name: string;
  value: Value;
  constructor(name: string, value: Value) {
    this.name = name;
    this.value = value;
  }
}

export type Value = Keyword | Length | Color;

export class Keyword {
  value: string;
  constructor(value: string) {
    this.value = value;
  }
}

class Length {
  float: number;
  unit: Unit;
  constructor(float: number, unit: Unit) {
    this.float = float;
    this.unit = unit;
  }
}

enum Unit {
  Px = "px"
}

class Color {
  r: number;
  g: number;
  b: number;
  a: number;
  constructor(r: number, g: number, b: number, a: number) {
    this.r = r;
    this.g = g;
    this.b = b;
    this.a = a;
  }
}

// Parse a whole CSS stylesheet.
export function parse(source: string): Stylesheet {
  const parser = new Parser(0, source);
  return new Stylesheet(parser.parseRules());
}

function validIdentifierChar(c: string): boolean {
  if (c.match(/[a-zA-Z0-9\-\_]/)) {
    return true;
  }
  return false;
}

class Parser {
  pos: number;
  input: string;

  constructor(pos: number, input: string) {
    this.pos = pos;
    this.input = input;
  }

  parseRules(): Rule[] {
    let rules: Rule[] = [];
    do {
      this.consumeWhitespace();
      if (this.eof()) break;
      rules.push(this.parseRule());
    } while (true);
    return rules;
  }

  parseRule(): Rule {
    return new Rule(this.parseSelector(), this.parseDeclarations());
  }

  // Parse a comma-separated list of selectors.
  parseSelector(): Selector[] {
    let selectors: Selector[] = [];
    do {
      selectors.push(this.parseSimpleSelector());
      this.consumeWhitespace();
      const nextChar = this.nextChar();
      if (nextChar === ",") {
        this.consumeChar(); // ,
        this.consumeWhitespace();
      } else if (nextChar === "{") {
        break;
      } else {
        // Do panic here
      }
    } while (true);
    // Return selectors with hightest specificity first, for use in matching.
    selectors.sort(
      (a, b) =>
        this.compareSpecificity(a.specificity(), b.specificity()) ? -1 : 1
    );
    return selectors;
  }

  // Return trul when a is more specific.
  private compareSpecificity(a: Specificity, b: Specificity): boolean {
    // TODO:
    a.forEach((aValue, i) => {
      const bValue = b[i];
      if (aValue !== bValue) {
        return aValue > bValue;
      } else {
        return true;
      }
    });
    return true;
  }

  // Parse one simple selector, e.g.: `type#id.class1.class2.class3`
  parseSimpleSelector(): SimpleSelector {
    let selector = new SimpleSelector("", "", []);
    while (!this.eof()) {
      const nextChar = this.nextChar();
      if (nextChar === "#") {
        this.consumeChar();
        selector.id = this.parseIdentifier();
      } else if (nextChar === ".") {
        this.consumeChar();
        selector.class.push(this.parseIdentifier());
      } else if (nextChar === "*") {
        // universal selector
        this.consumeChar();
      } else if (validIdentifierChar(nextChar)) {
        selector.tagName = this.parseIdentifier();
      } else {
        break;
      }
    }
    return selector;
  }

  // Parse a list of declarations enclosed in `{ ... }`.
  parseDeclarations(): Declaration[] {
    this.consumeChar(); // {
    let declarations: Declaration[] = [];
    while (true) {
      this.consumeWhitespace();
      if (this.nextChar() === "}") {
        this.consumeChar(); // }
        break;
      }
      declarations.push(this.parseDeclaration());
    }
    return declarations;
  }

  // Parse one `<property>: <value>;` declaration.
  parseDeclaration(): Declaration {
    const propertyName = this.parseIdentifier();
    this.consumeWhitespace();
    this.consumeChar(); // :
    this.consumeWhitespace();
    const value = this.parseValue();
    this.consumeWhitespace();
    this.consumeChar(); // ;
    return new Declaration(propertyName, value);
  }

  // Methods for parsing values:
  parseValue(): Value {
    const nextChar = this.nextChar();
    if (!nextChar) return new Keyword(this.parseIdentifier());
    if (nextChar.match(/[0-9]/)) {
      return this.parseLength();
    }
    if (nextChar === "#") {
      return this.parseColor();
    }
    return new Keyword(this.parseIdentifier());
  }

  parseLength(): Value {
    return new Length(this.parseFloat(), this.parseUnit());
  }

  parseFloat(): number {
    const c = this.consumeWhile(s => {
      const matches = s.match(/[0-9]/);
      return matches ? matches.length > 0 : false;
    });
    return Number.parseFloat(c);
  }

  parseUnit(): Unit {
    const identifier = this.parseIdentifier().toLowerCase();
    if (identifier === "px") {
      return Unit.Px;
    }
    return "" as never;
  }

  parseColor(): Value {
    this.consumeChar(); // #
    return new Color(
      this.parseHexPair(),
      this.parseHexPair(),
      this.parseHexPair(),
      this.parseHexPair()
    );
  }

  // Parse two hexadecimal digits.
  parseHexPair(): number {
    const s =
      this.input[this.pos] +
      this.input[this.pos + 1] +
      this.input[this.pos + 2];
    this.pos += 2;
    return parseInt(s, 16);
  }

  // Parse a property name or keyword.
  parseIdentifier(): string {
    return this.consumeWhile(validIdentifierChar);
  }

  // Consume and discard zero or more whitespace characters.
  consumeWhitespace() {
    this.consumeWhile(s => s === " " || s === undefined);
  }

  // Consume characters until `test` returns false.
  consumeWhile(test: (str: string) => boolean): string {
    let result: string = "";
    while (true) {
      if (this.eof()) {
        break;
      }
      if (!test(this.nextChar())) {
        const currentChar = this.input[this.pos];
        if (test(currentChar)) {
          result += currentChar;
        }
        break;
      }
      result += this.consumeChar();
    }
    return result;
  }

  // Return the current character, and advance this.pos to the next character.
  consumeChar(): string {
    const currentChar = this.input[this.pos];
    this.pos += 1;
    return currentChar;
  }

  // Return true if all input is consumed.
  private eof(): boolean {
    return this.pos >= this.input.length;
  }

  // Read the current character without consuming it.
  private nextChar(): string {
    return this.input[this.pos + 1];
  }
}
