import { Uri, TextDocument } from "vscode";
import * as path from "path";
import { Python } from "./python";
import { Logger } from "./logger";

export class RSTEngine {
  public constructor(
    private readonly python: Python,
    private readonly logger: Logger
  ) {}

  private errorSnippet(error: string): string {
    return `<html><body>${error}</body></html>`;
  }

  private buildPage(document: string, headerArgs: string[]): string {
    return `<html lang="en">
<head>
${headerArgs.join("\n")}
</head>
<body>
${document}
</body>
</html>`;
  }

  private createStylesheet(file: string): string {
    let href: string = Uri.parse(
      path.join(__dirname, "..", "..", "static", file)
    )
      .with({ scheme: "file" })
      .toString();
    return `<link href="${href}" rel="stylesheet" />`;
  }

  private fixLinks(document: string, documentPath: string): string {
    return document.replace(
      new RegExp("((?:src|href)=['\"])((?!http|\\/).*?)(['\"])", "gmi"),
      (subString: string, p1: string, p2: string, p3: string): string => {
        return [
          p1,
          Uri.parse(path.join(path.dirname(documentPath), p2))
            .with({ scheme: "file" })
            .toString(),
          p3
        ].join("");
      }
    );
  }

  public compile(fileName: string): Promise<string> {
    this.logger.log(`Compiling file: ${fileName}`);
    return this.python.exec(
      path.join(__dirname, "..", "python", "preview.py"),
      fileName
    );
  }

  public async preview(doc: TextDocument): Promise<string> {
    let html: string;
    try {
      html = await this.compile(doc.fileName);
    } catch (e) {
      return this.errorSnippet(e.toString());
    }
    let result: string = this.fixLinks(html, doc.fileName);
    let headerArgs: string[] = [
      this.createStylesheet("basic.css"),
      this.createStylesheet("default.css")
    ];
    return this.buildPage(result, headerArgs);
  }
}
