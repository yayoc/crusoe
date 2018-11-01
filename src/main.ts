import * as program from "commander";
import * as fs from "fs";
import { parse } from "./html";
import { parse as cssParse } from "./css";
import { styleTree } from "./style";
import { layoutTree, Dimensions, Rect, EdgeSizes } from "./layout";
import { paint } from "./painting";

const readSource = (fileName: string): string => {
  return fs.readFileSync(fileName, "utf8");
};

program
  .version("0.1.0")
  .option("-h", "HTML document")
  .option("-c", "CSS Stylesheet")
  .option("-o", "Output")
  .action(async (htmlFile: string, ...args: string[]) => {
    const stylesheetFile = args[0];
    const outputFile = args[1];
    if (!htmlFile || !stylesheetFile || !outputFile) {
      throw Error("Please specify file names");
    }
    const html = readSource(htmlFile);
    const css = readSource(stylesheetFile);

    // Since we don't have an actual window, hard-code the "viewport" size.

    const defaultEdgeSize = new EdgeSizes(0, 0, 0, 0);
    const initialContentBlock = new Dimensions(
      new Rect(0, 0, 800, 600),
      defaultEdgeSize,
      defaultEdgeSize,
      defaultEdgeSize
    );

    // Parsing and rendering:
    const rootNode = parse(html);
    console.log(rootNode);
    const stylesheet = cssParse(css);
    console.log(stylesheet);

    const styleRoot = styleTree(rootNode, stylesheet);
    console.log(styleRoot);
    const layoutRoot = layoutTree(styleRoot, initialContentBlock);

    const canvas = paint(layoutRoot, initialContentBlock.content);
    console.log(canvas);
  })
  .parse(process.argv);
