import { Event, Uri, EventEmitter, TextDocument } from "vscode";
import * as path from "path";
import { exec, ExecException } from "child_process";

export class RSTEngine {
  private constructor() {}

  private static errorSnippet(error: string): string {
    return `<html><body>${error}</body></html>`;
  }

  private static buildPage(document: string, headerArgs: string[]): string {
    return `<html lang="en">\n<head>\n${headerArgs.join(
      "\n"
    )}\n</head>\n<body>\n${document}\n</body>\n</html>`;
  }

  private static createStylesheet(file: string): string {
    let href: string = Uri.parse(
      path.join(__dirname, "..", "..", "static", file)
    )
      .with({ scheme: "file" })
      .toString();
    return `<link href="${href}" rel="stylesheet" />`;
  }

  private static fixLinks(document: string, documentPath: string): string {
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

  public static compile(fileName: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let cmd: string = [
        "python",
        path.join(__dirname, "..", "python", "preview.py"),
        fileName
      ].join(" ");
      exec(
        cmd,
        (error: ExecException | null, stdout: string, stderr: string) => {
          if (error) {
            let errorMessage: string = [
              error.name,
              error.message,
              error.stack,
              "",
              stderr.toString()
            ].join("\n");
            console.error(errorMessage);
            reject(errorMessage);
          } else {
            resolve(stdout.toString());
          }
        }
      );
    });
  }

  public static async preview(doc: TextDocument): Promise<string> {
    let html: string;
    try {
      html = await RSTEngine.compile(doc.fileName);
    } catch (e) {
      return RSTEngine.errorSnippet(e.toString());
    }
    let result: string = RSTEngine.fixLinks(html, doc.fileName);
    let headerArgs: string[] = [
      RSTEngine.createStylesheet("basic.css"),
      RSTEngine.createStylesheet("default.css")
    ];
    return RSTEngine.buildPage(result, headerArgs);
  }
}
