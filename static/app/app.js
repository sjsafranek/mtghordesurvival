
localStorage.clear();


// TODO
//  - make Zone views

var zombie;


function toast(message) {
    var $elem = $('<div>').append(
        new Date().toISOString().split('.')[0],
        ': ',
        message,
    );
    $('#gameLog').append($elem);
    $elem.get(0).scrollIntoView();
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
            player.zones.library.shuffle();
        }
        player.updateCounts();
    });
});


// TODO choose Horde

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
            while (library.length != n) {
                var card = library.chooseRandom();
                card.destroy();
            }
        }
    });

$('#addZombie').on('click', function(e) {
    player.resolveSpell(zombie);
});
