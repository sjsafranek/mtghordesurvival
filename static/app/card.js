
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
        this.set('__tapped', false);
        this.set('__counters', {});
        this.set('__attacking', false);
        this.set('__blocking', false);
        this.set('__damage', 0);
        this.set('__controller', undefined);
        this.set('__owner', undefined);
        this.set('__summoningSickness', false);
        this.set('__selected', false);
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
        this.set('__tapped', true);
        this.set('__attacking', true);
        callback && callback();
    },

    _nocombat: function(callback) {
        this.set('__attacking', false);
        this.set('__blocking', false);
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

    moveTo: function(newZone, callback) {
        var self = this;
        var oldZone = this.collection;
        if (newZone != oldZone) {
            var action = new GameAction(
                    this.getName() + " put into the " + newZone.getName() + (oldZone ? " from the " + oldZone.getName() : ""),
                    function(callback) {
                        self._moveTo(newZone, callback);
                    },
                    function(callback) {
                        self._moveTo(oldZone, callback);
                    }
                );
            callback && callback(action);
            !callback && player.addGameAction(action);
        }
    }

});




var CardView = Backbone.View.extend({
    template: _.template($('#card_template').html()),
    initialize: function(){
        var self = this;

        this.model.on('change', this.onChange, this);

        this.onChange({
            changed: {
                __tapped: this.model.isTapped(),
                __attacking: this.model.isAttacking(),
                __blocking: this.model.isBlocking(),
                __selected: this.model.isSelected(),
                __damage: this.model.getDamage()
            }
        });

        this.render();
    },
    events: {
        'click' : 'selectCard',
        'dblclick': 'toggleTapped',
        'contextmenu': 'contextMenu',
        'moveTo': 'moveTo',
        'tap': 'tap',
        'untap': 'untap',
        'destroy': 'destroy',
        'mouseover': 'mouseover'
    },

    onChange: function(event) {
        var self = this;
        var changed = event.changed;

        // tapped
        if (undefined != changed.__tapped) {
            changed.__tapped ?
                this.$el.addClass('tapped') : this.$el.removeClass('tapped');
        }

        // combat
        // allow for tap animation to complete
        undefined != changed.__attacking && changed.__attacking && this.$el.addClass('attacking');
        undefined != changed.__attacking && changed.__attacking && setTimeout(function(){
            console.log(self);
            $('.combatZone').append(self.$el);
        },300);

        // remove from combat
        var nocombat = function() {
           $('.creatures').append(self.$el);
           self.$el.removeClass('attacking');
       }
        undefined != changed.__attacking && !changed.__attacking && nocombat();

        // selected
        if (undefined != changed.__selected) {
            changed.__selected ?
                this.$el.addClass('selected') : this.$el.removeClass('selected');
        }

        // damage
        if (undefined != changed.__damage) {
            changed.__damage >= this.model.getToughness() ?
                this.$el.addClass('leathal-damage') : this.$el.removeClass('leathal-damage');
        }
    },

    mouseover: function(event) {
        // console.log(this.model.getText());
        // console.log(this.model.getPower(), this.model.getToughness());
    },

    destroy: function(event, args) {
        if (args.cid != this.model.cid) return;
        this.model.off('change', this.onChange, this);
        this.remove();
    },

    isTapped: function() {
        return this.model.isTapped();
    },

    toggleTapped: function(event) {
        this.isTapped() ?
            player.addGameAction(this.model.untap()) : player.addGameAction(this.model.tap());
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
        $(".mtgcard-menu").removeClass("show").hide();  // remove contextMenu
        if (!event.ctrlKey) {
            this.model.select();
        }
        this.model.toggleSelect();
    },

    contextMenu: function(e) {
        var self = this;
        e.preventDefault();

        var top = e.pageY - 10;
        var left = e.pageX - 50;

        var $menu;
        $menu = $('<div>')
            .addClass('dropdown-menu dropdown-menu-sm mtgcard-menu')
            .append(
                !self.model.isTapped() ?
                    $('<a>')
                        .addClass('dropdown-item')
                        .text('tap')
                        .on('click', function(){
                            $menu.remove();
                            self.tap()
                        }) :
                    $('<a>')
                        .addClass('dropdown-item')
                        .text('untap')
                        .on('click', function(){
                            $menu.remove();
                            self.untap()
                        }),
                // $('<a>')
                //     .addClass('dropdown-item')
                //     .text('add counter')
                //     .on('click', function(){
                //         $menu.remove();
                //
                //         self.counters['+1/+1']++;
                //         self.counters['-1/-1']++;
                //
                //         self.$el
                //             .find('.plus-one-plus-one-counter')
                //             .text(
                //                 self.counters['+1/+1']
                //             )
                //             .show();
                //
                //         self.$el
                //             .find('.minus-one-minus-one-counter')
                //             .text(
                //                 self.counters['-1/-1']
                //             )
                //             .show();
                //
                //         debugger;
                //     }),

                self.model.isAttacking() ?
                    $('<a>')
                        .addClass('dropdown-item')
                        .text('Remove from combat')
                        .on('click', function(){
                            $menu.remove();
                            self.nocombat();
                        }) : "",

                $('<a>')
                    .addClass('dropdown-item')
                    .text('Destroy')
                    .on('click', function(){
                        $menu.remove();
                        self.moveTo(null, {zone: 'graveyard'});
                    }),

                $('<a>')
                    .addClass('dropdown-item')
                    .text('Exile')
                    .on('click', function(){
                        $menu.remove();
                        self.moveTo(null, {zone: 'exile'});
                    }),


                // to library
                // to hand


                this.model.isType('creature') ?
                    $('<a>')
                        .addClass('dropdown-item')
                        .text('set damage')
                        .on('click', function(){
                            $menu.remove();
                            Swal.fire({
                                title: "Set damage",
                                input: "number",
                                inputValue: self.model.getDamage()
                            }).then(function(result) {
                                if (result.value) {
                                    var action = self.model.setDamage(
                                        parseInt(result.value)
                                    );
                                    player.addGameAction(action);
                                }
                            });
                        }) : ""

            ).css({
                display: "block",
                top: top,
                left: left
            }).addClass("show");

        $('body').append($menu);

        // $(window).on("click", function(e) {
        //     $(".mtgcard-menu").removeClass("show").hide();
        // });

        return false;    // blocks default Webbrowser right click menu
    },

    moveTo: function(e, args) {
        var self = this;
        if (args.cardType && !this.model.isType(args.cardType)) {
            return;
        }
        this.model.moveTo(player.zones[args.zone]);
    },

    render: function(){
        this.$el.html(this.template(this.model.attributes));
        return this;
    }

});
