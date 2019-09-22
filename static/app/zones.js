

var Zone = Backbone.Collection.extend({
    model: Card,
    localStorage: new Store("mtghordesurvival"),
    // initialize: function(name){
    //     this.name = name;
    // },
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
});
