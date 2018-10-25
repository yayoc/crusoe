import { DOMNode, ElementData } from "./dom";
import {
  Value,
  Rule,
  Keyword,
  Stylesheet,
  Selector,
  SimpleSelector,
  Specificity
} from "./css";

type PropertyMap = { [key: string]: Value };

export class StyleNode {
  node: DOMNode;
  specifiedValues: PropertyMap;
  children: StyleNode[];
  constructor(
    node: DOMNode,
    specifiedValues: PropertyMap,
    children: StyleNode[]
  ) {
    this.node = node;
    this.specifiedValues = specifiedValues;
    this.children = children;
  }

  // Return the specified value of a property if it exists, otherwise `None`.
  value(name: string): Value {
    return this.specifiedValues[name];
  }

  // Return the specified value of property name, or property fallbackName. If that doesn't
  // exist, or value default if neither does.
  lookup(name: string, fallbackName: string, def: Value): Value {
    const ret = this.value(name);
    if (ret) return ret;
    const fallback = this.value(fallbackName);
    if (fallback) return fallback;
    return def;
  }

  // The value of the display property ( default to inline )
  display(): Display {
    switch (this.value("display")) {
      case new Keyword(Display.Block):
        return Display.Block;
      case new Keyword(Display.None):
        return Display.None;
      default:
        return Display.Inline;
    }
  }
}

enum Display {
  Inline = "inline",
  Block = "block",
  None = "none"
}

// Apply a stylesheet to an entire DOM tree, returning a StyledNode tree.
// This finds only the specified values at the moment. Eventually it should be extended to find the
// computed values too, including inherited values.
export function styleTree(root: DOMNode, stylesheet: Stylesheet): StyleNode {
  const values =
    root.nodeType instanceof ElementData
      ? specifiedValues(root.nodeType as ElementData, stylesheet)
      : {};
  return new StyleNode(
    root,
    values,
    root.children.map(c => styleTree(c, stylesheet))
  );
}

function specifiedValues(
  elem: ElementData,
  stylesheet: Stylesheet
): PropertyMap {
  let values: PropertyMap = {};
  let rules = matchingRules(elem, stylesheet);
  // Go through the rules from lowest to highest specificity.
  rules.forEach(rule => {
    const [, r] = rule;
    r.declarations.forEach(declaration => {
      values[declaration.name] = declaration.value;
    });
  });
  return values;
}

type MatchRule = [Specificity, Rule];

// Find all CSS rules that match the given element.
function matchingRules(elem: ElementData, stylesheet: Stylesheet): MatchRule[] {
  return stylesheet.rules.reduce((acc: MatchRule[], rule) => {
    const r = matchRule(elem, rule);
    if (r) {
      acc.push(r);
    }
    return acc;
  }, []);
}

// If `rule` matches `elem`, return a `MatchedRule`. Otherwise return `None`.
function matchRule(elem: ElementData, rule: Rule): MatchRule | null {
  const selector = rule.selectors.find(selector => matches(elem, selector));
  if (selector) {
    return [selector!.specificity(), rule];
  }
  return null;
}

// Selector matching:
function matches(elem: ElementData, selector: Selector): boolean {
  if (selector instanceof SimpleSelector)
    return matchSimpleSelector(elem, selector);
  // matches only supports simple selector.
  return false;
}

function matchSimpleSelector(elem: ElementData, selector: Selector): boolean {
  // Check type selector
  if (selector.tagName !== elem.tagName) return false;

  // Check ID selector
  // if (selector.id !== elem.id()) return false;

  // Check class selectors
  // let elemClasses = elem.classes()

  return true;
}
