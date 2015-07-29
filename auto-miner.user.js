// ==UserScript==
// @name         Auto Miner
// @namespace    https://github.com/donsequitur/
// @version      0.6
// @description  Place bets automatically on Salty Bet
// @author       DonSequitur
// @downloadURL  https://github.com/donsequitur/auto-miner/raw/master/auto-miner.user.js
// @icon         https://cdn.rawgit.com/donsequitur/auto-miner/master/fat_illuminati.png
// @match        http://www.saltybet.com/*
// @require      https://code.jquery.com/jquery-1.11.3.js
// @require      https://rawgit.com/knadh/localStorageDB/v2.3.1/localstoragedb.js
// @grant        none
// ==/UserScript==

console.log("Let's get salty!");

var db = new localStorageDB("salt", localStorage);

if( db.isNew() ) {
    db.createTable("Fighter", [
        "name",
        "matches",
        "wins",
        "first_encountered",
        "last_encountered",
        "amount_wagered",
        "amount_won",
        "bets_made",
        "bets_won"
    ]);

    db.createTable("Matchup", [
        "fighterA",
        "fighterB",
        "first_encountered",
        "last_encountered",
        "times_encountered",
        "fighterA_wins",
        "fighterB_wins",
        "fighterA_wagers",
        "fighterB_wagers",
        "our_fighterA_bets",
        "our_fighterB_bets",
        "our_fighterA_wins",
        "our_fighterB_wins"
    ]);


    db.createTable("Fight", [
        "fighterA",
        "fighterB",
        "time",
        "winner",
        "fighterA_wagers",
        "fighterB_wagers",
        "our_bet",
        "our_wager"
    ]);

    db.commit();
}

var current_fight = {};
wait_for_bets_to_start();


// Bets are locked until the next match.
function wait_for_match_to_start(fighterA, fighterB, matchup) {
    var bets_are_locked = /Bets are locked until the next match\./;
    var status = $('#betstatus')[0].innerHTML;
    status = status || 'COULD NOT FIND';

    if(bets_are_locked.test(status)) {
        console.log('Match Started!');
        wait_for_match_to_end(fighterA, fighterB, matchup);
    }
    else {
        setTimeout(wait_for_match_to_start,1000);
        return;
    }
}

// Igniz scarlet wins! Payouts to Team Red.
function wait_for_match_to_end(fighterA, fighterB, matchup) {
    var winner_declared = /(.*?) wins! Payouts to Team (Blue|Red)\./;
    var status = $('#betstatus')[0].innerHTML;
    status = status || 'COULD NOT FIND';

    var matches = status.match(winner_declared);
    if (matches) {
        var winner = matches[1];
        var winning_color = matches[2];
        console.log('Match ended! Winner was ' + winner + ' (' + winning_color + ')');
        wait_for_bets_to_start();

    }
    else {
        setTimeout(wait_for_match_to_end,1000);
    }
}


// Bets are OPEN!
function wait_for_bets_to_start() {
    var betting_open = /Bets are OPEN!/;
    var status = $('#betstatus')[0].innerHTML;
    status = status || 'COULD NOT FIND';

    if (betting_open.test(status)) {
        console.log('Now accepting bets!');
        var fighter1 = $('player1').innerHTML;
        var fighter2 = $('player2').innerHTML;

        var sorted_fighters = [fighter1, fighter2];
        var fighterA = sorted_fighters[0];
        var fighterB = sorted_fighters[1];
        var matchup = {};
        //var fighterA = get_fighter(sorted_fighters[0]);
        //var fighterB = get_fighter(sorted_fighters[1]);
        
        // var matchup = get_matchup(fighterA.name, fighterB.name);

        // var bet;
        // var confidence;
        // if (matchup.fighterA_wins > matchup.fighterB_wins) {
        //     fight.our_bet =
        // }

        // place_bet(bet, matchup, wager);
        wait_for_match_to_start(fighterA, fighterB, matchup);
    }
    else {
        setTimeout(wait_for_bets_to_start, 1000);
    }
}

// function get_fighter(fighter_name) {
//     var fighter = db.queryAll("Fighter", {
//         query: {name: contestant}
//     })[0];

//     if (!fighter) {
//         var id = db.insert("Fighter", {
//             name: fighter_name
//             matches: 1,
//             wins: 0,
//             first_encountered: new Date();
//             last_encountered: new Date();
//             amount_wagered: 0;
//             amount_won: 0,
//             bets_made: 0,
//             bets_won: 0
//         });
//         fighter = db.queryAll("Fighter",{id: id});
//     }
//     else {
//         fighter.matches++;
//         fighter.last_encountered = new Date();
//     }

//     return fighter;
// }

// function get_matchup(fighterA_name, fighterB_name) {
//     var matchup = db.queryAll("Matchup", {
//         query: {
//             fighterA: fighterA_name,
//             fighterB: fighterB_name
//         }
//     })[0];

//     if (!matchup) {
//         var id = db.insert("Matchup", {
//             fighterA: fighterA_name,
//             fighterB: fighterB_name,
//             times_encountered: 1,
//             first_encountered: new Date(),
//             last_encountered: new Date(),
//             fighterA_wins: 0,
//             fighterB_wins: 0,
//             fighterA_wagers: 0,
//             fighterB_wagers: 0,
//             our_fighterA_bets: 0,
//             our_fighterB_bets: 0,
//             our_fighterA_wins: 0,
//             our_fighterB_wins: 0
//         });
//         matchup = db.queryAll("Matchup",{id: id});
//     }
//     else {
//         matchup.times_encountered++;
//         matchup.last_encountered = new Date();
//     }

//     return matchup;
// }

// function place_bet(fighter, matchup, our_wager) {
//     fighter.bets_made++;
//     fighter.amount_wagered += our_wager;
//     var our_fighter;
//     if (matchup.fighterA == fighter.name) {
//         our_fighter = 'fighterA';
//     }
//     else {
//         our_fighter = 'fighterB';
//     }

//     matchup['our_' + our_fighter + '_bets']++;
//     matchup['our_' + our_fighter + '_wagers']+= our_wager;
//     return;
// }