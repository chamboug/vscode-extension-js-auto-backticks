const vscode = require("vscode");
const { tsquery } = require("@phenomnomnominal/tsquery");

module.exports = class EventsWatcher {
    constructor(context) {
        this.context = context;
        // Preferred quotes when reverting backticks in "auto" mode
        this.lastStandardQuoteReverted = "'";
    }
    run = () => {
        vscode.workspace.onDidChangeTextDocument(
            (event) => {
                const editor = vscode.window.activeTextEditor;
                if (!editor) {
                    return;
                }

                if (!this.shouldCheckForBackticks(event.document, event.contentChanges)) {
                    return;
                }

                const changeStart = event.contentChanges[0].range.start;
                const lineIndex = changeStart.line;
                const line = event.document.lineAt(lineIndex);
                const addedText = event.contentChanges[0].text;

                try {
                    if (this.shouldRevertToQuotes(addedText)) {
                        const ast = tsquery.ast(line.text);
                        // Template Strings that contains ${} elements are marked as TemplateExpression
                        // Otherwise, they are marked as NoSubstitutionTemplateLiteral
                        const stringShouldRevertToQuotes = !tsquery(
                            ast,
                            `TemplateExpression[pos<${changeStart.character}][end>${changeStart.character}]`
                        )?.[0];
                        if (stringShouldRevertToQuotes) {
                            const strAst = tsquery(
                                ast,
                                `NoSubstitutionTemplateLiteral[pos<${changeStart.character}][end>${changeStart.character}]`
                            )?.[0];

                            if (!strAst) {
                                return;
                            }

                            const [firstQuoteRange, lastQuoteRange] = this.getStringRanges(
                                strAst.pos,
                                strAst.end,
                                lineIndex,
                                line.text,
                                ["`"]
                            );

                            let quoteMark = "";
                            switch (this.getUserPreferences().preferredStandardQuotes) {
                                case "auto":
                                    quoteMark = this.lastStandardQuoteReverted;
                                    break;
                                case "single":
                                    quoteMark = "'";
                                    break;
                                case "double":
                                    quoteMark = '"';
                                    break;
                                default:
                                    quoteMark = this.lastStandardQuoteReverted;
                            }

                            editor.edit((editBuilder) => {
                                [firstQuoteRange, lastQuoteRange].forEach((range) => {
                                    editBuilder.replace(range, quoteMark);
                                });
                            });
                        }
                    } else if (this.shouldTurnIntoTemplateString(addedText, line, changeStart)) {
                        const ast = tsquery.ast(line.text);
                        const wrappingString = tsquery(
                            ast,
                            `StringLiteral[pos<${changeStart.character}][end>${changeStart.character}]`
                        )?.[0];

                        if (!wrappingString) {
                            return;
                        }

                        const quoteBeforeSwitch = line.text.charAt(wrappingString.end - 1);
                        if (['"', "'"].includes(quoteBeforeSwitch)) {
                            this.lastStandardQuoteReverted = quoteBeforeSwitch;
                        }

                        const [firstQuoteRange, lastQuoteRange] = this.getStringRanges(
                            wrappingString.pos,
                            wrappingString.end,
                            lineIndex,
                            line.text,
                            ['"', "'"]
                        );

                        editor
                            .edit((editBuilder) => {
                                [firstQuoteRange, lastQuoteRange].forEach((range) => {
                                    editBuilder.replace(range, "`");
                                });
                                if (!addedText.includes("}")) {
                                    editBuilder.insert(new vscode.Position(lineIndex, changeStart.character + 1), "}");
                                }
                            })
                            .then(() => {
                                let characterIndex = changeStart.character;
                                /**
                                 * In case VSCode automatically adds a closing bracket, the cursor must be placed between
                                 * brackets, so adding addedText.length would not work.
                                 */
                                if (addedText === "{}") {
                                    characterIndex += 1;
                                } else {
                                    characterIndex += addedText.length;
                                }

                                const newPosition = new vscode.Position(changeStart.line, characterIndex);
                                const newSelection = new vscode.Selection(newPosition, newPosition);
                                editor.selection = newSelection;
                            });
                    }
                } catch (err) {
                    console.error(err);
                    // silent fail
                }
            },
            null,
            this.context.subscriptions
        );
    };

    /**
     * Determine whether or not current changes should trigger quotes check.
     * @param {vscode.TextDocument} document
     * @param {vscode.TextDocumentContentChangeEvent[]} contentChanges
     * @returns {boolean}
     */
    shouldCheckForBackticks(document, contentChanges) {
        if (!["javascript", "typescript", "vue", "javascriptreact", "typescriptreact"].includes(document.languageId)) {
            return false;
        }
        if (!document.isDirty || document.isClosed) {
            // Only work with open and dirty editors
            return false;
        }
        if (contentChanges.length === 0) {
            // If no changes, then return
            return false;
        }
        return true;
    }

    /**
     * Determine whether or not current changes should trigger quotes switch.
     * @param {string} addedText
     * @returns {boolean}
     */
    shouldRevertToQuotes(addedText) {
        return this.getUserPreferences().revertEnabled && addedText.length === 0;
    }

    /**
     * Determine whether or not current changes should trigger revert to regular quotes.
     * @param {string} addedText
     * @param {vscode.TextLine} line
     * @param {vscode.Position} changeStart
     * @returns {boolean}
     */
    shouldTurnIntoTemplateString(addedText, line, changeStart) {
        if (addedText.length === 0) {
            return false;
        }

        /**
         * VSCode might automatically add a closing bracket, even in non template strings. In that case, addedText
         * will be "{}"
         */
        if (["{", "{}"].some((token) => token === addedText) && line.text.charAt(changeStart.character - 1) === "$") {
            return true;
        }

        if (/\$\{[^\}]*\}/.test(addedText)) {
            return true;
        }

        return false;
    }

    /**
     * Get 1-char ranges of opening and closing quotes/backticks
     * @param {*} startCharIndex First char index (provided by AST)
     * @param {*} endCharIndex Last char index (provided by AST)
     * @param {*} lineIndex Line index
     * @param {*} lineText Line text content
     * @returns
     */
    getStringRanges(startCharIndex, endCharIndex, lineIndex, lineText, stringDelimiters) {
        /**
         * In the following examples, startCharIndex === 9
         * const a ="${"
         * const a = "${"
         * const a =    "${"
         *
         * As spaces are not taken into account, we need to locate the first quote.
         */
        let firstQuotePos = startCharIndex;
        while (stringDelimiters.every((char) => lineText.charAt(firstQuotePos) !== char)) {
            firstQuotePos++;
        }

        const firstQuoteRange = new vscode.Range(
            new vscode.Position(lineIndex, firstQuotePos),
            new vscode.Position(lineIndex, firstQuotePos + 1)
        );
        const lastQuoteRange = new vscode.Range(
            new vscode.Position(lineIndex, endCharIndex - 1),
            new vscode.Position(lineIndex, endCharIndex)
        );

        return [firstQuoteRange, lastQuoteRange];
    }

    /**
     * Get user preferences
     * @returns {{revertEnabled: boolean, preferredStandardQuotes: "auto" | "single" | "double"}}
     */
    getUserPreferences() {
        return vscode.workspace.getConfiguration("js-auto-backticks");
    }
};
