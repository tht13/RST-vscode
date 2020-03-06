import * as vscode from 'vscode';
import { TextDocument, Uri } from "vscode";
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

  public async compile(fileName: string, uri: Uri): Promise<string> {
    this.logger.log(`Compiling file: ${fileName}`);
    const rstConfig = vscode.workspace.getConfiguration('rst', uri);
    const writer = rstConfig.get<string>('preview.docutilsWriter', 'html');
    return this.python.exec(
      path.join(__dirname, "..", "python", "preview.py"),
      fileName,
      writer
    );
  }

  public async preview(doc: TextDocument): Promise<string> {
    try {
      return this.compile(doc.fileName, doc.uri);
    } catch (e) {
      return this.errorSnippet(e.toString());
    }
  }
}
