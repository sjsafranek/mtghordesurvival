

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
        // TODO
        //  - add game action to store sorting!!
        var self = this;
        this._order = [];
        this.each(function(card) {
            self._order.push(card.cid);
            self._order = d3.shuffle(self._order);
        });
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
