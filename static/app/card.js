
var Card = Backbone.Model.extend({
    // Override for scryfall 'id' field.
    // Backbone will use this attribute to make models singletons.
    idAttribute: "_id",
    defaults: {},
    initialize: function(){
        this.clearState();
    },
    clearState: function() {
        this.state = {
            tapped: false,
            counters: {},
            attacking: false,
            blocking: false,
            damage: 0
        };
    },
    getName: function() {
        return this.get('name');
    },
    getTypes: function() {
        return this.get('type_line').toLowerCase().replace(' —','').split(' ');
    },
    isType: function(cardType) {
        return -1 != this.getTypes().indexOf(cardType.toLowerCase());
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
    changeZone: function() {

    }
});




var CardView = Backbone.View.extend({
    template: _.template($('#card_template').html()),
    initialize: function(){
        this.counters = {
            '+1/+1': 0,
            '-1/-1': 0
        }
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
        'endCombat': 'endCombat'
    },
    toggleTapped: function(e) {
        this.$el.toggleClass('tapped');
    },
    tap: function(e) {
        this.$el.addClass('tapped');
        toast(this.model.getName() + " tapped");
    },
    untap: function(e) {
        this.$el.removeClass('tapped');
        toast(this.model.getName() + " untapped");
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
        if (args.cardType && !this.model.isType(args.cardType)) {
            return;
        }
        toast(this.model.getName() + " put into the " + args.zone + " from the battlefield.");
        player.zones.battlefield.remove(this.model);
        player.zones[args.zone].add(this.model);
        this.remove();
        player.updateCounts();
    },
    render: function(){
        this.$el.html(this.template(this.model.attributes));
        return this;
    }
});
