

var Zone = Backbone.Collection.extend({
    model: Card,
    localStorage: new Store("mtghordesurvival"),

    initialize: function(){
        this.name = null;
        this._order = [];
    },

    chooseRandom: function() {
        var idx = Math.round(Math.random() * this.length);
        if (!this.models[idx]) {
            console.log('[ERROR]: ', idx, this.length);
            return this.chooseRandom();
        }
        return this.models[idx];
    },

    setName: function(name) {
        this.name = name;
        return this;
    },

    getName: function() {
        return this.name;
    },

    shuffle: function(){
        var self = this;

        var oldOrder = this._order;
        this._order = [];
        this.each(function(card) {
            self._order.push(card.cid);
            self._order = d3.shuffle(self._order);
        });
        var newOrder = this._order;

        return new GameAction(
            "Shuffle " + this.getName(),
            function(callback) {
                self._order = newOrder;
                callback && callback();
            },
            function(callback) {
                self._order = oldOrder;
                callback && callback();
            }
        );
    },

    addTop: function(card){
        var self = this;
        var oldOrder = this._order;
        var action = card.moveTo(this);
        return new GameAction(
            "Add " + card.getName() + " to top of " + this.getName(),
            function(callback) {
                action.do();
                self._order.unshift(card.cid);
                callback && callback();
            },
            function(callback) {
                action.undo();
                self._order = oldOrder;
                callback && callback();
            }
        );
    },

    addBottom: function(card){
        var self = this;
        var oldOrder = this._order;
        var action = card.moveTo(this);
        return new GameAction(
            "Add " + card.getName() + " to bottom of " + this.getName(),
            function(callback) {
                action.do();
                self._order.push(card.cid);
                callback && callback();
            },
            function(callback) {
                action.undo();
                self._order = oldOrder;
                callback && callback();
            }
        );
    },

    draw: function(zone){
        if (0 == this.length) return null;
        var card;
        while (!card) {
            var cid = this._order.shift();
            card = this.get(cid);
        }
        zone && player.addGameAction(card.moveTo(zone));
        return card;
    }
});
