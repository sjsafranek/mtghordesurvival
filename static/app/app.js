
localStorage.clear();


// TODO
//  - make Zone views

var zombie;


// function toast(message) {
//     var $elem = $('<div>').append(
//         new Date().toISOString().split('.')[0],
//         ': ',
//         message,
//     );
//     $('#gameLog').append($elem);
//     $elem.get(0).scrollIntoView();
// }





var player = new Player();


// Build deck
var deckLists = {
    Zombies: 'count,name\n1,Call to the Grave\n2,Bad Moon\n1,Plague Wind\n1,Damnation\n1,Yixlid Jailer\n1,Forsaken Wastes\n2,Nested Ghoul\n2,Infectious Horror\n2,Delirium Skeins\n1,Blind Creeper\n2,Soulless One\n2,Vengeful Dead\n1,Fleshbag Marauder\n1,Carrion Wurm\n3,Maggot Carrier\n4,Cackling Fiend\n1,Death Baron\n1,Grave Titan\n2,Severed Legion\n1,Skulking Knight\n1,Undead Warchief\n1,Twilights Call\n1,Army of the Damned\n1,Endless Ranks of the Dead\n2,Rotting Fensnake\n1,Unbreathing Horde\n1,Walking Corpse\n5,Zombie Giant\n55,Zombie'
}



function fetchCard(card_name, callback) {
    $.ajax({
        method: 'GET',
        url: 'https://api.scryfall.com/cards/named?exact=' + card_name,
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

    var data = d3.csvParse(deckList, function(d) {
        return d;
    });

    data.map(function(d) {
        var cards = [];
        for (var i=0; i<parseInt(d.count); i++) {
            // lazy load the card data
            var card = new Card({'name': d.name });
            player.getZone('library').add(card);
            cards.push(card);
            player.getZone('library').shuffle();
        }
        player.updateCounts();

        fetchCard(d.name, function(cardData) {
            if ('Zombie' == cardData.name) {
                zombie = cardData;
            }
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
        // title: 'Choose a Horde',
        // customClass: 'game-choose-horde-container',
        imageUrl: 'static/app/icons/XLarge/Hand Logo.svg',
        // imageHeight: 300,
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
            buildLibrary(deckLists[results.value], numberOfPlayers);
            return;
        }
        chooseHorde(callback);
    });
}

chooseHorde();



$('#addZombie').on('click', function(e) {
    player.resolveSpell(new Card(zombie));
});
