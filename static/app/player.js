
var Player = function(options) {
    var self = this;

    this.gameMode = options;

    // HACK
    this.gameMode = {
        name: "Zombie Horde Survival",
        onDrawStep: function(game, data) {
            if (data.card) {
                var card = data.card;
                while(game.zones.library.length && -1 != ['Zombie', 'Zombie Giant'].indexOf(card.getName())) {
                    card = game.drawCard();
                }
            }
        }
    }

    this.turn = {
        number: 0,
        phase: "",
        step: ""
    }

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

Player.prototype.addGameAction = function(action) {
    if (!action) return;
    if (this.currentGameAction != this.gameActions.length - 1) {
        console.log('TODO: remove any following game actions');
        this.gameActions && this.gameActions.slice(0, this.currentGameAction - 1);
        debugger;
    }
    action.do();
    toast(action.message);
    this.gameActions.push(action);
    this.currentGameAction = this.gameActions.length - 1;
}

Player.prototype.addGameActionGroup = function(message, actions) {
    // filter out null actions
    actions = actions.filter(function(action) { return action; });
    // build game action
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

Player.prototype.undo = function() {
    this.pause();   // <- stop current game progression
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
        // console.log(e);

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

    $('#takeTurn').prop('disabled', true);

    this.addGameAction(
        new GameAction(
            "Turn - " + (this.number+1),
            function(callback) {
                self.turn.number++;
                $('.turn-number').text(self.turn.number);
                callback && callback();
            },
            function(callback) {
                self.turn.number--;
                $('.turn-number').text(self.turn.number);
                callback && callback();
            }
        )
    );

    this.continue(callback);
}

Player.prototype.pause = function() {
    var self = this;
    if (this._reject) {
        this._reject("Pause game");
        $('.continue').remove();
        var $elem = $('<button>')
            .addClass("btn btn-sm btn-success ml-2 continue")
            .text('Continue')
            .on('click', function(e) {
                this.remove();
                self.continue();
            });
        $('.controls').append($elem);
    }
}

Player.prototype.continue = function(callback) {
    var self = this;

    var turnOrder = {
        "": 0,
        "beginning": 0,
        "precombatmainphase": 1,
        "combat": 2,
        "postcombatmainphase": 3,
        "endingphase": 4,
        "opponentsturn": 0,
    };

    var n = turnOrder[this.turn.phase] || 0;

    var turnProgression = [
        function(){
            return new Promise((resolve, reject) => {
                self._reject = function(err){
                    $('.priority').remove();
                    reject(err);
                };
                self.beginningPhase(resolve);
            });
        },
        function(){
            return new Promise((resolve, reject) => {
                self._reject = function(err){
                    $('.priority').remove();
                    reject(err);
                };
                self.precombatMainPhase(resolve);
            });
        },
        function(){
            return new Promise((resolve, reject) => {
                self._reject = function(err){
                    $('.priority').remove();
                    reject(err);
                };
                self.combatPhase(resolve);
            });
        },
        function() {
            return new Promise((resolve, reject) => {
                self._reject = function(err){
                    $('.priority').remove();
                    reject(err);
                };
                self.postcombatMainPhase(resolve);
            });
        },
        function() {
            return new Promise((resolve, reject) => {
                self._reject = function(err){
                    $('.priority').remove();
                    reject(err);
                };
                self.endingPhase(resolve);
            });
        },
        function(){
            self._nextPhase("Opponents Turn", "opponentsturn");
            $('#takeTurn').prop('disabled', false);
            callback && callback();
        }
    ];

    // build turn
    var promise = Promise.resolve();
    turnProgression.slice(n).reduce( (previousPromise, clbk) => {
        return previousPromise.then(clbk);
    }, promise);
    promise.catch(function(err){
        console.log(err);
    });


/*
    var promise = new Promise((resolve, reject) => {
        self._reject = reject;
        self.beginningPhase(resolve);
    }).then(function() {
        return new Promise((resolve, reject) => {
            self._reject = reject;
            self.precombatMainPhase(resolve);
        });
    }).then(function() {
        return new Promise((resolve, reject) => {
            self._reject = reject;
            self.combatPhase(resolve);
        });
    }).then(function() {
        return new Promise((resolve, reject) => {
            self._reject = reject;
            self.postcombatMainPhase(resolve);
        });
    }).then(function() {
        return new Promise((resolve, reject) => {
            self._reject = reject;
            self.endingPhase(resolve);
        });
    }).then(function() {
        self._nextPhase("Opponents Turn", "opponentsturn");
        callback && callback();
    });
*/

}

Player.prototype._passPriority = function(callback) {
    var $elem = $('<button>')
        .addClass("btn btn-sm btn-success ml-2 priority")
        .text('Continue')
        .on('click', function(e) {
            this.remove();
            callback && callback();
        });
    $('.controls').append($elem);
}

Player.prototype._nextPhase = function(message, nextPhase) {
    var self = this;
    var prevPhase = this.turn.phase;
    var prevStep = this.turn.step;
    this.addGameAction(
        new GameAction(
            message,
            function(callback) {
                self.turn.phase = nextPhase;
                self.turn.step = "";
                $('.turn-phase').text(self.turn.phase);
                $('.turn-step').text(self.turn.step);
                callback && callback();
            },
            function(callback) {
                self.turn.phase = prevPhase;
                self.turn.step = prevStep;
                $('.turn-phase').text(self.turn.phase);
                $('.turn-step').text(self.turn.step);
                callback && callback();
            }
        )
    );
}

Player.prototype._nextStep = function(message, nextStep) {
    var self = this;
    var prevStep = this.turn.step;
    this.addGameAction(
        new GameAction(
            message,
            function(callback) {
                self.turn.step = nextStep;
                $('.turn-step').text(self.turn.step);
                callback && callback();
            },
            function(callback) {
                self.turn.step = prevStep;
                $('.turn-step').text(self.turn.step);
                callback && callback();
            }
        )
    );
}

Player.prototype.beginningPhase = function(callback) {
    // beginningPhase
    //   - untap lands and creatures
    //   - draw a card
    var self = this;

    // // TODO
    // // skip if needed
    // if (this.phase && "opponentsturn" != this.phase) {
    //     callback && callback();
    //     return;
    // }//.end

    this._nextPhase("Beginning Phase", "beginning");

    this._nextStep("Untap step", "untap");
    this.addGameActionGroup('Untap', this.zones.battlefield.map(function(card) {
        return card.untap();
    }));

    this._nextStep("Draw step", "draw");
    var card = this.drawCard();

    // game mode handler
    this.gameMode.onDrawStep && this.gameMode.onDrawStep(this, {card: card});

    this._passPriority(callback);
}

Player.prototype.precombatMainPhase = function(callback){
    // precombatMainPhase
    //   - play a land
    //   - cast creatures & spells
    this._nextPhase("Precombat Main Phase", "precombatmainphase");
    this._mainPhase(callback);
}

Player.prototype._mainPhase = function(callback) {
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
                        // callback && callback();
                        self._passPriority(callback);
                    }
                });
            });
        });
    }, Promise.resolve());
}

Player.prototype.combatPhase = function(callback) {
    // combatPhase
    //   - declare attackers
    //   - declare blockers
    //   - combat damage
    var self = this;
    this._nextPhase("Combat Phase", "combat");

    this._nextStep("Declare Attackers", "attackers");
    var creatures = this.zones.battlefield.filter(function(card) {
        return card.isType('Creature');
    });
    this.addGameActionGroup('Declaring attackers', creatures.map(function(card){
        return card.attack();
    }));

    this._passPriority(function(){
        self._nextStep("Declare Blockers", "blockers");
        self._passPriority(function(){

            self._nextStep("Combat damage", "combatdamage");
            var creatures = self.zones.battlefield.filter(function(card) {
                return card.isType('Creature');
            });
            self.addGameActionGroup('End combat', creatures.map(function(card) {
                return card.nocombat();
            }));

            self._passPriority(callback);
        });
    });

}

Player.prototype.postcombatMainPhase = function(callback){
    //  postcombatMainPhase
    //   - play a land
    //   - cast creatures & spells
    this._nextPhase("Postcombat Main Phase", "postcombatmainphase");
    this._mainPhase(callback);
}

Player.prototype.endingPhase = function(callback) {
    // endingPhase
    //   - remove damage
    //   - pass the turn to opponent
    this._nextPhase("Ending Phase", "endingphase");
    this._nextStep("Clear Damage", "cleardamage");
    // TODO clear damage from creatures
    this._nextStep("Cleanup", "cleanup");
    // TODO: discard to hand limit
    this._passPriority(callback);
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

Player.prototype.drawCard = function() {
    if (!this.zones.library.length) {
        toast('No cards in library!');
        return;
    }
    // toast('Draw card');
    var card = this.zones.library.draw(this.zones.hand);
    // card.moveTo(this.zones.hand);
    return card;
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
    // card.moveTo(this.zones.stack);

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
