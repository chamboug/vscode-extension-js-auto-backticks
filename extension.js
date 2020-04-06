const EventsWatcher = require("./src/EventsWatcher");

/**
 * @param {vscode.ExtensionContext} context
 */
function activate(context) {
    new EventsWatcher(context).run();
}
exports.activate = activate;

// this method is called when your extension is deactivated
function deactivate() {}

module.exports = {
	activate,
	deactivate
}
