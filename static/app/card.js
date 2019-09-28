
var Card = Backbone.Model.extend({
    // Override for scryfall 'id' field.
    // Backbone will use this attribute to make models singletons.
    idAttribute: "_id",
    defaults: {
        power: null,
        toughness: null
    },

    initialize: function(){
        this.resetState();
    },

    resetState: function() {
        this.set({
            // '__counters': {},
            '__tapped': false,
            '__attacking': false,
            '__blocking': false,
            '__damage': 0,
            '__controller': undefined,
            '__owner': undefined,
            '__summoningSickness': true,
            '__selected': false,
            '__grouped': false,
            '__zone': ''
        });
    },

    getState: function() {
        return [
            this.getName(),
            // this.get('__counters'),
            this.get('__tapped'),
            this.get('__attacking'),
            this.get('__blocking'),
            this.get('__damage'),
            this.get('__controller'),
            this.get('__owner'),
            this.get('__summoningSickness')
            // this.get('__selected')
            // this.get('__grouped')
        ]
    },

    md5: function() {
        return md5(
            this.getState().join("|")
        );
    },

    _select: function() {
        this.set('__selected', true);
    },

    _unselect: function() {
        this.set('__selected', false);
    },

    toggleSelect: function() {
        this.isSelected() ?
            this._unselect() : this._select();
    },

    isSelected: function() {
        return this.get('__selected');
    },

    select: function(callback) {
        if (!this.isSelected()) {
            this._select();
        }
    },

    unselect: function(callback) {
        if (this.isSelected()) {
            this._unselect();
        }
    },

    _tap: function() {
        this.set('__tapped', true);
    },

    _untap: function() {
        this.set('__tapped', false);
    },

    tap: function() {
        var self = this;
        if (!this.isTapped()) {
            return new GameAction(
                    this.getName() + " tapped",
                    function(callback) { self._tap(callback); },
                    function(callback) { self._untap(callback); }
                );
        }
        return null;
    },

    untap: function() {
        var self = this;
        if (this.isTapped()) {
            return new GameAction(
                    this.getName() + " untapped",
                    function(callback) { self._untap(callback); },
                    function(callback) { self._tap(callback); }
                );
        }
        return null;
    },

    _attack: function(callback) {
        this.set({
            '__tapped': true,
            '__attacking': true
        });
        callback && callback();
    },

    _nocombat: function(callback) {
        this.set({
            '__attacking': false,
            '__blocking': false
        });
        callback && callback();
    },

    attack: function() {
        var self = this;
        if (!this.isAttacking() && !this.isTapped() && this.isType('creature')) {
            return new GameAction(
                this.getName() + " is attacking",
                function(callback) { self._attack(callback); },
                function(callback) { self._untap(); self._nocombat(callback); }
            );
        }
        return null;
    },

    nocombat: function() {
        var self = this;
        if (this.isAttacking() && this.isType('creature')) {
            return new GameAction(
                this.getName() + " is leaving combat",
                function(callback) { self._nocombat(callback); },
                function(callback) { self._attack(callback); }
            );
        }
        return null
    },

    isAttacking: function() {
        return this.isType('creature') ? this.get('__attacking') : undefined;
    },

    isBlocking: function() {
        return this.isType('creature') ? this.get('__blocking') : undefined;
    },

    isTapped: function() {
        return this.get('__tapped');
    },

    haste: function() {
        this.set('__summoningSicknes', false);
    },

    setDamage: function(newDamage) {
        var self = this;
        var oldDamage = this.get('__damage');
        if (newDamage == oldDamage) {
            return null;
        }
        return new GameAction(
            this.getName() + " has " + newDamage + " points of damage",
            function(callback) {
                self.set('__damage', newDamage);
                callback && callback();
            },
            function(callback) {
                self.set('__damage', oldDamage);
                callback && callback();
            }
        );
    },

    assignDamage: function(damage) {
        var self = this;
        return this.setDamage(
            this.get('__damage') + damage
        );
    },

    clearDamage: function() {
        var self = this;
        return this.setDamage(0);
    },

    getDamage: function() {
        return this.get('__damage');
    },

    getPower: function() {
        if (this.get('power')) {
            return parseInt(this.get('power'));
        }
        return null;
    },

    getToughness: function() {
        if (this.get('toughness')) {
            return parseInt(this.get('toughness'));
        }
        return null;
    },

    getName: function() {
        return this.get('name');
    },

    getText: function() {
        return this.get('oracle_text');
    },

    getTypes: function() {
        return this.get('type_line').toLowerCase().replace(' —','').split(' ');
    },

    isType: function(cardType) {
        return -1 != this.getTypes().indexOf(cardType.toLowerCase());
    },

    getCMC: function() {
        return this.get('cmc');
    },

    getColors: function() {
        return this.get('colors').map(function(d) {
            return d.toLowerCase();
        });
    },

    isColor: function(color){
        return -1 != this.getColors().indexOf(color.toLowerCase());
    },

    isPermanent: function() {
        const cardTypes = [
            'Artifact',
            'Creature',
            'Enchantment',
            'Land',
            'Planeswalker'
        ];
        for (var i=0; i<cardTypes.length; i++) {
            if (this.isType(cardTypes[i])) {
                return true;
            }
        }
        return false;
    },

    getImage: function(size) {
        return this.get('image_uris')[size||'small'];
    },

    _moveTo: function(zone, callback) {
        if (this.collection) {
            this.collection.remove(this);
        }
        zone.add(this);
        callback && callback();
    },

    // _moveTo: function(zone, callback) {
    //     var oldZone = this.collection;
    //     zone.add(this);
    //     if (oldZone) {
    //         oldZone.remove(this);
    //     }
    //     callback && callback();
    // },

    moveTo: function(newZone) {
        var self = this;
        var oldZone = this.collection;
        if (newZone != oldZone) {
            return new GameAction(
                    this.getName() + " put into the " + newZone.getName() + (oldZone ? " from the " + oldZone.getName() : ""),
                    function(callback) {
                        self._moveTo(newZone, callback);
                    },
                    function(callback) {
                        self._moveTo(oldZone, callback);
                    }
                );
        }
        return null;
    }

});




var CardView = Backbone.View.extend({
    template: _.template($('#card_template').html()),
    initialize: function(){
        var self = this;

        this.model.get('__grouped', false);
        this.group = undefined;

        this.model.on('change', this.onChange, this);

        this.onChange({
            changed: {
                __tapped: this.model.isTapped(),
                __attacking: this.model.isAttacking(),
                __blocking: this.model.isBlocking(),
                __selected: this.model.isSelected(),
                __damage: this.model.getDamage(),
                __grouped: this.model.get('__grouped')
            }
        });

        this.render();
    },
    events: {
        'click' : 'selectCard',
        // 'mouseup' : 'selectCard',
        'dblclick': 'toggleTapped',
        'contextmenu': 'contextMenu',
        'moveTo': 'moveTo',
        'tap': 'tap',
        'untap': 'untap',
        'destroy': 'destroy',
        'mouseover': 'mouseover',
        'click .mtg-card-destroy-btn': 'destroyCard'
    },

    destroyCard: function(event) {
        event.preventDefault();
        this.moveTo(null, {zone: 'graveyard'});
    },

    // HACK
    joinGroup: function(){
        if (!player) return;
        var group = player.getGroup(this.model);
        if (this.group && this.group == group) {
            // this.model.isSelected() ? this.group.unselectCards() : this.group.selectCards();
            return;
        }
        this.group &&
            this.group.hasCard(this.model) &&
                this.group.removeCard(this.model);
        this.group = group;
        group.addCard(this.model);
    },

    _attack: function() {
        this.$el.addClass('attacking');
    },

    _nocombat: function() {
        this.$el.removeClass('attacking');
        this.$el.removeClass('blocking');
    },

    onChange: function(event) {
        var self = this;

        this.joinGroup();

        var changed = event.changed;

        // tapped
        if (undefined != changed.__tapped) {
            changed.__tapped ?
                this.$el.addClass('tapped') : this.$el.removeClass('tapped');
        }


        // combat
        // allow for tap animation to complete
        undefined != changed.__attacking && changed.__attacking && this._attack();
        undefined != changed.__attacking && changed.__attacking && setTimeout(function(){
            $('.combatZone').append(self.$el);
        },300);

        // remove from combat
        var nocombat = function() {
           $('.creatures').append(self.$el);
            self._nocombat();
       }
        undefined != changed.__attacking && !changed.__attacking && nocombat();


        // selected
        if (undefined != changed.__selected) {
            changed.__selected ?
                this.$el.addClass('selected') : this.$el.removeClass('selected');
        }

        // // damage
        // if (undefined != changed.__damage && this.model.isType('creature')) {
        //     changed.__damage >= this.model.getToughness() ?
        //         this.$el.addClass('leathal-damage') : this.$el.removeClass('leathal-damage');
        // }

        // group
        if (undefined != changed.__grouped) {
            changed.__grouped ? this.$el.hide() : this.$el.show()
        }
        this.model.get('__grouped') ? this.$el.hide() : this.$el.show();
        //.end
    },

    mouseover: function(event) {
        // console.log(this.model.getText());
        // console.log(this.model.getPower(), this.model.getToughness());
    },

    destroy: function(event, args) {
        if (args.cid != this.model.cid) return;

        var isVisible = this.$el.is(':visible');
        if (!isVisible) {
            this.remove();
        }
        this.model.set('__grouped', false);
        this.model.off('change', this.onChange, this);
        this.group && this.group.removeCard(this.model);

        if (!isVisible) {
            return;
        }

        var self = this;
        console.log('TODO: animation based on zone',this.model.collection.name);
        this.$el.hide('explode', { "pieces":25 }, 600, function() {
            self.remove();
        });
    },

    isTapped: function() {
        return this.model.isTapped();
    },

    toggleTapped: function(event) {
        event.preventDefault();
        this.isTapped() ?
            player.addGameAction(this.model.untap()) :
            player.addGameAction(this.model.tap());
        this.model.select();
    },

    tap: function(event) {
        player.addGameAction(this.model.tap());
    },

    untap: function(event) {
        player.addGameAction(this.model.untap());
    },

    nocombat: function(event) {
        player.addGameAction(this.model.nocombat());
    },

    selectCard: function(event){
        event.preventDefault();
        event.stopPropagation();
        this.model.toggleSelect();
    },

    putIntoLibaryTop: function(){
        var library = player.getZone('library');
        player.addGameAction(library.addTop(this.model));
    },

    putIntoLibraryBottom: function(){
        var library = player.getZone('library');
        player.addGameAction(library.addBottom(this.model));
    },

    putIntoLibraryShuffle: function(){
        var library = player.getZone('library');
        player.addGameActionGroup(
            "Shuffle "+this.model.getName()+" into library",
            [this.model.moveTo(library), library.shuffle()]
        );
    },

    contextMenu: function(e) {
        var self = this;
        e.preventDefault();

        var inputOptions = {
            destroy: 'Destroy',
            exile: 'Exile',
            hand: 'Return to hand',
            putintolibraryshuffle: 'Put into library (shuffle)',
            putintolibrarytop: 'Put on the top of library',
            putintolibrarybottom: 'Put on the bottom of library'
        };
        this.model.isTapped() ? (inputOptions.untap = "Untap") : (inputOptions.tap = "Tap");
        this.model.isAttacking() && (inputOptions.nocombat = "Remove from combat");
        // this.model.isType('creature') && (inputOptions.damage = "Damage");

        swal.fire({
                title: 'Select Action',
                input: 'select',
                imageUrl: this.model.getImage('normal'),
                imageHeight: 300,
                imageClass: 'mtg-card-image',
                inputOptions: inputOptions,
                inputPlaceholder: 'Select an action'
            })
            .then(function(result) {
                if (result.value) {
                    switch(result.value) {
                        case 'tap':
                            return self.tap();
                        case 'untap':
                            return self.untap();
                        case 'nocombat':
                            return self.nocombat();
                        case 'destroy':
                            return self.moveTo(null, {zone: 'graveyard'});
                        case 'exile':
                            return self.moveTo(null, {zone: 'exile'});
                        case 'hand':
                            return self.moveTo(null, {zone: 'hand'});
                        case 'putintolibraryshuffle':
                            return self.putIntoLibraryShuffle();
                        case 'putintolibrarytop':
                            return self.putIntoLibaryTop();
                        case 'putintolibrarybottom':
                            return self.putIntoLibraryBottom();
                        // case 'damage':
                        //     return Swal.fire({
                        //         title: "Set damage",
                        //         input: "number",
                        //         inputValue: self.model.getDamage()
                        //     }).then(function(result) {
                        //         if (result.value) {
                        //             var action = self.model.setDamage(
                        //                 parseInt(result.value)
                        //             );
                        //             player.addGameAction(action);
                        //         }
                        //     });

                        default:
                            console.log(result);
                    }
                }
            });

        return false;    // blocks default Webbrowser right click menu
    },

    moveTo: function(e, args) {
        var self = this;
        if (args.cardType && !this.model.isType(args.cardType)) {
            return;
        }
        var action = this.model.moveTo(player.getZone(args.zone));
        player.addGameAction(action);
    },

    render: function(){
        // this.$el.hide();
        this.$el.html(this.template(this.model.attributes));
        // undefined != this.group && this.$el.fadeIn();
        return this;
    }

});







var CardGroupView = Backbone.View.extend({
    collection: null,
    template: _.template($('#card_template').html()),
    initialize: function(){
        var self = this;
        this.cards = {};
        this.$el.hide();
        this._listeners = {};
        this._oncontextmenu = function(e) {
            self.contextMenu(e);
        }
        this._dblclick = function(e) {
            self.dblclick(e);
        }
        this._click = function(e) {
            self.click(e);
        }

        this.$el.on('contextmenu', this._oncontextmenu);
        this.$el.on('dblclick', this._dblclick);
        this.$el.on('click', this._click);
        // this.$el.on('mouseup', this._click);
    },

    destroyCard: function(event) {
        event.stopPropagation();
        player.addGameAction(
            this.getCard().moveTo(player.getZone('graveyard'))
        );
    },

    click: function(event){
        event.stopPropagation();
        this.getCard().isSelected() ?
            this.unselectCards() : this.selectCards();
    },

    selectCards: function() {
        this.$el.addClass('selected');
        this._getAllCards().map(function(card) {
            !card.isSelected() && card._select();
        });
    },

    unselectCards: function() {
        this.$el.removeClass('selected');
        this._getAllCards().map(function(card) {
            card.isSelected() && card._unselect();
        });
    },

    dblclick: function(event) {
        event.preventDefault();
        if (this.getCard().isTapped()) {
            var actions = this._getAllCards().map(function(card){
                return card.untap();
            });
            player.addGameActionGroup("Untap", actions);
        } else {
            var actions = this._getAllCards().map(function(card){
                return card.tap();
            });
            player.addGameActionGroup("Tap", actions);
        }
        this.selectCards(event);
    },

    getCard: function(i) {
        if (i) {
            return Object.values(this.cards)[i];
        }
        for (var cid in this.cards) {
            return this.cards[cid];
        }
        return null;
    },

    _getAllCards: function() {
        return Object.values(this.cards);
    },

    _getCards: function(callback) {
        var self = this;

        var inputOptions = {};
        for (var i=0; i<this.size()+1; i++) {
            inputOptions[i] = i;
        }

        swal.fire({
                title: 'How many cards?',
                input: 'select',
                inputOptions: inputOptions,
                inputValue: '1'
            })
            .then(function(result) {
                if (result.value) {
                    var cards = []
                    for (var i=0; i<parseInt(result.value); i++) {
                        cards.push(self.getCard(i));
                    }
                    callback(cards);
                }
            });
    },

    tap: function() {
        this._getCards(function(cards){
            var actions = cards.map(function(card){
                return card.tap();
            });
            player.addGameActionGroup("Tap", actions);
        });
    },

    untap: function() {
        this._getCards(function(cards){
            var actions = cards.map(function(card){
                return card.untap();
            });
            player.addGameActionGroup("Untap", actions);
        });
    },

    nocombat: function() {
        this._getCards(function(cards){
            var actions = cards.map(function(card){
                return card.nocombat();
            });
        });
        player.addGameActionGroup("Remove creatures from combat", actions);
    },

    moveTo: function(zone) {
        this._getCards(function(cards){
            var actions = cards.map(function(card) {
                return card.moveTo(zone);
            });
            player.addGameActionGroup("Move to zone", actions);
        });
    },

    putIntoLibraryShuffle: function(){
        var library = player.getZone('library');
        this._getCards(function(cards){
            var actions = cards.map(function(card) {
                return card.moveTo(library);
            });
            actions.push(library.shuffle());
            player.addGameActionGroup("Put into library", actions);
        });
    },

    putIntoLibaryTop: function() {
        var library = player.getZone('library');
        this._getCards(function(cards){
            var actions = cards.map(function(card) {
                return library.addTop(card);
            });
            player.addGameActionGroup("Put on top of library", actions);
        });
    },

    putIntoLibraryBottom: function() {
        var library = player.getZone('library');
        this._getCards(function(cards){
            var actions = cards.map(function(card) {
                return library.addBottom(card);
            });
            player.addGameActionGroup("Put on bottom of library", actions);
        });
    },

    contextMenu: function(e) {
        var self = this;
        e.preventDefault();

        var inputOptions = {
            destroy: 'Destroy',
            exile: 'Exile',
            hand: 'Return to hand',
            putintolibraryshuffle: 'Put into library (shuffle)',
            putintolibrarytop: 'Put on the top of library',
            putintolibrarybottom: 'Put on the bottom of library'
        };
        this.getCard().isTapped() ? (inputOptions.untap = "Untap") : (inputOptions.tap = "Tap");
        this.getCard().isAttacking() && (inputOptions.nocombat = "Remove from combat");
        // this.getCard().isType('creature') && (inputOptions.damage = "Damage");

        swal.fire({
                title: 'Select Action',
                input: 'select',
                inputOptions: inputOptions,
                inputPlaceholder: 'Select an action',
                imageUrl: this.getCard().getImage('normal'),
                imageClass: 'mtg-card-image',
                imageHeight: 300
            })
            .then(function(result) {
                if (result.value) {
                    switch(result.value) {
                        case 'tap':
                            return self.tap();
                        case 'untap':
                            return self.untap();
                        case 'nocombat':
                            return self.nocombat();
                        case 'destroy':
                            return self.moveTo(player.getZone('graveyard'));
                        case 'exile':
                            return self.moveTo(player.getZone('exile'));
                        case 'hand':
                            return self.moveTo(player.getZone('hand'));
                        case 'putintolibraryshuffle':
                            return self.putIntoLibraryShuffle();
                        case 'putintolibrarytop':
                            return self.putIntoLibaryTop();
                        case 'putintolibrarybottom':
                            return self.putIntoLibraryBottom();
                        // case 'damage':
                        //     return Swal.fire({
                        //         title: "Set damage",
                        //         input: "number",
                        //         inputValue: self.model.getDamage()
                        //     }).then(function(result) {
                        //         if (result.value) {
                        //             var action = self.model.setDamage(
                        //                 parseInt(result.value)
                        //             );
                        //             player.addGameAction(action);
                        //         }
                        //     });
                        default:
                            console.log(result);
                    }
                }
            });

        return false;    // blocks default Webbrowser right click menu
    },

    size: function() {
        return Object.keys(this.cards).length;
    },

    _attack: function() {
        this.$el.addClass('attacking');
    },

    _nocombat: function() {
        this.$el.removeClass('attacking');
        this.$el.removeClass('blocking');
    },

    addCard: function(card) {
        this.cards[card.cid] = card;
        if (1 < this.size()) {
            this._group();
        } else {
            this._ungroup();
        }

        // tapped
        card.isTapped() ?
            this.$el.addClass('tapped') : this.$el.removeClass('tapped');

        // combat
        // allow for tap animation to complete
        card.isAttacking() ? this._attack() : this._nocombat();
        card.isAttacking() ? $('.combatZone').append(this.$el) : $('.creatures').append(this.$el);
        card.isSelected() ?
            this.$el.addClass('selected') : this.$el.removeClass('selected');
        this.$el.find('.mtg-card-destroy-btn').on('dblclick', function(event) {
            event.stopPropagation();
        });
    },

    removeCard: function(card) {
        delete this.cards[card.cid];
        if (1 < this.size()) {
            this._group();
        } else {
            this._ungroup();
        }
        this.$el.find('.mtg-card-count')
            .empty()
            .append(this.size());
    },

    hasCard: function(card) {
        return this.cards[card.cid] ? true : false;
    },

    getPower: function() {
        for (var cid in this.cards) {
            return this.cards[cid].getPower();
        }
    },

    getToughness: function() {
        for (var cid in this.cards) {
            return this.cards[cid].getToughness();
        }
    },

    getImage: function() {
        for (var cid in this.cards) {
            return this.cards[cid].getImage();
        }
    },

    _group: function() {
        var self = this;
        for (var cid in this.cards) {
            this.cards[cid].set('__grouped', true);
        }

        if (!this._rendered) {
            this.$el.html(this.template(this.getCard().attributes));
            this._destroyCard = function(e) {
                self.destroyCard(e);
            }
            this.$el.find('.mtg-card-destroy-btn').on('click', this._destroyCard);
            this._rendered = true;
        }

        this.$el.find('.mtg-card-count').empty().append(this.size());

        this.$el.show();
    },

    _ungroup: function() {
        for (var cid in this.cards) {
            this.cards[cid].set('__grouped', false);
        }
        this.$el.find('.card-count-container')
            .empty()
            .append(this.size());
        (2 > this.size()) && this.$el.hide();
    }
});
