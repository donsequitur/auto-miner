// ==UserScript==
// @name         Auto Miner
// @namespace    https://github.com/donsequitur/
// @version      0.9
// @description  Place bets automatically on Salty Bet
// @author       DonSequitur
// @downloadURL  https://github.com/donsequitur/auto-miner/raw/master/auto-miner.user.js
// @icon         https://cdn.rawgit.com/donsequitur/auto-miner/master/fat_illuminati.png
// @match        http://www.saltybet.com/*
// @require      https://code.jquery.com/jquery-2.1.4.js
// @require      https://rawgit.com/knadh/localStorageDB/v2.3.1/localstoragedb.js
// @require      http://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/js/toastr.min.js
// @resource     http://cdnjs.cloudflare.com/ajax/libs/toastr.js/latest/css/toastr.min.css
// @grant        GM_addStyle
// @grant        GM_getResourceText
// ==/UserScript==

var jqUI_CssSrc = GM_getResourceText("jqUI_CSS");
GM_addStyle(jqUI_CssSrc);


toastr.options = {
  "closeButton": true,
  "debug": false,
  "newestOnTop": false,
  "progressBar": true,
  "positionClass": "toast-top-right",
  "preventDuplicates": true,
  "onclick": null,
  "showDuration": "300",
  "hideDuration": "1000",
  "timeOut": "10000",
  "extendedTimeOut": "1000",
  "showEasing": "swing",
  "hideEasing": "linear",
  "showMethod": "fadeIn",
  "hideMethod": "fadeOut"
}

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
        "amount_won",
        "average_elo"
    ]);

    db.insert("Meta", {
       seen: 0,
       betted_on: 0,
       won: 0,
       wagered: 0,
       amount_won: 0,
       average_elo: 1400
    });

    db.commit();
}


var meta = {};
refresh_meta();

say("Let's get salty! I have info on " + meta.seen + " fighters.");
wait_for_bets_to_start();


// Bets are locked until the next match.
function wait_for_match_to_start(fighter1, fighter2) {
    var bets_are_locked = /Bets are locked until the next match\./;
    var status = $('#betstatus').text();
    status = status || 'COULD NOT FIND';

    if(bets_are_locked.test(status)) {
        say('Match Started!');
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
        say('Match ended! Winner was ' + winner + ' (' + winning_color + ')');

        // Something wen't wrong
        if (!fighter1 || !fighter2) {
            wait_for_bets_to_start();
        }

        store_results(fighter1, fighter2, winner);
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
        say('Now accepting bets! We have $' + balance + ' Salty Bucks to spend.');
        var fighter1 = $('#player1').val();
        var fighter2 = $('#player2').val();
        var matchup = {};
        if (fighter1 == fighter2) {
            say('A mirror match! Sitting this one out.');
            wait_for_match_to_end();
        }

        fighter1 = get_fighter(fighter1);
        fighter2 = get_fighter(fighter2);
        say("Match #" + meta.seen + ': ' + fighter1.name + ' (' + fighter1.elo + ') vs. ' + fighter2.name + ' (' + fighter2.elo + ')');

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
        // Create a new fighter
        var id = db.insert("Fighter", {
            name: fighter_name,
            seen: 1,
            wins: 0,
            favored: 0,
            bets_made: 0,
            bets_won: 0,
            elo: meta.average_elo
        });
        fighter = db.queryAll("Fighter",{query:{ID: id}})[0];

        // Update average
        // This is nice and all, but we need to do a full update anyway after we update scores
        // meta.average_elo = Math.floor(((meta.average_elo * meta.seen) + meta.average_elo) / ++meta.seen);

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
    //Eb = 1/(1 + 10 ^ ((Ra-Rb) / 400) )
    fighter1.odds =  1/(1 + Math.pow(10,((fighter2.elo - fighter1.elo) / 400)));
    fighter2.odds =  1/(1 + Math.pow(10,((fighter1.elo - fighter2.elo) / 400)));
    return;
}

function store_results(fighter1, fighter2, winner) {

    if (fighter1.name == winner) {
        fighter1.wins++;
        fighter1.bets_won++;
        fighter1.elo = Math.round(fighter1.elo + (30 * (1 - fighter1.odds)));
        fighter2.elo = Math.round(fighter2.elo + (30 * (0 - fighter2.odds)));
        say(fighter1.name + "(winner) new rating: " + fighter1.elo);
        say(fighter2.name + "(loser) new rating: " + fighter2.elo);
    }
    else {
        fighter2.wins++;
        fighter2.bets_won++;
        fighter2.elo = Math.round(fighter2.elo + (30 * (1 - fighter2.odds)));
        fighter1.elo = Math.round(fighter1.elo + (30 * (0 - fighter1.odds)));
        say(fighter1.name + "(loser) new rating: " + fighter1.elo);
        say(fighter2.name + "(winner) new rating: " + fighter2.elo);
    }


    // Remove temporarily stored data
    delete fighter1.odds;
    delete fighter2.odds;

    db.insertOrUpdate("Fighter", {ID: fighter1.ID}, fighter1);
    db.insertOrUpdate("Fighter", {ID: fighter2.ID}, fighter2);
    refresh_meta();
    db.insertOrUpdate("Meta", {ID: meta.ID}, meta);
    db.commit();
}

function place_bet(fighter1, fighter2) {
    var difference = Math.abs(fighter1.odds - fighter2.odds) * 80;
    var nudge = 10; // roughly; minimum bet
    var interval = Math.floor((difference + nudge) / 10);

    // Go all-in on tournament mode since money resets each round
    if ($('#tournament-note').length && $('#tournament-note').is(":visible")) {
        say("Tournament mode! All In!");
        interval = 10;
    }

    if (fighter1.odds > fighter2.odds) {
        say("I think " + fighter1.name + " will win with a " + (Math.round(fighter1.odds * 10000) / 100) + "% probability");
        say("Betting " + interval + "0% on " + fighter1.name);
        $('#interval' + interval).click();
        $('#player1').click();
        fighter1.bets_made++
    }
    else if (fighter2.odds > fighter1.odds) {
        say("I think " + fighter2.name + " will win with a " + (Math.round(fighter2.odds * 10000) / 100) + "% probability");
        say("Betting " + interval + "0% on " + fighter2.name);
        $('#interval' + interval).click();
        $('#player2').click();
        fighter2.bets_made++
    }
    else {
        say("These players have about even odds.  Betting randomly");
        if ($('#tournament-note').length && $('#tournament-note').is(":visible")) {
            $('#interval10').click();
        }
        else {
            $('#wager').val(1);
        }

        var lucky = Math.floor((Math.random() * 2) + 1);
        $('#player' + lucky).click();
    }
    meta.bets_made++;

}

function refresh_meta() {
    meta = db.queryAll("Meta")[0];
    var total = 0;
    var row_count = 0;
    db.queryAll("Fighter").forEach(function(i) {
        total = total + i.elo;
        row_count++;
    });
    if (total && row_count) {
        meta.average_elo = Math.floor(total / row_count);
    }
    else {
        meta.average_elo = 1400;
    }
    meta.seen = row_count;
    console.log(meta);
}

function say(message) {
    toastr.success(message);
    console.log(message);
}