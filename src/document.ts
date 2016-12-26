import {
  workspace, window, commands, TextDocumentContentProvider,
  Event, Uri, TextDocumentChangeEvent, ViewColumn, EventEmitter,
  TextDocument, Disposable
} from "vscode";
import * as path from "path";
import fileUrl = require("file-url");
import { exec } from "child_process";

export class RSTDocumentView {
  private provider: RSTDocumentContentProvider;
  private registrations: Disposable[] = [];
  private previewUri: Uri;
  private doc: TextDocument;

  constructor(document: TextDocument) {
    this.doc = document;
    this.provider = new RSTDocumentContentProvider(this.doc);
    this.registrations.push(workspace.registerTextDocumentContentProvider("rst", this.provider));
    this.previewUri = this.getRSTUri(document.uri);
    this.registerEvents();
  }

  public get uri(): Uri {
    return this.previewUri;
  }



  private getRSTUri(uri: Uri) {
    return uri.with({ scheme: 'rst', path: uri.path + '.rendered', query: uri.toString() });
  }

  private registerEvents() {
    workspace.onDidSaveTextDocument(document => {
      if (this.isRSTFile(document)) {
        const uri = this.getRSTUri(document.uri);
        this.provider.update(uri);
      }
    });

    workspace.onDidChangeTextDocument(event => {
      if (this.isRSTFile(event.document)) {
        const uri = this.getRSTUri(event.document.uri);
        this.provider.update(uri);
      }
    });

    workspace.onDidChangeConfiguration(() => {
      workspace.textDocuments.forEach(document => {
        if (document.uri.scheme === 'rst') {
          // update all generated rst documents
          this.provider.update(document.uri);
        }
      });
    });
    this.registrations.push(workspace.onDidChangeTextDocument((e: TextDocumentChangeEvent) => {
      if (!this.visible) {
        return;
      }
      if (e.document === this.doc) {
        this.provider.update(this.previewUri);
      }
    }));
  }

  private get visible(): boolean {
    for (let editor of window.visibleTextEditors) {
      if (editor.document.uri === this.previewUri) {
        return true;
      }
    }
    return false;
  }

  public execute(column: ViewColumn) {
    commands.executeCommand("vscode.previewHtml", this.previewUri, column, `Preview '${path.basename(this.uri.fsPath)}'`).then((success) => {
    }, (reason) => {
      console.warn(reason);
      window.showErrorMessage(reason);
    });
  }

  public dispose() {
    for (let reg of this.registrations) {
      reg.dispose();
    }
  }

  private isRSTFile(document: TextDocument) {
    return document.languageId === 'rst'
      && document.uri.scheme !== 'rst'; // prevent processing of own documents
  }
}

export class RSTDocumentContentProvider implements TextDocumentContentProvider {
  private _onDidChange = new EventEmitter<Uri>();
  private doc: TextDocument;

  constructor(document: TextDocument) {
    this.doc = document;
  }

  public provideTextDocumentContent(uri: Uri): string | Promise<string> {
    return this.createRSTSnippet();
  }

  get onDidChange(): Event<Uri> {
    return this._onDidChange.event;
  }

  public update(uri: Uri) {
    this._onDidChange.fire(uri);
  }

  private createRSTSnippet(): string | Promise<string> {
    if (this.doc.languageId !== "rst") {
      return RSTDocumentContentProvider.errorSnippet("Active editor doesn't show a RST document - no properties to preview.");
    }
    return this.preview();
  }

  private static errorSnippet(error: string): string {
    return `<body>${error}</body>`;
  }

  private static buildPage(document: string, headerArgs: string[]): string {
    return `<html lang="en">\n<head>\n${headerArgs.join("\n")}\n</head>\n<body>\n${document}\n</body>\n</html>`;
  }

  private static createStylesheet(file: string) {
    let href = fileUrl(
      path.join(
        __dirname,
        "..",
        "..",
        "static",
        file
      )
    );
    return `<link href="${href}" rel="stylesheet" />`;
  }

  private static fixLinks(document: string, documentPath: string): string {
    return document.replace(
      new RegExp("((?:src|href)=[\'\"])((?!http|\\/).*?)([\'\"])", "gmi"),
      (subString: string, p1: string, p2: string, p3: string): string => {
        return [
          p1,
          fileUrl(path.join(
            path.dirname(documentPath),
            p2
          )),
          p3
        ].join("");
      }
    );
  }

  public static compile(fileName: string): Promise<string> {
    return new Promise<string>((resolve, reject) => {
      let cmd = [
        "python",
        path.join(
          __dirname,
          "..",
          "..",
          "src",
          "python",
          "preview.py"
        ),
        fileName
      ].join(" ");
      exec(cmd, (error: Error, stdout: Buffer, stderr: Buffer) => {
        if (error) {
          let errorMessage = [
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
      });
    });
  }

  public async preview(): Promise<string> {
    const html = await RSTDocumentContentProvider.compile(this.doc.fileName);
    let result = RSTDocumentContentProvider.fixLinks(html, this.doc.fileName);
    let headerArgs = [
      RSTDocumentContentProvider.createStylesheet("basic.css"),
      RSTDocumentContentProvider.createStylesheet("default.css")
    ];
    return RSTDocumentContentProvider.buildPage(result, headerArgs);
  }
}
