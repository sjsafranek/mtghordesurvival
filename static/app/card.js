
var Card = Backbone.Model.extend({
    // Override for scryfall 'id' field.
    // Backbone will use this attribute to make models singletons.
    idAttribute: "_id",
    defaults: {

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
    },

    tap: function() {
        this.set('__tapped', true);
    },

    untap: function() {
        this.set('__tapped', false);
    },

    attack: function() {
        this.set('__tapped', true);
        this.set('__attacking', true);
    },

    _nocombat: function() {
        this.set('__attacking', false);
        this.set('__blocking', false);
    },

    isTapped: function() {
        return this.get('__tapped');
    },

    haste: function() {
        this.set('__summoningSicknes', false);
    },

    assignDamage: function(damage) {
        this.set('__damage', this.get('__damage') + damage);
    },

    clearDamage: function() {
        this.set('__damage', 0);
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

    moveTo: function(newZone) {
        var self = this;
        var oldZone = this.collection;
        if (newZone != oldZone) {
            player.addGameAction(
                new GameAction(
                    this.getName() + " put into the " + newZone.getName() + (oldZone ? " from the " + oldZone.getName() : ""),
                    function(callback) {
                        self._moveTo(newZone, callback);
                    },
                    function(callback) {
                        self._moveTo(oldZone, callback);
                    }
                )
            );
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
                __tapped: this.model.isTapped()
            }
        });

        this.render();
    },
    events: {
        'click' : 'selectCard',
        'dblclick': 'toggleTapped',
        'contextmenu': 'contextMenu',
        'changeZone': 'changeZone',
        'tap': 'tap',
        'attack': 'attack',
        'untap': 'untap',
        'endCombat': 'endCombat',
        'destroy': 'destroy'
    },

    onChange: function(event) {
        var changed = event.changed;
        undefined != changed.__tapped &&  changed.__tapped && this.$el.addClass('tapped');
        undefined != changed.__tapped && !changed.__tapped && this.$el.removeClass('tapped');

        undefined != changed.__attacking && !changed.__attacking && this.$el.addClass('attacking');
        // allow for tap animation to complete
        undefined != changed.__attacking && !changed.__attacking && setTimeout(function(){
            $('.combatZone').append(self.$el);
        },300);

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
        if (this.isTapped()) {
            this.untap();
            return;
        }
        this.tap();
    },

    _tap: function(callback) {
        this.model.tap();
        callback && callback();
    },

    _untap: function(callback) {
        this.model.untap();
        callback && callback();
    },

    tap: function(event) {
        var self = this;
        if (!this.isTapped()) {
            player.addGameAction(
                new GameAction(
                    this.model.getName() + " tapped",
                    function(callback) { self._tap(callback); },
                    function(callback) { self._untap(callback); }
                )
            );
        }
    },

    untap: function(event) {
        var self = this;
        if (this.isTapped()){
            player.addGameAction(
                new GameAction(
                    this.model.getName() + " untapped",
                    function(callback) { self._untap(callback); },
                    function(callback) { self._tap(callback); }
                )
            );
        }
    },

    _attack: function(callback) {
        this.model.attack();
        callback && callback();
    },

    _nocombat: function(callback) {
        this.model._nocombat();
        callback && callback();
    },

    isAttacking: function() {
        return this.model.get('__attacking');
    },

    attack: function(event) {
        var self = this;
        if (!this.isAttacking()) {
            player.addGameAction(
                new GameAction(
                    thos.model.getName() + " attacking",
                    function(callback) { self._attack(callback); },
                    function(callback) { self._nocombat(callback); }
                )
            );
        }
    },


    endCombat: function(e) {
        $('.creatures').append(this.$el);
        this.$el.removeClass('attacking');
    },
    selectCard: function(e){
        $(".mtgcard-menu").removeClass("show").hide();  // remove contextMenu
        if (!e.ctrlKey) {
            $('.selected').removeClass('selected');
        }
        this.$el.toggleClass('selected');
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
                !self.$el.hasClass('tapped') ?
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
                $('<a>')
                    .addClass('dropdown-item')
                    .text('add counter')
                    .on('click', function(){
                        $menu.remove();

                        self.counters['+1/+1']++;
                        self.counters['-1/-1']++;

                        self.$el
                            .find('.plus-one-plus-one-counter')
                            .text(
                                self.counters['+1/+1']
                            )
                            .show();

                        self.$el
                            .find('.minus-one-minus-one-counter')
                            .text(
                                self.counters['-1/-1']
                            )
                            .show();

                        debugger;
                    }),
                $('<a>')
                    .addClass('dropdown-item')
                    .text('change zone')
                    .on('click', function(){
                        $menu.remove();

                        Swal.fire(
                            GameUtils.selectZoneOptions({exclude: ['battlefield']})
                        ).then(function(result) {
                            var zone = result.value;
                            if (zone) {
                                var $elems = $('.mtgcard.selected');
                                if ($elems.length) {
                                    $elems.trigger('changeZone', {zone: zone});
                                    return;
                                }
                                self.remove();
                                self.zones.battlefield.remove(self.model);
                                self.zones[zone].add(self.model);
                            }
                        });

                    })
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
    changeZone: function(e, args) {
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
