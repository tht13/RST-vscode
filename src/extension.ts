'use strict';
import { workspace, window, ExtensionContext, commands,
TextEditor, TextDocumentContentProvider, EventEmitter,
Event, Uri, TextDocumentChangeEvent, ViewColumn,
TextEditorSelectionChangeEvent,
TextDocument } from 'vscode';
import { exec } from 'child_process';
//TODO: for dev only to see members of vscode, remove for memory optimisation
import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';

export function activate(context: ExtensionContext) {

    let previewUri = Uri.parse('rst-preview://authority/rst-preview');

    class TextDocumentContentProvider implements vscode.TextDocumentContentProvider {
        private _onDidChange = new EventEmitter<Uri>();
        private resultText = "";

        public provideTextDocumentContent(uri: Uri): string | Thenable<string> {
            return this.createRstSnippet();
        }

        get onDidChange(): Event<Uri> {
            return this._onDidChange.event;
        }

        public update(uri: Uri) {
            this._onDidChange.fire(uri);
        }

        private createRstSnippet(): string | Thenable<string> {
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

        public preview(editor: TextEditor): Thenable<string> {
            let doc = editor.document;
            let promise = new Promise<string>(
                (resolve, reject) => {
                    let filepath = doc.fileName
                    let cmd = "python " + path.join(__dirname, "..", "..", "src", "preview.py") + " " + filepath;
                    let previewer = this;
                    exec(cmd, (error: Error, stdout: Buffer, stderr: Buffer) => {
                        if (error) {
                            let errorMessage = [
                                error.name,
                                error.message,
                                error.stack,
                                '',
                                stderr.toString()
                            ].join('\n');
                            reject(errorMessage);
                        } else {
                            resolve(stdout.toString());
                        }
                    });
                }
            );
            return promise
        }
    }

    let provider = new TextDocumentContentProvider();
    let registration = workspace.registerTextDocumentContentProvider('rst-preview', provider);

    workspace.onDidChangeTextDocument((e: TextDocumentChangeEvent) => {
        if (e.document === window.activeTextEditor.document) {
            provider.update(previewUri);
        }
    });
    
    workspace.onDidSaveTextDocument((e: TextDocument) => {
        if (e === window.activeTextEditor.document) {
            provider.update(previewUri);
        }
    });
    
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