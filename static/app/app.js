
localStorage.clear();

var toolTip = new ToolTip();

var player = new Player();


var deckLists = {
    'Zombies': 'static/app/decks/zombies.tsv',
    // https://www.mtgvault.com/thesilenttaco/decks/horde-the-13-demon-lords
    '13 Demon Lords': 'static/app/decks/13-demon-lords.tsv'
}


function fetchDeckList(deckListUrl, callback) {
    d3.tsv(deckListUrl, function(d) {
            d.count = +d.count;
            return d;
        }).then(function(data) {
            callback && callback(null, data);
        })
        .catch(function(error){
            swal.fire({
                title: 'Error',
                text: error,
                type: 'error'
            }).then(function() {
                callback && callback(error);
            });
        });
}

function fetchCardByName(card_name, callback) {
    $.ajax({
        method: 'GET',
        url: 'https://api.scryfall.com/cards/named?exact=' + card_name,
    }).done(callback)
}

function fetchCardByScryFallId(card_id, callback) {
    $.ajax({
        method: 'GET',
        url: 'https://api.scryfall.com/cards/' + card_id,
    }).done(callback)
}

function buildLibrary(deckList, callback) {
    var loading = Swal.fire({
        title: 'Loading deck',
        onBeforeOpen: () => {
            Swal.showLoading()
        },
        showCancelButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false
    });

    deckList.map(function(d) {
        var cards = [];
        for (var i=0; i<parseInt(d.count); i++) {
            // lazy load the card data
            var card = new Card({'name': d.name });
            player.getZone('library').add(card);
            cards.push(card);
            player.getZone('library').shuffle();
        }
        player.updateCounts();

        var func = d.scryfall_id ?
            fetchCardByScryFallId : fetchCardByName;

        func(d.scryfall_id || d.name, function(cardData) {
            // allow users to play any card in deck
            player.addCard(cardData);
            // populate cards with ScryFall API data
            for (var i=0; i<cards.length; i++) {
                cards[i].set(cardData);
            }
        });

        loading.close();
        callback && callback();
    });
}

function numberOfPlayers(callback) {
    swal.fire({
            title: "Number of Players",
            input: "select",
            inputOptions: {
                '45': '1',
                '60': '2',
                '75': '3',
                '100': '4',
            },
            inputValue: '60',
            showCancelButton: false,
            allowOutsideClick: false,
            allowEscapeKey: false
        }).then(function(result){
            if (result.value) {
                var n = parseInt(result.value);
                var library = player.getZone('library');
                while (library.length > n) {
                    var card = library.chooseRandom();
                    card.destroy();
                }
                callback && callback();
            }
        });
}

function chooseHorde(callback) {
    var inputOptions = {};
    for (var i in deckLists) {
        inputOptions[i] = i;
    }
    Swal.fire({
        imageUrl: 'static/app/icons/XLarge/Hand Logo.svg',
        imageClass: 'game-logo-swal',
        input: 'select',
        inputOptions: inputOptions,
        inputValue: Object.keys(inputOptions)[0],
        inputPlaceholder: 'Choose a Horde',
        showCancelButton: false,
        allowOutsideClick: false,
        allowEscapeKey: false
    }).then(function(results) {
        if (results.value) {
            fetchDeckList(deckLists[results.value], function(err, data) {
                if (err) {
                    return chooseHorde(callback)
                }
                buildLibrary(data, numberOfPlayers);
            });
            return;
        }
        chooseHorde(callback);
    });
}

chooseHorde();
