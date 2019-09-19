
localStorage.clear();








var zombie;



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


var Zone = Backbone.Collection.extend({
    model: Card,
    localStorage: new Store("mtghordesurvival"),
    chooseRandom: function() {
        var idx = Math.round(Math.random() * this.length);
        if (!this.models[idx]) {
            console.log('[ERROR]: ', idx, this.length);
            return this.chooseRandom();
        }
        return this.models[idx];
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









function toast(message) {
    var $elem = $('<div>').append(
        new Date().toISOString().split('.')[0],
        ': ',
        message,
    );
    $('#gameLog').append($elem);
    $elem.get(0).scrollIntoView();
}




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


var Player = function() {
    var self = this;

    this.zones = {
        exile: new Zone(),
        graveyard: new Zone(),
        library: new Zone(),
        hand: new Zone(),
        battlefield: new Zone(),
        stack: new Zone(),
        command: new Zone()
    }

    // TODO
    //  - Fix callbacks for Backbone Model
    this._callbacks = {
        "Grave Titan": function() {
            // etb create two tokens
            self.resolveSpell(zombie);
            self.resolveSpell(zombie);
        },
        "Damnation": function() {
            // destroy all creatures
            self.boardWipe('graveyard', 'Creature');
        },
        "Army of the Damned": function() {
            // create 13 zombies
            for (var i=0; i<13; i++) {
                self.resolveSpell(zombie);
            }

            // has flashback
            var cards = self.zones.graveyard.filter(function(card) {
                return "Army of the Damned" == card.getName();
            });

            for (var i=0; i<cards.length; i++) {
                var card = cards[i];
                self.zones.graveyard.remove(card);
                self.castSpell(card, function(){
                    self.zones.graveyard.remove(card);
                    self.zones.exile.add(card);
                });
            }
            //.end

            self.updateCounts();
        },
        "Twilight's Call": function() {
            // all creatures from graveyard to battlefield
            var cards = self.getCardsByType('creature', 'graveyard');
            for (var i=0; i<cards.length; i++) {
                var card = cards[i];
                self.zones.graveyard.remove(card);
                self.resolveSpell(card);
            }
            self.updateCounts();
        }
    }

    this.updateCounts();
    this.addListeners();
}

Player.prototype.addListeners = function() {
    var self = this;

    var collectOptions = function(zone) {
        var inputOptions = {};
        zone.forEach(function(card) {
            inputOptions[card.cid] = card.getName();
        });
        return inputOptions;
    }

    var selectCardFromZone = function(zone) {
        return {
            title: 'Select a card',
            input: 'select',
            inputOptions: collectOptions(zone),
            inputPlaceholder: 'Select a card',
            showCancelButton: true
        };
    }

    var selectAndChangeCardZone = function(oldZone) {
        var zone = self.zones[oldZone];

        Swal.queue([
            {
                title: 'Select a card',
                html: $('<select>', {id: 'card-select'})
                    .addClass('form-control')
                    .prop('multiple', true)
                    .append(
                        (function(){
                            return zone.map(function(card) {
                                return $('<option>', {
                                    value: card.cid
                                }).text(card.getName())
                            });
                        })()
                    )
                    .get(0),
                inputPlaceholder: 'Select a card',
                showCancelButton: true,
                preConfirm: () => {
                    return $('#card-select').val().map(function(cid) {
                        return zone.get(cid);
                    })
                }
            },
            GameUtils.selectZoneOptions({exclude: [oldZone]})
        ]).then(function(result) {
            if (!result.value || result.dismiss) return;
            var cards = result.value[0];
            var newZone = result.value[1];
            for (var i=0; i<cards.length; i++) {
                var card = cards[i]
                zone.remove(card);
                if ('battlefield' == newZone) {
                    self.resolveSpell(card);
                } else {
                    self.zones[newZone].add(card);
                }
                toast(card.getName() + ' put into the ' + newZone + ' from the ' + oldZone);
                self.updateCounts();
            }
        });
    }


    $('.zoneHand').on('click', function(e) {
        selectAndChangeCardZone('hand');
    });

    $('.zoneLibrary').on('click', function(e) {
        selectAndChangeCardZone('library');
    });

    $('.zoneGraveyard').on('click', function(e) {
        selectAndChangeCardZone('graveyard');
    });

    $('.zoneExile').on('click', function(e) {
        selectAndChangeCardZone('exile');
    });

    $('.zoneBattlefield').on('click', function(e) {
        selectAndChangeCardZone('battlefield');
    });

    // hot keys
    $(window).on('keydown', function(e) {
        // ctrl+A
        if (e.ctrlKey && 65 == e.which) {
            e.preventDefault();
            $('.mtgcard').addClass('selected');
        }

        //ctrl+G
        if (e.ctrlKey && 71 == e.which) {
            e.preventDefault();
            $('.selected').trigger('changeZone', {zone: 'graveyard'});
        }
    });

    // unselect cards
    // $(window).on('click', function(e) {
    //     if (!$(e.target).hasClass('mtgcard')) {
    //         $('img').removeClass('selected');
    //     }
    // });



    $('.zoneGraveyard').droppable({
        tolerance: "touch",
        drop: function(event , ui) {
            ui.draggable.trigger('changeZone', {zone: 'graveyard'});
        },
        over: function(event, ui) {
            $(event.target).addClass('selected');
        },
        out: function(event, ui) {
            $(event.target).removeClass('selected');
        }
    });

}

Player.prototype.updateCounts = function() {
    $('.handCount').text(this.zones.hand.length);
    $('.libraryCount').text(this.zones.library.length);
    $('.graveyardCount').text(this.zones.graveyard.length);
    $('.exileCount').text(this.zones.exile.length);
    $('.battlefieldCount').text(this.zones.battlefield.length);
}

Player.prototype.takeTurn = function(callback) {
    var self = this;
    // beginningPhase
    //   - untap lands and creatures
    //   - draw a card
    // precombatMainPhase
    //   - play a land
    //   - cast creatures & spells
    // combatPhase
    //   - declare attackers
    //   - declare blockers
    //   - combat damage
    //  postcombatMainPhase
    //   - play a land
    //   - cast creatures & spells
    // endingPhase
    //   - remove damage
    //   - pass the turn to opponent

    var promise = new Promise((resolve, reject) => {
        toast('Beginning Phase');
        self.beginningPhase(function() {
            self.passPriority(resolve);
        });
    }).then(function(result) {
        return new Promise((resolve, reject) => {
            toast('Pre Combat Main Phase');
            self.mainPhase(function() {
                self.passPriority(resolve);
            });
        });
    }).then(function(result) {
        return new Promise((resolve, reject) => {
            toast('Combat Phase');
            self.combatPhase(function() {
                self.passPriority(resolve);
            });
        });
    }).then(function(result) {
        return new Promise((resolve, reject) => {
            // remove from combat zone
            $('.battlefield .mtgcard.creature').trigger('endCombat');
            toast('Post Combat Main Phase');
            self.mainPhase(function() {
                self.passPriority(resolve);
            });
        });
    }).then(function(result) {
        return new Promise((resolve, reject) => {
            toast('Ending Phase');
            self.endingPhase(function() {
                self.passPriority(resolve);
            });
        });
    }).then(function(result) {
        return new Promise((resolve, reject) => {
            toast('Passing the turn');
            self.passPriority(resolve);
        });
    }).then(function(result) {
        callback && callback();
    })
}

Player.prototype.passPriority = function(callback) {
    var $elem = $('<button>')
        .addClass("btn btn-sm btn-success ml-2")
        .text('Continue')
        .on('click', function(e) {
            this.remove();
            callback && callback();
        });
    $('.controls').append($elem);
}

Player.prototype.beginningPhase = function(callback) {
    toast('Untap step');
    $('.battlefield .mtgcard').trigger('untap');

    toast('Draw step');
    if (!this.zones.library.length) {
        return;
    }

    var card = this.drawCard();
    while(this.zones.library.length && -1 != ['Zombie', 'Zombie Giant'].indexOf(card.getName())) {
        card = this.drawCard();
    }

    callback && callback();
}

Player.prototype.combatPhase = function(callback) {
    toast('Declare attackers step');
    $('.battlefield .mtgcard.creature').trigger('attack');
    console.log('TODO');
    callback && callback();
}

Player.prototype.endingPhase = function(callback) {
    callback && callback();
}

Player.prototype.drawCard = function() {
    if (!this.zones.library.length) {
        toast('No cards in library!');
        return;
    }
    toast('Draw card');
    var card = this.zones.library.chooseRandom();
    this.zones.library.remove(card);
    this.zones.hand.add(card);
    this.updateCounts();
    return card;
}

Player.prototype.mainPhase = function(callback) {
    var self = this;

    if (0 == self.zones.hand.length) {
        callback && callback();
        return;
    }

    // Cast all spells from hand
    // This must be done sequentially but use Promises for SweetAlert2
    // https://css-tricks.com/why-using-reduce-to-sequentially-resolve-promises-works/
    this.zones.hand.reduce( (previousPromise, nextCard) => {
        return previousPromise.then(() => {
            return new Promise((resolve, reject) => {
                self.zones.hand.remove(nextCard);
                return self.castSpell(nextCard, function(){
                    self.updateCounts();
                    resolve();
                    // continue when no cards are left to cast
                    if (0 == self.zones.hand.length) {
                        callback && callback();
                    }
                });
            });
        });
    }, Promise.resolve());
}

Player.prototype.getCardsByName = function(cardName, zone) {
    zone = zone || 'library';
    return this.zones[zone].filter(function(card) {
        return cardName == card.getName();
    });
}

Player.prototype.getCardsByType = function(cardType, zone) {
    zone = zone || 'library';
    return this.zones[zone].filter(function(card) {
        return card.isType(cardType);
    });
}

Player.prototype.castSpell = function(card, callback) {
    var self = this;
    toast('Cast ' + card.getName());
    return Swal.fire({
        title: card.getName(),
        imageUrl: card.getImage(),
        showCancelButton: true,
        focusConfirm: false,
        confirmButtonText: 'Resolve',
        cancelButtonText: 'Counter',
        animation: false
    }).then(function(result){
        if (!result.value) {
            Swal.fire(
                GameUtils.selectZoneOptions({exclude:['battlefield']})
            ).then(function(result) {
                var zone = result.value || 'graveyard' ;
                self.zones[zone].add(card);
                callback && callback();
            });
            return;
        }
        self.resolveSpell(card, callback);
    });
}

Player.prototype.boardWipe = function(zone, cardType) {
    $('.mtgcard').trigger('changeZone', {
        zone: zone || 'graveyard',
        cardType: cardType
    });
}

Player.prototype.resolveSpell = function(card, callback) {
    var self = this;

    toast(card.getName() + ' resolved');

    if (card.isPermanent()) {
        this.zones.battlefield.add(card);
        var $container = $('<div>')
            .addClass('mtgcard')
            .addClass( card.isType('creature') ? 'col-md-2' : 'col-md-4' )
            .addClass(card.getTypes().join(' '));

        if (card.isType('creature')) {
            $('.battlefield .creatures').append($container);
        } else {
            $('.battlefield .noncreatures').append($container);
        }

        var cardView = new CardView({
            el: $container,
            model: card
        });

        $container.draggable({
            opacity : 0.7,
            revert  : 'invalid',
            helper  : 'clone',
            zIndex  : 100,
            cursor  : 'move',
            start: function (e, ui) {
                ui.helper.animate({
                    width: 80,
                    height: 50
                }, 'fast');
            },
        });

    } else {
        this.zones.graveyard.add(card);
    }

    callback && callback();

    this._callbacks[card.getName()] && this._callbacks[card.getName()]();
}




// Build deck
var data = 'count,name\n1,Call to the Grave\n2,Bad Moon\n1,Plague Wind\n1,Damnation\n1,Yixlid Jailer\n1,Forsaken Wastes\n2,Nested Ghoul\n2,Infectious Horror\n2,Delirium Skeins\n1,Blind Creeper\n2,Soulless One\n2,Vengeful Dead\n1,Fleshbag Marauder\n1,Carrion Wurm\n3,Maggot Carrier\n4,Cackling Fiend\n1,Death Baron\n1,Grave Titan\n2,Severed Legion\n1,Skulking Knight\n1,Undead Warchief\n1,Twilights Call\n1,Army of the Damned\n1,Endless Ranks of the Dead\n2,Rotting Fensnake\n1,Unbreathing Horde\n1,Walking Corpse\n5,Zombie Giant\n55,Zombie';

function fetchCard(card_name, callback) {
    $.ajax({
        method: 'GET',
        url: 'https://api.scryfall.com/cards/named?exact=' + card_name,
    }).done(callback)
}

var player = new Player();

d3.csvParse(data, function(d) {
    fetchCard(d.name, function(card) {
        if ('Zombie' == card.name) {
            zombie = new Card(card);
        }
        for (var i=0; i<parseInt(d.count); i++) {
            player.zones.library.create(card);
        }
        player.updateCounts();
    });
});













$('#takeTurn').on('click', function(e) {
    $('#takeTurn').prop('disabled', true);
    player.takeTurn(function(){
        $('#takeTurn').prop('disabled', false);
    });
});

$('#addZombie').on('click', function(e) {
    player.resolveSpell(zombie);
});
