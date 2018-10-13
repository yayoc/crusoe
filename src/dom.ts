type DOMText = string;
type NodeType = DOMText | ElementData;
export type AttrMap = { [key: string]: string };

export class ElementData {
  tagName: string;
  attributes: AttrMap;
  constructor(tagName: string, attributes: AttrMap) {
    this.tagName = tagName;
    this.attributes = attributes;
  }
}

export class DOMNode {
  children: DOMNode[];
  nodeType: NodeType;
  constructor(children: DOMNode[], nodeType: NodeType) {
    this.children = children;
    this.nodeType = nodeType;
  }
}

export function text(data: string): DOMNode {
  return new DOMNode([], data);
}

export function elem(
  name: string,
  attrs: AttrMap,
  children: DOMNode[]
): DOMNode {
  return new DOMNode(children, new ElementData(name, attrs));
}
