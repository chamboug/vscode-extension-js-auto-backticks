const vscode = require("vscode");
const { tsquery } = require("@phenomnomnominal/tsquery");

module.exports = class EventsWatcher {
    constructor(context) {
        this.context = context;
    }
    run = () => {
        vscode.workspace.onDidChangeTextDocument(
            (event) => {
                if (!this.shouldCheckForBackticks(event.document, event.contentChanges)) {
                    return;
                }

                const changeStart = event.contentChanges[0].range.start;
                const lineIndex = changeStart.line;
                const line = event.document.lineAt(lineIndex);

                if (line.text.charAt(changeStart.character - 1) !== "$") {
                    return;
                }

                try {
                    const ast = tsquery.ast(line.text);
                    const wrappingString = tsquery(
                        ast,
                        `StringLiteral[pos<${changeStart.character}][end>${changeStart.character}]`
                    )?.[0];

                    if (!wrappingString) {
                        return;
                    }

                    /**
                     * In the following examples, wrappingString.pos === 9
                     * const a ="${"
                     * const a = "${"
                     * const a =    "${"
                     *
                     * As spaces are not taken into account, we need to locate the first quote.
                     */
                    let firstQuotePos = wrappingString.pos;
                    while (['"', "'"].every((char) => line.text.charAt(firstQuotePos) !== char)) {
                        firstQuotePos++;
                    }

                    const firstQuoteRange = new vscode.Range(
                        new vscode.Position(lineIndex, firstQuotePos),
                        new vscode.Position(lineIndex, firstQuotePos + 1)
                    );
                    const lastQuoteRange = new vscode.Range(
                        new vscode.Position(lineIndex, wrappingString.end - 1),
                        new vscode.Position(lineIndex, wrappingString.end)
                    );

                    const editor = vscode.window.activeTextEditor;
                    if (!editor) {
                        return;
                    }

                    editor
                        .edit((editBuilder) => {
                            [firstQuoteRange, lastQuoteRange].forEach((range) => {
                                editBuilder.replace(range, "`");
                            });
                            editBuilder.insert(new vscode.Position(lineIndex, changeStart.character + 1), "}");
                        })
                        .then(() => {
                            const newPosition = new vscode.Position(changeStart.line, changeStart.character + 1);
                            const newSelection = new vscode.Selection(newPosition, newPosition);
                            editor.selection = newSelection;
                        });
                } catch {
                    // silent fail
                }
            },
            null,
            this.context.subscriptions
        );
    };
    shouldCheckForBackticks(document, contentChanges) {
        if (!document.isDirty || document.isClosed) {
            // Only work with open and dirty editors
            return false;
        }
        if (contentChanges.length === 0) {
            // If no changes, then return
            return false;
        }
        if (contentChanges[0].text !== "{") {
            // Only the { char will trigger verification
            return false;
        }
        return true;
    }
};
