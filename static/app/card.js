
var Card = Backbone.Model.extend({
    // Override for scryfall 'id' field.
    // Backbone will use this attribute to make models singletons.
    idAttribute: "_id",
    defaults: {

    },

    initialize: function(){
        this.clearState();
    },

    clearState: function() {
        this.state = {
            tapped: false,
            counters: {},
            attacking: false,
            blocking: false,
            damage: 0,
            controller: undefined,
            owner: undefined,
            summoningSickness: false
        };
    },

    tap: function() {
        this.state.tapped = true;
    },

    untap: function() {
        this.state.tapped = false;
    },

    isTapped: function() {
        return this.state.tapped;
    },

    haste: function() {
        this.state.summoningSickness = false;
    },

    assignDamage: function(damage) {
        this.state.damage += damage;
    },

    clearDamage: function() {
        this.state.damage = 0;
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

    destroy: function(event, args) {
        if (args.cid != this.model.cid) return;
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
        this.$el.addClass('tapped');
        this.model.tap();
        callback && callback();
    },

    _untap: function(callback) {
        this.$el.removeClass('tapped');
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

    attack: function(e) {
        var self = this;
        if (!this.$el.hasClass('tapped') && this.model.isType('creature')) {
            this.tap();
            this.$el.addClass('attacking');
            // allow for tap animation to complete
            setTimeout(function(){
                $('.combatZone').append(self.$el);
                toast(self.model.getName() + " attacking");
            },300);
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
        // toast(this.model.getName() + " put into the " + args.zone + " from the battlefield.");
        // player.zones.battlefield.remove(this.model);
        // player.zones[args.zone].add(this.model);
        this.model.moveTo(player.zones[args.zone]);

        // this.model.on('change', function(event){
        //
        // });
        //
    },
    render: function(){
        this.$el.html(this.template(this.model.attributes));
        return this;
    }
});
