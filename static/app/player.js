var Player = function() {
    var self = this;

    this.turnNumber = 0;
    this.phase;
    this.step;
    this.currentGameAction = -1;
    this.gameActions = [];


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

Player.prototype.addGameAction = function(gameAction) {
    gameAction.do();
    this.gameActions.push(gameAction);
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


    var ui2Zone = {
        '.zoneHand': 'hand',
        '.zoneLibrary': 'library',
        '.zoneGraveyard': 'graveyard',
        '.zoneExile': 'exile',
        '.zoneBattlefield': 'battlefield',
    }

    Object.keys(ui2Zone).map(function(key) {
        $(key).on('click', function(e) {
            selectAndChangeCardZone(ui2Zone[key]);
        });

        if ('battlefield' == ui2Zone[key]) return;

        $(key).droppable({
            drop: function(event , ui) {
                ui.draggable.trigger('changeZone', {zone: ui2Zone[key]});
                $(event.target).removeClass('draggable-over');
            },
            over: function(event, ui) {
                $(event.target).addClass('draggable-over');
            },
            out: function(event, ui) {
                $(event.target).removeClass('draggable-over');
            }
        });
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
    });

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
