import { LayoutBox, Rect, BlockNode, InlineNode } from "./layout";
import { Color } from "./css";

class SolidColor {
  color: Color;
  rect: Rect;
  constructor(color: Color, rect: Rect) {
    this.color = color;
    this.rect = rect;
  }
}

type DisplayCommand = SolidColor;

type DisplayList = DisplayCommand[];

export function buildDisplayList(layoutRoot: LayoutBox): DisplayList {
  let list = [];
  renderLayoutBox(list, layoutRoot);
  return list;
}

function renderLayoutBox(list: DisplayList, layoutBox: LayoutBox) {
  renderBackground(list, layoutBox);
  renderBorders(list, layoutBox);
  layoutBox.children.forEach(child => renderLayoutBox(list, child));
}

function renderBackground(list: DisplayList, layoutBox: LayoutBox) {
  const color = getColor(layoutBox, "border-color");
  if (!color) return;
  list.push(new SolidColor(color, layoutBox.dimensions.borderBox()));
}

function renderBorders(list: DisplayList, layoutBox: LayoutBox) {
  const color = getColor(layoutBox, "border-color");
  if (!color) return;

  const d = layoutBox.dimensions;
  const borderBox = d.borderBox();

  // Left border
  list.push(
    new SolidColor(
      color,
      new Rect(borderBox.x, borderBox.y, d.border.left, borderBox.height)
    )
  );

  // Right border
  list.push(
    new SolidColor(
      color,
      new Rect(
        borderBox.x + borderBox.width - d.border.right,
        borderBox.y,
        d.border.right,
        borderBox.height
      )
    )
  );

  // Top border
  list.push(
    new SolidColor(
      color,
      new Rect(borderBox.x, borderBox.y, borderBox.width, d.border.top)
    )
  );

  // Bottom border
  list.push(
    new SolidColor(
      color,
      new Rect(
        borderBox.x,
        borderBox.y + borderBox.height - d.border.bottom,
        borderBox.width,
        d.border.bottom
      )
    )
  );
}

function getColor(layoutBox: LayoutBox, name: string): Color | null {
  const { boxType } = layoutBox;
  if (boxType instanceof BlockNode || boxType instanceof InlineNode) {
    const { node } = boxType;
    if (node.value(name) instanceof Color) {
      return node.value(name) as Color;
    }
  }
  return null;
}

class Canvas {
  pixels: Color[];
  width: number;
  height: number;

  constructor(pixels: Color[], width: number, height: number) {
    this.pixels = pixels;
    this.width = width;
    this.height = height;
  }

  static n(width: number, height: number): Canvas {
    const white = new Color(255, 255, 255, 255);
    // return new Canvas([white, width * height], width, height);
    return new Canvas([white], width, height);
  }

  paintItem(item: DisplayCommand) {
    if (item instanceof SolidColor) {
      // Clip the rectangle to the canvas boundaries.
      const { color, rect } = item;
      const x0 = clamp(rect.x)(0, this.width);
      const y0 = clamp(rect.y)(0, this.height);
      const x1 = clamp(rect.x + rect.width)(0, this.width);
      const y1 = clamp(rect.y + rect.height)(0, this.height);

      [y0, y1].forEach(y => {
        [x0, x1].forEach(x => {
          // TODO: alpha compositing with existing pixel
          this.pixels[y * this.width + x] = color;
        });
      });
    }
  }
}

export function paint(layoutRoot: LayoutBox, bounds: Rect): Canvas {
  const displayList = buildDisplayList(layoutRoot);
  let canvas = Canvas.n(bounds.width, bounds.height);
  displayList.forEach(item => canvas.paintItem(item));
  return canvas;
}

const clamp = (target: number) => (lower: number, upper: number): number =>
  Math.min(Math.max(target, lower), upper);
