'use strict';
import { window, ExtensionContext, commands, TextEditor } from 'vscode';
import { exec } from 'child_process';
//TODO: for dev only to see members of vscode, remove for memory optimisation
import * as vscode from 'vscode';

export function activate(context: ExtensionContext) {

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = commands.registerCommand('rst.preview', () => {
		// The code you place here will be executed every time your command is executed

		// Display a message box to the user
		window.showInformationMessage('Previewing!');
        let previewer = new RSTPreviewer(window.activeTextEditor);
        previewer.preview();
	});

	context.subscriptions.push(disposable);
}

class RSTPreviewer {
    constructor(private editor: TextEditor) {}
    
    public preview() {
        let doc = this.editor.document;
        let text = doc.getText();
        let cmd = "python preview.py";
        exec(cmd, function(error: Error, stdout: ArrayBuffer, stderr: ArrayBuffer) {
            if (error.toString().length !== 0) {
                console.warn(`[ERROR] Error message: ${error.toString()}`);
                console.warn(`[ERROR] Error output: ${stderr.toString()}`);
            }
        });
    }
}

// this method is called when your extension is deactivated
export function deactivate() {
}