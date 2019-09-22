
var Player = function() {
    var self = this;

    this.turnNumber = 0;
    this.phase;
    this.step;
    this.currentGameAction = -1;
    this.gameActions = [];
    this._continueCallback;


    this.zones = {
        exile: new Zone().setName('exile'),
        graveyard: new Zone().setName('graveyard'),
        library: new Zone().setName('library'),
        hand: new Zone().setName('hand'),
        battlefield: new Zone().setName('battlefield'),
        stack: new Zone().setName('stack'),
        command: new Zone().setName('command')
    }

    for (var zone in this.zones) {
        this.zones[zone].on('add', function(card){
            self.updateCounts();
        });
        this.zones[zone].on('remove', function(card){
            self.updateCounts();
        });
    }


    this.zones.battlefield.on('add', function(card){
        var $container = $('<div>')
            .addClass('mtgcard')
            .addClass(card.isType('creature') ? 'col-md-2' : 'col-md-4' )
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

        player.updateCounts();
    });

    this.zones.battlefield.on('remove', function(card) {
        $('.battlefield .mtgcard').trigger('destroy', {
            'cid': card.cid
        });
        player.updateCounts();
    });


    this.updateCounts();
    this.addListeners();
}

Player.prototype.addGameAction = function(gameAction) {
    if (!gameAction) return;
    if (this.currentGameAction != this.gameActions.length - 1) {
        console.log('TODO: remove any following game actions');
        debugger;
    }
    gameAction.do();
    toast(gameAction.message);
    this.gameActions.push(gameAction);
    this.currentGameAction = this.gameActions.length - 1;
}

Player.prototype.undo = function() {
    if (-1 == this.currentGameAction) {
        return;
    }
    this.gameActions[this.currentGameAction].undo();
    this.currentGameAction--;
};

Player.prototype.redo = function() {
    if (this.currentGameAction == this.gameActions.length - 1) {
        return;
    }
    this.currentGameAction++;
    this.gameActions[this.currentGameAction].do();
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
                ui.draggable.trigger('moveTo', {zone: ui2Zone[key]});
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
        console.log(e);


        // ctrl+z
        if (e.ctrlKey && 90 == e.which) {
            e.preventDefault();
            self.undo();
        }

        // ctrl+r
        if (e.ctrlKey && 82 == e.which) {
            e.preventDefault();
            self.redo();
        }

        // ctrl+A
        if (e.ctrlKey && 65 == e.which) {
            e.preventDefault();
            // select all
            player.zones.battlefield.each(function(card) {
                card.select();
            });
        }


        // alt+g
        if (e.altKey && 71 == e.which) {
            e.preventDefault();
            // boardwipe selected
            self.boardWipe(self.zones.graveyard);
        }

        // alt+e
        if (e.altKey && 69 == e.which) {
            e.preventDefault();
            self.boardWipe(self.zones.exile);
        }

        // alt+t
        if (e.altKey && 84 == e.which) {
            e.preventDefault();
            self.tapSelected();
        }

        // alt+u
        if (e.altKey && 85 == e.which) {
            e.preventDefault();
            self.untapSelected();
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
            self.endCombat(function() {
                toast('Post Combat Main Phase');
                self.mainPhase(function() {
                    self.passPriority(resolve);
                });
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


Player.prototype.addGameActionGroup = function(message, actions) {
    actions = actions.filter(function(action) { return action; });
    this.addGameAction(
        new GameAction(
            message,
            function(callback) {
                for (var i=0; i<actions.length; i++) {
                    actions[i].do();
                }
                callback && callback();
            },
            function(callback) {
                for (var i=0; i<actions.length; i++) {
                    actions[i].undo();
                }
                callback && callback();
            }
        )
    );
}

Player.prototype.combatPhase = function(callback) {
    var creatures = this.zones.battlefield.filter(function(card) {
        return card.isType('Creature');
    });
    this.addGameActionGroup('Declare attackers step', creatures.map(function(card){
        return card.attack();
    }));
    callback && callback();
}

Player.prototype.endCombat = function(callback) {
    var creatures = this.zones.battlefield.filter(function(card) {
        return card.isType('Creature');
    });
    this.addGameActionGroup('End combat phase', creatures.map(function(card) {
        return card.nocombat();
    }));
    callback && callback();
}

Player.prototype.boardWipe = function(zone, cardType) {
    var cards = this.zones.battlefield.filter(function(card) {
        if (!cardType) {
            return card.isSelected();
        }
        return card.isType(cardType);
    });
    var actions = [];
    for (var i=0; i<cards.length; i++){
        cards[i].moveTo(zone, function(action) {
            actions.push(action);
        });
    }
    this.addGameActionGroup('Board wipe', actions);
}

Player.prototype.tapSelected = function() {
    var cards = this.zones.battlefield.filter(function(card) {
        return card.isSelected();
    });
    this.addGameActionGroup('Tap all', cards.map(function(card) {
        return card.tap();
    }));
}

Player.prototype.untapSelected = function() {
    var cards = this.zones.battlefield.filter(function(card) {
        return card.isSelected();
    });
    this.addGameActionGroup('Untap all', cards.map(function(card){
        return card.untap();
    }));
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
    card.moveTo(this.zones.hand)
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
                return self.castSpell(nextCard, function(){
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
                card.moveTo(zone);
                callback && callback();
            });
            return;
        }
        self.resolveSpell(card, callback);
    });
}

Player.prototype.resolveSpell = function(card, callback) {
    var self = this;

    toast(card.getName() + ' resolved');

    card.resetState();
    if (card.isPermanent()) {
        card.moveTo(this.zones.battlefield);
    } else {
        card.moveTo(this.zones.graveyard);
    }

    callback && callback();
}
