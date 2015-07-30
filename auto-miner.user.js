// ==UserScript==
// @name         Auto Miner
// @namespace    https://github.com/donsequitur/
// @version      0.9
// @description  Place bets automatically on Salty Bet
// @author       DonSequitur
// @downloadURL  https://github.com/donsequitur/auto-miner/raw/master/auto-miner.user.js
// @icon         https://cdn.rawgit.com/donsequitur/auto-miner/master/fat_illuminati.png
// @match        http://www.saltybet.com/*
// @require      https://rawgit.com/knadh/localStorageDB/v2.3.1/localstoragedb.js
// @grant        none
// ==/UserScript==

console.log("Let's get salty!");
var start_time = new Date();
var db = new localStorageDB("salt", localStorage);

if( db.isNew() ) {
    db.createTable("Fighter", [
        "name",
        "seen",
        "wins",
        "favored",
        "bets_made",
        "bets_won",
        "elo",
    ]);

    db.createTable("Meta", [
        "seen",
        "betted_on",
        "won",
        "wagered",
        "amount_won"
    ]);

    db.commit();
}

var stats = {};
wait_for_bets_to_start();


// Bets are locked until the next match.
function wait_for_match_to_start(fighter1, fighter2) {
    var bets_are_locked = /Bets are locked until the next match\./;
    var status = $('#betstatus').text();
    status = status || 'COULD NOT FIND';

    if(bets_are_locked.test(status)) {
        console.log('Match Started!');
        wait_for_match_to_end(fighter1, fighter2);
    }
    else {
        setTimeout(wait_for_match_to_start,1000, fighter1, fighter2);
        return;
    }
}

// Igniz scarlet wins! Payouts to Team Red.
function wait_for_match_to_end(fighter1, fighter2) {
    var winner_declared = /(.*?) wins! Payouts to Team (Blue|Red)\./;
    var status = $('#betstatus').text();
    status = status || 'COULD NOT FIND';

    var matches = status.match(winner_declared);
    if (matches) {
        var winner = matches[1];
        var winning_color = matches[2];
        store_results(fighter1, fighter2, winner);
        console.log('Match ended! Winner was ' + winner + ' (' + winning_color + ')');
        wait_for_bets_to_start();

    }
    else {
        setTimeout(wait_for_match_to_end,1000, fighter1, fighter2);
    }
}


// Bets are OPEN!
function wait_for_bets_to_start() {
    var betting_open = /Bets are OPEN!/;
    var status = $('#betstatus').text();
    status = status || 'COULD NOT FIND';


    if (betting_open.test(status)) {
        var balance = $('#balance').text();
        console.log('Now accepting bets! We have $' + balance + ' Salty Bucks to spend.');
        var fighter1 = $('#player1')[0].value;
        var fighter2 = $('#player2')[0].value;
        var matchup = {};
        if (fighter1 == fighter2) {
            console.log('A mirror match! Sitting this one out.');
            wait_for_match_to_end();
        }
        fighter1 = get_fighter(fighter1);
        fighter2 = get_fighter(fighter2);
        console.log(fighter1.name + ' (' + fighter1.elo + ') vs. ' + fighter2.name + ' (' + fighter2.elo + ')');

        get_odds(fighter1, fighter2);
        place_bet(fighter1, fighter2);
        wait_for_match_to_start(fighter1, fighter2);
    }
    else {
        setTimeout(wait_for_bets_to_start, 1000);
    }
}

function get_fighter(fighter_name) {
    var fighter = db.queryAll("Fighter", {
        query: {name: fighter_name}
    })[0];

    if (!fighter) {
        var id = db.insert("Fighter", {
            name: fighter_name,
            seen: 1,
            wins: 0,
            favored: 0,
            bets_made: 0,
            bets_won: 0,
            elo: 1400
        });
        fighter = db.queryAll("Fighter",{query:{ID: id}})[0];
    }
    else {
        fighter.seen++;
    }

    console.log(fighter);
    return fighter;
}

// returns percentage change figher1 will beat fighter2
// 1 - this number is chance fighter 2 will win
function get_odds(fighter1, fighter2) {
    //Ea = 1/(1 + 10 ^ ((Rb-Ra) / 400) )
    fighter1.odds =  1/(1 + Math.pow(10,(Math.abs(fighter2.elo - fighter1.elo) / 400)));
    fighter2.odds = 1 - fighter1.odds;
    return;
}

function store_results(fighter1, fighter2, winner) {
    if (fighter1.name == winner) {
        fighter1.wins++;
        fighter1.bets_won++;
        fighter1.elo = Math.round(fighter1.elo + (30 * (1 - fighter1.odds)));
        fighter2.elo = Math.round(fighter2.elo + (30 * (0 - fighter1.odds)));
    }
    else {
        fighter2.wins++;
        fighter2.bets_won++;
        fighter2.elo = Math.round(fighter2.elo + (30 * (1 - fighter2.odds)));
        fighter1.elo = Math.round(fighter1.elo + (30 * (0 - fighter2.odds)));
    }
    console.log(fighter1.name + " new rating: " + fighter1.elo);
    console.log(fighter2.name + " new rating: " + fighter2.elo);

    db.insertOrUpdate("Fighter", {ID: fighter1.ID}, fighter1);
    db.insertOrUpdate("Fighter", {ID: fighter2.ID}, fighter2);
}

function place_bet(fighter1, fighter2) {
    var interval = Math.floor((Math.abs(fighter1.odds - fighter2.odds) + 10) / 10);
    if (fighter1.odds > fighter2.odds) {
        console.log("I think " + fighter1.name + " will win with a " + (fighter1.odds * 100) + "% probability");
        console.log("Betting " + interval + "0% on " + fighter1.name);
        $('#interval' + interval).click();
        $('#player1').click();
        fighter1.bets_made++
    }
    else if (fighter2.odds > fighter1.odds) {
        console.log("I think " + fighter2.name + " will win with a " + (fighter2.odds * 100) + "% probability");
        console.log("Betting " + interval + "0% on " + fighter2.name);
        $('#interval' + interval).click();
        $('#player2').click();
        fighter2.bets_made++
    }
    else {
        console.log("I don't know enough about these fighters to make a good bet.");
        console.log("Betting randomly");
        $('#interval1').click();
        var lucky = Math.floor((Math.random() * 2) + 1);
        $('#player' + lucky).click();
    }
}
