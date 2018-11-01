import { StyleNode, Display } from "./style";
import { Keyword, Length, Unit, Value } from "./css";

// CSS box model. All sizes are in px

export class Rect {
  x: number;
  y: number;
  width: number;
  height: number;
  constructor(x: number, y: number, width: number, height: number) {
    this.x = x;
    this.y = y;
    this.width = width;
    this.height = height;
  }

  expandedBy(edge: EdgeSizes): Rect {
    return new Rect(
      this.x - edge.left,
      this.y - edge.top,
      this.width + edge.left + edge.right,
      this.height + edge.top + edge.bottom
    );
  }
}

export class EdgeSizes {
  left: number;
  right: number;
  top: number;
  bottom: number;

  constructor(left: number, right: number, top: number, bottom: number) {
    this.left = left;
    this.right = right;
    this.top = top;
    this.bottom = bottom;
  }
}

export class Dimensions {
  content: Rect;
  padding: EdgeSizes;
  border: EdgeSizes;
  margin: EdgeSizes;

  constructor(
    content: Rect,
    padding: EdgeSizes,
    border: EdgeSizes,
    margin: EdgeSizes
  ) {
    this.content = content;
    this.padding = padding;
    this.border = border;
    this.margin = margin;
  }

  // The area covered by the content area plus its padding.
  paddingBox(): Rect {
    return this.content.expandedBy(this.border);
  }

  // The area covered by the content area plus padding and borders.
  borderBox(): Rect {
    return this.paddingBox().expandedBy(this.border);
  }

  // The area covered by the content area plus padding, borders, and margin.
  marginBox(): Rect {
    return this.borderBox().expandedBy(this.margin);
  }
}

// A node in the layout tree.

export class LayoutBox {
  dimensions: Dimensions;
  boxType: BoxType;
  children: LayoutBox[];

  constructor(dimensions: Dimensions, boxType: BoxType, children: LayoutBox[]) {
    this.dimensions = dimensions;
    this.boxType = boxType;
    this.children = children;
  }

  static n(boxType: BoxType): LayoutBox {
    const defaultEdgeSize = new EdgeSizes(0, 0, 0, 0);
    const dimensions = new Dimensions(
      new Rect(0, 0, 0, 0),
      defaultEdgeSize,
      defaultEdgeSize,
      defaultEdgeSize
    );
    return new LayoutBox(dimensions, boxType, []);
  }

  getStyleNode(): StyleNode {
    if (
      this.boxType instanceof BlockNode ||
      this.boxType instanceof InlineNode
    ) {
      return this.boxType.node;
    }
    throw new Error("Anonymous block box has no style node");
  }

  // Lay out a box and its descendants.
  layout(containingBlock: Dimensions) {
    if (this.boxType) {
      this.layoutBlock(containingBlock);
    } else {
      // TODO
    }
  }

  // Lay out a block-level element and its descendants.
  layoutBlock(containingBlock: Dimensions) {
    // Child width can depend on parent width, so we need to calculate this box's width before
    // laying out its children.
    this.calculateBlockWidth(containingBlock);

    // Determine where the box is located within its container.
    this.calculateBlockPosition(containingBlock);

    // Recursively lay out the children of this box.
    this.layoutBlockChildren();

    // Parent height can depend on child height, so `calculate_height` must be called after the
    // children are laid out.
    this.calculateBlockHeight();
  }

  // Calculate the width of a block-level non-replaced element in normal flow.
  // http://www.w3.org/TR/CSS2/visudet.html#blockwidth
  // Sets the horizontal margin/padding/border dimensions, and the `width`.

  calculateBlockWidth(containingBlock: Dimensions) {
    const style = this.getStyleNode();

    // `width` has initial value `auto`.
    const auto = new Keyword("auto");
    let width = style.value("width");

    // margin, border, and padding have initial value 0.
    const zero = new Length(0.0, Unit.Px);

    let marginLeft = style.lookup("margin-left", "margin", zero);
    let marginRight = style.lookup("margin-right", "margin", zero);

    let borderLeft = style.lookup("border-left-width", "border-width", zero);
    let borderRight = style.lookup("border-right-width", "border-width", zero);

    let paddingLeft = style.lookup("padding-left", "padding", zero);
    let paddingRight = style.lookup("padding-right", "padding", zero);

    let total = sum(
      marginLeft,
      marginRight,
      borderLeft,
      borderRight,
      paddingLeft,
      paddingRight
    );

    // If width is not auto and the total is wider than the container, treat auto margins as 0.
    if (width !== auto && total > containingBlock.content.width) {
      if (marginLeft === auto) {
        marginLeft = new Length(0, Unit.Px);
      }
      if (marginRight === auto) {
        marginRight = new Length(0, Unit.Px);
      }
    }

    // Adjust used values so that the above sum equals `containing_block.width`.
    // Each arm of the `match` should increase the total width by exactly `underflow`,
    // and afterward all values should be absolute lengths in px.

    const underFlow = containingBlock.content.width - total;

    if (width !== auto && marginLeft !== auto && marginRight !== auto) {
      marginRight = new Length(marginRight.toPx() + underFlow, Unit.Px);
    }

    // If exactly one size is auto, its used value follows from the equality.
    if (width !== auto && marginLeft !== auto && marginRight === auto) {
      marginRight = new Length(underFlow, Unit.Px);
    }

    if (width !== auto && marginLeft === auto && marginRight !== auto) {
      marginLeft = new Length(underFlow, Unit.Px);
    }

    // If width is set to auto, any other auto values become 0.
    if (width === auto) {
      if (marginLeft === auto) {
        marginLeft = new Length(0, Unit.Px);
      }
      if (marginRight === auto) {
        marginRight = new Length(0, Unit.Px);
      }
      if (underFlow >= 0.0) {
        // Expand width to fill the underflow.
        width = new Length(underFlow, Unit.Px);
      } else {
        // Width can't be negative. Adjust the right margin instead.
        width = new Length(0, Unit.Px);
        marginRight = new Length(marginRight.toPx() + underFlow, Unit.Px);
      }
    }

    // If margin-left and margin-right are both auto, their used values are equal.
    if (width !== auto && marginLeft == auto && marginRight === auto) {
      marginLeft = new Length(underFlow / 2, Unit.Px);
      marginRight = new Length(underFlow / 2, Unit.Px);
    }

    let d = this.dimensions;
    d.content.width = width.toPx();

    d.padding.left = paddingLeft.toPx();
    d.padding.right = paddingRight.toPx();

    d.border.left = borderLeft.toPx();
    d.border.right = borderRight.toPx();

    d.margin.left = marginLeft.toPx();
    d.margin.right = marginRight.toPx();
  }

  // Finish calculating the block's edge sizes, and position it within its containing block.
  // http://www.w3.org/TR/CSS2/visudet.html#normal-block
  // Sets the vertical margin/padding/border dimensions, and the `x`, `y` values.

  calculateBlockPosition(containingBlock: Dimensions) {
    const style = this.getStyleNode();
    let d = this.dimensions;

    // margin, border, and padding have initial value 0.
    const zero = new Length(0, Unit.Px);

    // If margin-top or margin-bottom is `auto`, the used value is zero.
    d.margin.top = style.lookup("margin-top", "margin", zero).toPx();
    d.margin.bottom = style.lookup("margin-bottom", "margin", zero).toPx();

    d.border.top = style
      .lookup("border-top-width", "border-width", zero)
      .toPx();
    d.border.bottom = style
      .lookup("border-bottom-width", "border-width", zero)
      .toPx();

    d.padding.top = style.lookup("padding-top", "padding", zero).toPx();
    d.padding.top = style.lookup("padding-bottom", "padding", zero).toPx();

    d.content.x =
      containingBlock.content.x +
      d.margin.left +
      d.border.left +
      d.padding.left;

    // Position the box below all the previous boxes in the container.
    d.content.y =
      containingBlock.content.height +
      containingBlock.content.y +
      d.margin.top +
      d.border.top +
      d.padding.top;
  }

  // Lay out the block's children within its content area.
  // Sets `self.dimensions.height` to the total content height.

  layoutBlockChildren() {
    let d = this.dimensions;
    this.children.forEach(c => {
      c.layout(d);
      // Increment the height so each child is laid out below the previous one.
      d.content.height = d.content.height + c.dimensions.marginBox().height;
    });
  }

  // Height of a block-level non-replaced element in normal flow with overflow visible.
  calculateBlockHeight() {
    const height = this.getStyleNode().value("height");
    if (height) {
      this.dimensions.content.height = height.toPx();
    }
  }

  // Where a new inline child should go.
  getInlineContainer(): LayoutBox {
    if (
      this.boxType instanceof InlineNode ||
      this.boxType instanceof AnonymousBlock
    ) {
      return this;
    } else {
      // If we've just generated an anonymous block box, keep using it.
      // Otherwise, create a new one.
      if (this.children.length) {
        const defaultEdgeSize = new EdgeSizes(0, 0, 0, 0);
        const dimensions = new Dimensions(
          new Rect(0, 0, 0, 0),
          defaultEdgeSize,
          defaultEdgeSize,
          defaultEdgeSize
        );
        this.children.push(new LayoutBox(dimensions, new AnonymousBlock(), []));
      }
      return this.children[this.children.length - 1];
    }
  }
}

export class BlockNode {
  node: StyleNode;
  constructor(node: StyleNode) {
    this.node = node;
  }
}
export class InlineNode {
  node: StyleNode;
  constructor(node: StyleNode) {
    this.node = node;
  }
}
class AnonymousBlock {}

type BoxType = BlockNode | InlineNode | AnonymousBlock;

// Transform a style tree into a layout tree.
export function layoutTree(
  node: StyleNode,
  containingBlock: Dimensions
): LayoutBox {
  // The layout algorithm expects the container height to start at 0.
  // TODO: Save the initial containing block height, for calculating percent heights.
  containingBlock.content.height = 0;
  let rootBox = buildLayoutTree(node);
  rootBox.layout(containingBlock);
  return rootBox;
}

// Build the tree of LayoutBoxes, but don't perform any layout calculations yet.
function buildLayoutTree(styleNode: StyleNode): LayoutBox {
  // Create the root box.
  let root: LayoutBox;
  const defaultEdgeSize = new EdgeSizes(0, 0, 0, 0);
  const dimensions = new Dimensions(
    new Rect(0, 0, 0, 0),
    defaultEdgeSize,
    defaultEdgeSize,
    defaultEdgeSize
  );
  if (styleNode.display() === Display.Block) {
    root = new LayoutBox(dimensions, new BlockNode(styleNode), []);
  } else if (styleNode.display() === Display.Inline) {
    root = new LayoutBox(dimensions, new InlineNode(styleNode), []);
  } else {
    throw new Error("Root node has display: none.");
  }

  styleNode.children.forEach(child => {
    if (child.display() === Display.Block) {
      root.children.push(buildLayoutTree(child));
    } else if (child.display() === Display.Inline) {
      root.getInlineContainer().children.push(buildLayoutTree(child));
    }
  });
  return root;
}

function sum(...args: Value[]): number {
  return args.reduce((acc: number, v: Value) => {
    acc += v.toPx();
    return acc;
  }, 0);
}
