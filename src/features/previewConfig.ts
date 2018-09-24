/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export class RSTPreviewConfiguration {
	public static getForResource(resource: vscode.Uri) {
		return new RSTPreviewConfiguration(resource);
	}

	public readonly scrollBeyondLastLine: boolean;
	public readonly wordWrap: boolean;
	public readonly previewFrontMatter: string;
	public readonly lineBreaks: boolean;
	public readonly doubleClickToSwitchToEditor: boolean;
	public readonly scrollEditorWithPreview: boolean;
	public readonly scrollPreviewWithEditor: boolean;
	public readonly markEditorSelection: boolean;

	public readonly styles: string[];

	private constructor(resource: vscode.Uri) {
		const editorConfig = vscode.workspace.getConfiguration('editor', resource);
		const rstConfig = vscode.workspace.getConfiguration('rst', resource);
		const rstEditorConfig = vscode.workspace.getConfiguration('[rst]', resource);

		this.scrollBeyondLastLine = editorConfig.get<boolean>('scrollBeyondLastLine', false);

		this.wordWrap = editorConfig.get<string>('wordWrap', 'off') !== 'off';
		if (rstEditorConfig && rstEditorConfig['editor.wordWrap']) {
			this.wordWrap = rstEditorConfig['editor.wordWrap'] !== 'off';
		}

		this.previewFrontMatter = rstConfig.get<string>('previewFrontMatter', 'hide');
		this.scrollPreviewWithEditor = !!rstConfig.get<boolean>('preview.scrollPreviewWithEditor', true);
		this.scrollEditorWithPreview = !!rstConfig.get<boolean>('preview.scrollEditorWithPreview', true);
		this.lineBreaks = !!rstConfig.get<boolean>('preview.breaks', false);
		this.doubleClickToSwitchToEditor = !!rstConfig.get<boolean>('preview.doubleClickToSwitchToEditor', true);
		this.markEditorSelection = !!rstConfig.get<boolean>('preview.markEditorSelection', true);

		this.styles = rstConfig.get<string[]>('styles', []);
	}

	public isEqualTo(otherConfig: RSTPreviewConfiguration) {
		for (let key in this) {
			if (this.hasOwnProperty(key) && key !== 'styles') {
				if (this[key] !== otherConfig[key]) {
					return false;
				}
			}
		}

		// Check styles
		if (this.styles.length !== otherConfig.styles.length) {
			return false;
		}
		for (let i = 0; i < this.styles.length; ++i) {
			if (this.styles[i] !== otherConfig.styles[i]) {
				return false;
			}
		}

		return true;
	}

	[key: string]: any;
}

export class RSTPreviewConfigurationManager {
	private readonly previewConfigurationsForWorkspaces = new Map<string, RSTPreviewConfiguration>();

	public loadAndCacheConfiguration(
		resource: vscode.Uri
	): RSTPreviewConfiguration {
		const config = RSTPreviewConfiguration.getForResource(resource);
		this.previewConfigurationsForWorkspaces.set(this.getKey(resource), config);
		return config;
	}

	public hasConfigurationChanged(
		resource: vscode.Uri
	): boolean {
		const key = this.getKey(resource);
		const currentConfig = this.previewConfigurationsForWorkspaces.get(key);
		const newConfig = RSTPreviewConfiguration.getForResource(resource);
		return (!currentConfig || !currentConfig.isEqualTo(newConfig));
	}

	private getKey(
		resource: vscode.Uri
	): string {
		const folder = vscode.workspace.getWorkspaceFolder(resource);
		return folder ? folder.uri.toString() : '';
	}
}
