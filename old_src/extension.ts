"use strict";
import {
  workspace,
  window,
  ExtensionContext,
  commands,
  Uri,
  TextDocumentChangeEvent,
  ViewColumn,
  TextDocument,
  Disposable,
  TextEditor
} from "vscode";
import * as path from "path";
import * as uuid from "node-uuid";
import { RSTDocumentView } from "./document";

let viewManager: ViewManager;
export function activate(context: ExtensionContext): void {
  viewManager = new ViewManager();

  context.subscriptions.push(
    commands.registerCommand("rst.previewToSide", uri =>
      viewManager.preview(uri, true)
    ),
    commands.registerCommand("rst.preview", () => viewManager.preview()),
    commands.registerCommand("rst.source", () => viewManager.source())
  );
}

export function deactivate(): void {
  viewManager.dispose();
}

export class ViewManager {
  private idMap: IDMap = new IDMap();
  private fileMap: Map<string, RSTDocumentView> = new Map<
    string,
    RSTDocumentView
  >();

  private sendRSTCommand(
    displayColumn: ViewColumn,
    doc: TextDocument,
    toggle: boolean = false
  ): void {
    let id: string;
    let rstDoc: RSTDocumentView;
    if (!this.idMap.hasUri(doc.uri)) {
      rstDoc = new RSTDocumentView(doc);
      id = this.idMap.add(doc.uri, rstDoc.uri);
      this.fileMap.set(id, rstDoc);
    } else {
      id = this.idMap.getByUri(doc.uri);
      rstDoc = this.fileMap.get(id);
    }
    rstDoc.execute(displayColumn);
  }

  private getViewColumn(sideBySide: boolean): ViewColumn {
    const active: TextEditor = window.activeTextEditor;
    if (!active) {
      return ViewColumn.One;
    }

    if (!sideBySide) {
      return active.viewColumn;
    }

    switch (active.viewColumn) {
      case ViewColumn.One:
        return ViewColumn.Two;
      case ViewColumn.Two:
        return ViewColumn.Three;
    }

    return active.viewColumn;
  }

  public async source(mdUri?: Uri): Promise<void> {
    if (!mdUri) {
      await commands.executeCommand("workbench.action.navigateBack");
      return;
    }

    const docUri: Uri = Uri.parse(mdUri.query);

    for (let editor of window.visibleTextEditors) {
      if (editor.document.uri.toString() === docUri.toString()) {
        await window.showTextDocument(editor.document, editor.viewColumn);
        return;
      }
    }

    const doc: TextDocument = await workspace.openTextDocument(docUri);
    await window.showTextDocument(doc);
  }

  public async preview(resource?: Uri, sideBySide: boolean = false): Promise<void> {
    if (!(resource instanceof Uri)) {
      if (window.activeTextEditor) {
        // we are relaxed and don't check for markdown files
        resource = window.activeTextEditor.document.uri;
      }
    }

    if (!(resource instanceof Uri)) {
      if (!window.activeTextEditor) {
        // this is most likely toggling the preview
        await commands.executeCommand("rst.source");
        return;
      }
      // nothing found that could be shown or toggled
      return;
    }
    // activeTextEditor does not exist when triggering on a rst preview
    this.sendRSTCommand(
      this.getViewColumn(sideBySide),
      window.activeTextEditor.document
    );
  }

  public dispose(): void {
    for (let doc of this.fileMap.values()) {
      doc.dispose();
    }
  }
}

class IDMap {
  private map: Map<[Uri, Uri], string> = new Map<[Uri, Uri], string>();

  public getByUri(uri: Uri): string {
    for (let key of this.map.keys()) {
      if (key.includes(uri)) {
        return this.map.get(key);
      }
    }
    return null;
  }

  public hasUri(uri: Uri): boolean {
    return this.getByUri(uri) !== null;
  }

  public add(uri1: Uri, uri2: Uri): string {
    let id: string = uuid.v4();
    this.map.set([uri1, uri2], id);
    return id;
  }
}
