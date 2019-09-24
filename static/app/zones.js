

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
        this.add(card);
        this._order.unshift(card.cid);
    },
    addBottom: function(card){
        this.add(card);
        this._order.push(card.cid);
    },
    draw: function(zone){
        if (0 == this.length) return null;
        var card;
        while (!card) {
            var cid = this._order.shift();
            card = this.get(cid);
        }
        zone && card.moveTo(zone);
        return card;
    }
});
