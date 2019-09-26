
var Player = function(options) {
    var self = this;

    options = options || {};
    this.handLimit = options.handLimit || 7;
    this.gameMode = options;

    this.groups = {}

    // HACK
    this.gameMode = {
        name: "Zombie Horde Survival",
        onDrawStep: function(game, data) {
            if (data.card) {
                var card = data.card;
                while(game.zones.library.length && card.isType('Token')) {
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

        // self.updateCounts();
        // self._groupPermanents();
    });

    this.zones.battlefield.on('remove', function(card) {
        $('.battlefield .mtgcard').trigger('destroy', {
            'cid': card.cid
        });
        // player.updateCounts();
        // self._groupPermanents();
    });


    this.updateCounts();
    this.addListeners();


    // // TODO put this in the html template page
    // $.get("static/app/icons/Dot - White.svg").then(function(data){
    //     $('.turn-phase-container').append(
    //         $(data).find('svg').addClass('turn-phase-icon beginning-phase')
    //     );
    // });
    // $.get("static/app/icons/Card - White.svg").then(function(data){
    //     $('.turn-phase-container').append(
    //         $(data).find('svg').addClass('turn-phase-icon precombat-main-phase')
    //     );
    // });
    // $.get("static/app/icons/Sword - White.svg").then(function(data){
    //     $('.turn-phase-container').append(
    //         $(data).find('svg').addClass('turn-phase-icon combat-phase')
    //     );
    // });
    // $.get("static/app/icons/Card - White.svg").then(function(data){
    //     $('.turn-phase-container').append(
    //         $(data).find('svg').addClass('turn-phase-icon postcombat-main-phase')
    //     );
    // });
    // $.get("static/app/icons/Dot - White.svg").then(function(data){
    //     $('.turn-phase-container').append(
    //         $(data).find('svg').addClass('turn-phase-icon ending-phase')
    //     );
    // });
    //.end
}

Player.prototype.getZone = function(name) {
    return this.zones[name];
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
    toast('Undo: ' + this.gameActions[this.currentGameAction].message);
    this.currentGameAction--;
};

Player.prototype.redo = function() {
    if (this.currentGameAction == this.gameActions.length - 1) {
        return;
    }
    this.currentGameAction++;
    this.gameActions[this.currentGameAction].do();
    toast('Redo: ' + this.gameActions[this.currentGameAction].message);
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

        // ctrl+d
        if (e.ctrlKey && 68 == e.which) {
            e.preventDefault();
            self.drawCard();
        }

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

        // ctrl+a
        if (e.ctrlKey && 65 == e.which) {
            e.preventDefault();
            player.zones.battlefield.each(function(card) {
                card.select();
            });
        }


        // alt+g
        if (e.altKey && 71 == e.which) {
            e.preventDefault();
            self.boardWipe(self.zones.graveyard);
        }

        // alt+e
        if (e.altKey && 69 == e.which) {
            e.preventDefault();
            self.boardWipe(self.zones.exile);
        }

        // alt+l
        if (e.altKey && 76 == e.which) {
            e.preventDefault();
            self.boardWipe(self.zones.library);
        }

        // alt+h
        if (e.altKey && 72 == e.which) {
            e.preventDefault();
            self.boardWipe(self.zones.hand);
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

        // alt+s
        if (e.altKey && 83 == e.which) {
            e.preventDefault();
            self.addGameAction(self.zones.library.shuffle());
        }

        // alt+'+'
        if (e.altKey && 187 == e.which) {
            // deal damage
            var cards = self.zones.battlefield.filter(function(card) {
                return card.isSelected() && card.isType('creature');
            });
            self.addGameActionGroup('Deal 1 damage', cards.map(function(card){
                return card.assignDamage(1);
            }));
        }

        // alt+'-'
        if (e.altKey && 189 == e.which) {
            // heal damage
            var cards = self.zones.battlefield.filter(function(card) {
                return card.isSelected() && 0 != card.getDamage() && card.isType('creature');
            });
            self.addGameActionGroup('Heal 1 damage', cards.map(function(card){
                return card.assignDamage(-1);
            }));
        }
    });

    // unselect cards
    // $(window).on('click', function(e) {
    //     if (!$(e.target).hasClass('mtgcard')) {
    //         $('img').removeClass('selected');
    //     }
    // });

    var $button = $('#nextTurn');
    $button.on('click', function(e) {
        $button
            .prop('disabled', true)
            .hide();
        player.takeTurn(function(){
            $button
                .prop('disabled', false)
                .show();
        });
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
        var $elem = $('<button>', {title:'Continue'})
            .addClass("btn btn-lg btn-primary col-md-4 continue")
            .append(
                $('<i>').addClass('fas fa-forward')
            )
            .on('click', function(e) {
                this.remove();
                self.continue();
            });
        $('#game-controls-container').append($elem);
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
            // self._nextPhase("Opponents Turn", "opponentsturn");
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

}

Player.prototype._passPriority = function(callback) {
    $('.continue').remove();
    var $elem = $('<button>', {title:'Continue'})
        .addClass("btn btn-lg btn-primary col-md-4 continue")
        .append(
            $('<i>').addClass('fas fa-forward')
        )
        .on('click', function(e) {
            this.remove();
            callback && callback();
        });
    $('#game-controls-container').append($elem);
}

Player.prototype.beginningPhase = function(callback) {
    // beginningPhase
    //   - untap lands and creatures
    //   - draw a card
    var self = this;
    $('.turn-phase-icon').removeClass('current-phase');
    $('.beginning-phase').addClass('current-phase');

    var actions = this.zones.battlefield.map(function(card) {
        return card.untap();
    });
    this.addGameActionGroup('Beginning Phase', actions);

    var card = this.drawCard();

    // game mode handler
    this.gameMode.onDrawStep && this.gameMode.onDrawStep(this, {card: card});

    this._passPriority(callback);
}

Player.prototype.precombatMainPhase = function(callback){
    // precombatMainPhase
    //   - play a land
    //   - cast creatures & spells
    $('.turn-phase-icon').removeClass('current-phase');
    $('.precombat-main-phase').addClass('current-phase');
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


    $('.turn-phase-icon').removeClass('current-phase');
    $('.combat-phase').addClass('current-phase');

    var creatures = this.zones.battlefield.filter(function(card) {
        return card.isType('Creature');
    });
    this.addGameActionGroup('Declaring attackers', creatures.map(function(card){
        return card.attack();
    }));

    this._passPriority(function(){

        self._passPriority(function(){

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
    $('.turn-phase-icon').removeClass('current-phase');
    $('.postcombat-main-phase').addClass('current-phase');
    this._mainPhase(callback);
}

Player.prototype.endingPhase = function(callback) {
    // endingPhase
    //   - remove damage
    //   - pass the turn to opponent
    $('.turn-phase-icon').removeClass('current-phase');
    $('.ending-phase').addClass('current-phase');

    // clear damage
    var actions = this.zones.battlefield.filter(function(card) {
                    return 0 != card.getDamage() && card.isType('creature');
                }).map(function(card){
                    return card.clearDamage();
                });

    // discard down to hand limit
    if (this.zones.hand.length) {
        var i=0;
        for (var i=this.zones.hand.length-1; i != this.handLimit-1; i--) {
            var card = this.zones.hand.models[i];
            actions.push(card.moveTo(this.getZone('graveyard')));
        }
    }

    // run actions
    this.addGameActionGroup('Ending Phase', actions);

    this._passPriority(callback);
}

Player.prototype.boardWipe = function(zone, cardType) {
    var actions = this.zones.battlefield
        .filter(function(card) {
            if (!cardType) {
                return card.isSelected();
            }
            return card.isType(cardType);
        })
        .map(function(card) {
            return card.moveTo(zone);
        });
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
    var card = this.getZone('library').draw(this.getZone('hand'));
    return card;
}

Player.prototype.drawCards = function(n) {
    var self = this;
    var actions = [];
    for (var i=0; i<n; i++) {
        actions.push(
            this.getZone('library').draw(this.getZone('hand'))
        );
    }
    this.addGameActionGroup('Draw ' + n + ' cards', actions);
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
                result.value &&
                    self.addGameAction(card.moveTo(self.getZone(result.value)));
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
        this.addGameAction(card.moveTo(this.getZone('battlefield')));
    } else {
        this.addGameAction(card.moveTo(this.getZone('graveyard')));
    }

    callback && callback();
}

Player.prototype.getGroup = function(card) {
    var _hsh = card.md5();
    if (!this.groups[_hsh]) {
        this.groups[_hsh] = new CardGroupView({
            el: $('<div>', {id: _hsh})
                .addClass('mtgcard mtgcard-group')
                .addClass(card.isType('creature') ? 'col-md-2' : 'col-md-4' )
                .addClass(card.getTypes().join(' '))
                .hide()
        });
        if (card.isType('creature')) {
            $('.battlefield .creatures').append(
                this.groups[_hsh].$el
            );
        } else {
            $('.battlefield .noncreatures').append(
                this.groups[_hsh].$el
            );
        }
    }
    return this.groups[_hsh];
}

// Player.prototype._groupPermanents = function() {
//     var self = this;
//
//     // needs changed
//     for (var _hsh in this.groups) {
//         this.groups[_hsh].destroy();
//     }
//
//     this.groups = {};
//
//     var battlefield = this.getZone('battlefield');
//     for (var i=0; i<battlefield.length; i++) {
//         card = battlefield.models[i];
//         var _hsh = card.md5();
//         if (!this.groups[_hsh]) {
//             var $container = $('<div>')
//                 .addClass('mtgcard')
//                 .addClass(card.isType('creature') ? 'col-md-2' : 'col-md-4' )
//                 .addClass(card.getTypes().join(' '));
//
//             this.groups[_hsh] = new CardGroupView({
//                 el: $container
//             });
//
//             if (card.isType('creature')) {
//                 $('.battlefield .creatures').append($container);
//             } else {
//                 $('.battlefield .noncreatures').append($container);
//             }
//
//         }
//         this.groups[_hsh].addCard(card);
//     };
// }
