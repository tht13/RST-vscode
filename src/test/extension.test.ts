// 
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import * as myExtension from "../extension";
import { RSTEngine } from "../rstEngine";
import * as path from "path";
import * as fs from "fs";
import { initialize, closeActiveWindows, openFile, samplePath } from './initialize';
import { Python } from '../python';
import { Logger, Trace } from '../logger';

// Defines a Mocha test suite to group tests of similar kind together
let engine: RSTEngine;
let python: Python;
let logger: Logger = {
    log: (msg: string) => void 0,
    updateConfiguration: () => void 0
} as any;
suite("Extension Tests", () => {
    
    suiteSetup(async done => {
        await initialize();
        python = new Python(logger);
        await python.awaitReady();
        engine = new RSTEngine(python, logger);
        done();
    });

    suiteTeardown(done => {
        closeActiveWindows().then(done, done);
    });
    teardown(done => {
        closeActiveWindows().then(done, done);
    });

    // Defines a Mocha unit test
    // test("Example 1 open", done => {
        // const vm = new myExtension.ViewManager();
    //     openFile(path.join(samplePath, "example1.rst")).then(editor => {
    //         vm.preview(editor.document.uri, false);
    //         done();
    //     });
    // });

    // Defines a Mocha unit test
    test("Example 1 full preview", done => {
        openFile(path.join(samplePath, "example1.rst")).then(editor => {
            engine.preview(editor.document).then(val => {
                fs.readFile(path.join(samplePath, "example1Full.html"), "utf8", (err, expected) => {
                    assert.equal(val, expected, "Generated HTML does not match expected");
                    done();
                });
            });
        });
    });

    // Defines a Mocha unit test
    test("Example 1 to HTML", done => {
        engine.compile(path.join(samplePath, "example1.rst")).then(val => {
            fs.readFile(path.join(samplePath, "example1.html"), "utf8", (err, expected) => {
                assert.equal(val, expected, "Generated HTML does not match expected");
                done();
            });
        });
    });
});