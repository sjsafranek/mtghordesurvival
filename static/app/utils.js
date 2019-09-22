

function noop(){}



var GameUtils = {
    selectZoneOptions: function(opts) {
        opts = opts || {}
        var options = {
            title: 'Select zone',
            input: 'select',
            inputOptions: {
                exile: 'exile',
                graveyard: 'graveyard',
                library: 'library',
                hand: 'hand',
                battlefield: 'battlefield'
            },
            inputPlaceholder: 'Select a zone',
            showCancelButton: true
        }

        if (opts.exclude) {
            for (var i=0; i<opts.exclude.length; i++) {
                delete options.inputOptions[opts.exclude[i]];
            }
        }

        return options;
    }
}



var GameAction = function(message, runCallback, undoCallback) {
    this.callbacks = {
        do: runCallback,
        undo: undoCallback
    }
    this.message = message;
}

GameAction.prototype.do = function() {
    this.callbacks.do();
}

GameAction.prototype.undo = function() {
    this.callbacks.undo();
}
