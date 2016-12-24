// 
// Note: This example test is leveraging the Mocha test framework.
// Please refer to their documentation on https://mochajs.org/ for help.
//

// The module 'assert' provides assertion methods from node
import * as assert from "assert";

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
import * as vscode from "vscode";
import * as myExtension from "../src/extension";
import { RSTDocumentContentProvider } from "../src/document";
import * as path from "path";
import * as fs from "fs";
import { initialize, closeActiveWindows, openFile, samplePath } from './initialize';

// Defines a Mocha test suite to group tests of similar kind together
suite("Extension Tests", () => {
    suiteSetup(done => {
        initialize().then((a) => {
            done();
        }, done);
    });

    suiteTeardown(done => {
        closeActiveWindows().then(done, done);
    });
    teardown(done => {
        closeActiveWindows().then(done, done);
    });

    // Defines a Mocha unit test
    test("Example 1 open", done => {
        const vm = new myExtension.ViewManager();
        openFile(path.join(samplePath, "example1.rst")).then(editor => {
            vm.preview(editor.document.uri, false);
            done();
        });
    });

    // Defines a Mocha unit test
    test("Example 1 to HTML", done => {
        openFile(path.join(samplePath, "example1.rst")).then(editor => {
            const provider = new RSTDocumentContentProvider(editor.document);
            provider.preview().then(val => {
                fs.readFile(path.join(samplePath, "example1.html"), "utf8", (err, expected) => {
                    assert.equal(val, expected, "Generated HTML does not match expected");
                    done();
                });
            })
        });
    });
});