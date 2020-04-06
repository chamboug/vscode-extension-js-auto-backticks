const EventsWatcher = require("./src/EventsWatcher");

function activate(context) {
    new EventsWatcher(context).run();
}
exports.activate = activate;

function deactivate() {}

module.exports = {
	activate,
	deactivate
}
