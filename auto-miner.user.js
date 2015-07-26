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
    


var get_fighter_info = function(fighter_name) {
    var fighter = {};
    
    // Retrieve fighter from databae
    db.fighters
        .where('name')
        .equals(fighter_name)
        .each(function(result) {
           fighter = result;
           return;
        });
    
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

    return fighter;
}


