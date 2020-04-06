const vscode = require("vscode");

module.exports = class EventsWatcher {
    constructor(context) {
        this.context = context;
    }
    run = () => {
        vscode.workspace.onDidChangeTextDocument(
            event => {
                if (!this.shouldCheckForBackticks(event.document, event.contentChanges)) {
                    return;
                }

                const lineIndex = event.contentChanges[0].range.start.line;
                const line = event.document.lineAt(lineIndex);
                const lineContent = line.text;
                const regex = /("|')(?<beforeBrace>.*)\$\{(?<afterBrace>.*)("|')/g;
                const regexResult = regex.exec(lineContent);
                if (!regexResult) {
                    return;
                }

                const replaceRange = new vscode.Range(
                    new vscode.Position(lineIndex, regexResult.index),
                    new vscode.Position(lineIndex, regex.lastIndex)
                );

                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return;
                }
                editor.edit(editBuilder => {
                    editBuilder.replace(replaceRange, `\`${regexResult.groups.beforeBrace}\${${regexResult.groups.afterBrace}}\``);
                });
            },
            null,
            this.context.subscriptions
        );
    }
    shouldCheckForBackticks(document, contentChanges) {
        if (!document.isDirty || document.isClosed) { // Only work with open and dirty editors
            return false;
        }
        if (contentChanges.length === 0) { // If no changes, then return
            return false;
        }
        if (contentChanges[0].text !== "{") { // Only the { char will trigger verification
            return false;
        }
        return true;
    }
};
