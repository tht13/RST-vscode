'use strict';
import { workspace, window, ExtensionContext, commands,
TextEditor, TextDocumentContentProvider, EventEmitter,
Event, Uri, TextDocumentChangeEvent, ViewColumn,
TextEditorSelectionChangeEvent } from 'vscode';
import { execSync } from 'child_process';
//TODO: for dev only to see members of vscode, remove for memory optimisation
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: ExtensionContext) {

    let previewUri = Uri.parse('rst-preview://authority/rst-preview');

    class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
        private _onDidChange = new EventEmitter<Uri>();
        private resultText = "";

        public provideTextDocumentContent(uri: Uri): string {
            return this.createRstSnippet();
        }

        get onDidChange(): Event<Uri> {
            return this._onDidChange.event;
        }

        public update(uri: Uri) {
            this._onDidChange.fire(uri);
        }

        private createRstSnippet() {
            let editor = window.activeTextEditor;
            if (!(editor.document.languageId === 'rst')) {
                return this.errorSnippet("Active editor doesn't show a RST document - no properties to preview.")
            }
            return this.preview(editor);
        }

        private errorSnippet(error: string): string {
            return `
                <body>
                    ${error}
                </body>`;
        }

        private snippet(properties): string {
            return `<style>
                    #el {
                        ${properties}
                    }
                </style>
                <body>
                    <div>Preview of the rst properties</dev>
                    <hr>
                    <div id="el">Lorem ipsum dolor sit amet, mi et mauris nec ac luctus lorem, proin leo nulla integer metus vestibulum lobortis, eget</div>
                </body>`;
        }
        public preview(): string {
            let doc = window.activeTextEditor.document;
            if (doc.languageId !== 'rst') return;
            let filepath = doc.fileName
            let cmd = "python " + path.join(__dirname, "..", "..", "src", "preview.py") + " " + filepath;
            let previewer = this;
            let execSyncOut = execSync(cmd);
            return execSyncOut.toString();
            previewer.resultText = execSyncOut.toString();
            workspace.openTextDocument(previewUri).then((doc: vscode.TextDocument) => {
                let openDocs = window.visibleTextEditors;
                for (let open of openDocs) {
                    if (open.document.uri == previewUri) {
                        open.edit((editor: vscode.TextEditorEdit) => {
                            let start: vscode.Position = new vscode.Position(0, 0);
                            let end: vscode.Position = new vscode.Position(
                                open.document.lineAt(open.document.lineCount - 1).rangeIncludingLineBreak.end.character,
                                open.document.lineCount - 1);
                            editor.replace(new vscode.Range(start, end), execSyncOut.toString());
                        });
                        break;
                    }
                }
            }, (fail) => {
                console.log(fail);
            });
        }
    }

    let provider = new TextDocumentContentProvider();
    let registration = workspace.registerTextDocumentContentProvider('rst-preview', provider);

    workspace.onDidChangeTextDocument((e: TextDocumentChangeEvent) => {
        if (e.document === window.activeTextEditor.document) {
            provider.update(previewUri);
        }
    });

    window.onDidChangeTextEditorSelection((e: TextEditorSelectionChangeEvent) => {
        if (e.textEditor === window.activeTextEditor) {
            provider.update(previewUri);
        }
    })

    let disposable = commands.registerCommand('rst.preview', () => {
        return commands.executeCommand('vscode.previewHtml', previewUri, ViewColumn.Two).then((success) => {
        }, (reason) => {
            window.showErrorMessage(reason);
        });

    });
    context.subscriptions.push(disposable, registration);
}


// this method is called when your extension is deactivated
export function deactivate() {
}