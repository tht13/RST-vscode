import * as vscode from "vscode";
import { exec, ExecException } from "child_process";

export class Python {
  private static instance: Python;

  private version: 2 | 3 | null = null;
  private pythonPath = vscode.workspace
    .getConfiguration("rst")
    .get<string>("preview.pythonPath", "python");

  public static async getInstance(): Promise<Python> {
    if (!this.instance) {
      this.instance = new Python();
    }
    await this.instance.ready();
    return this.instance;
  }

  private constructor() {}

  private async ready(): Promise<void> {
    await this.getVersion();
    if (!(await this.checkDocutilsInstall())) {
      await this.installDocutils();
    }
  }

  private async installDocutils(): Promise<void> {
    try {
      await this.exec("-m", "pip", "install", "docutils");
    } catch (e) {
      console.log("Failed to install pip");
      vscode.window.showErrorMessage(
        "Could not install docutils. Please run `pip install docutils` to use this " +
          "extension, or check your python path."
      );
    }
  }

  private async checkDocutilsInstall(): Promise<boolean> {
    try {
      await this.exec("-c", '"import docutils;"');
      return true;
    } catch (e) {
      return false;
    }
  }

  private async getVersion(): Promise<void> {
    if (this.version !== null) {
      return;
    }
    const version = await this.exec(
      "-c",
      '"import sys; print(sys.version_info[0])"'
    );
    switch (Number.parseInt(version)) {
      case 2:
        this.version = 2;
        return;
      case 3:
        this.version = 3;
        return;
      default:
        throw new Error("Could not get python version");
    }
  }

  public exec(...args: string[]): Promise<string> {
    const cmd = [this.pythonPath, ...args];
    return new Promise<string>((resolve, reject) => {
      console.log(`Running cmd: python ${args.join(" ")}`);
      exec(
        cmd.join(" "),
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
}
