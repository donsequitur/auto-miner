// ==UserScript==
// @name         Auto Miner
// @namespace    https://github.com/donsequitur/
// @version      0.4
// @description  Place bets automatically on Salty Bet
// @author       DonSequitur
// @downloadURL  https://github.com/donsequitur/auto-miner/raw/master/auto-miner.user.js
// @icon         https://cdn.rawgit.com/donsequitur/auto-miner/master/fat_illuminati.png
// @match        http://www.saltybet.com/*
// @require      https://code.jquery.com/jquery-1.11.3.js
// @require      https://rawgit.com/dfahlander/Dexie.js/master/dist/latest/Dexie.min.js
// @grant        none
// ==/UserScript==

console.log("Let's get salty!");


/*
|---------------------------------------------
| Make a database connection
|---------------------------------------------
*/

var db = new Dexie('Salt');


// Define a schema
// Fighters:
//   Desc: Collected info about each known fighter
//   Columns: name, wins, fights
//
// Matchups:
//   Desc: Information about fighter matchups seen. Aggregate of Fights
//   Columns: ++id, player1, player2, matches_seen, player1_wins, player2_wins
//
// Fights:
//   Desc: Information collected form each fight
//   Columns: ++id, player1, player2, winner, player1_wagered, player2_wagered, our_bet, our_wager
//
// Meta:
//   Desc: Metadata on how script is doing
//   Columns: amount_won, bets_made
db.version(1)
    .stores({
        fighters: 'name',
        matchups: 'player1, player2, [player1+player2]',
        fights: '',
        meta: ''
    });


// Open the database
db.open()
    .catch(function(error){
        alert('Uh oh : ' + error);
    });


//var fighter1 = get_fighter_info('Tyrion');
//var fighter2 = get_fighter_info('Tywin');

get_fighter_info('Tyrion', function(fighter1) {
    console.log(fighter1);
});




//var matchup = get_matchup({player1:fighter1, player2:fighter2});


function get_fighter_info(fighter_name, cb) {

    var fighter = {
        'empty': true
    };

    // Retrieve fighter from databae
    db.fighters
        .where('name')
        .equals(fighter_name)
        .each(function(result) {
            console.log(fighter.empty);
            console.log('Found fighter: ' + fighter_name);
            fighter = result;
        })
        .then(function() {
            if (fighter.empty) {
                delete fighter.empty;
                fighter.name = fighter_name;
                fighter = add_new_fighter(fighter);
            }
        })
        .then(function() {
            console.log('this part!');

            // Get data on thi fighter's matchups
            fighter.matchups = [];
            db.matchups
                .where('player1')
                .equals('fighter_name')
                .or('player2')
                .equals('fighter_name')
                .each(function(matchup) {
                    fighter.matchups.push(matchup);
                });
                
            // Callback
            cb(fighter);
        });
}

function add_new_fighter(fighter) {
    console.log('adding fighter! ' + fighter.name);
    db.fighters
        .add(fighter);

    return fighter;
}

function sort_fighters(obj) {

    if (   !obj.hasOwnProperty('player1')
        || !obj.hasOwnProperty('player2'))
    {
        return;
    }

    // Force alphabetical order for fighter names so we don't get
    // duplicate entries where A,B and B,A are separate
    var sorted_fighters = [obj.player1, obj.player2].sort();
    obj.player1 = sorted_fighters[0];
    obj.player2 = sorted_fighters[1];
}

function get_current_date() {
    return new Date().toJSON().slice(0,10);
}

// Input: {player1, player2, winner, p1_wager, p2_wager, our_bet, our_wager}
function add_fight(fight) {

    sort_fighters(fight);

    fight.added = get_current_date();

    db.fights
        .add(fight);

    update_matchup(fight);
    return fight;
}

function update_matchup(fight) {
    var matchup = matchup(fight);
    // TODO: update matchup statistics
}

function get_matchup(matchup) {
    matchup.empty = true;

    sort_fighters(matchup);

    db.matchups
        .where('player1')
        .equals(matchup.player1)
        .and('player2')
        .equals(matchup.player2)
        .each(function(result) {
            matchup = result;
        });

    if (matchup.empty) {
        delete matchup.empty;
        matchup.first_encountered = get_current_date();
        add_matchup(matchup);
    }

    return matchup;
}

function add_matchup(matchup) {
    console.log('Adding matchup! ' + matchup.player1 + ' :: ' + matchup.player2);
}