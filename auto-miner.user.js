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
// @grant        GM_addStyle
// @grant        GM_getResourceText
// ==/UserScript==

var state = JSON.parse(localStorage.getItem('state')) || {};

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


add_ui();
var start_time = new Date();
updateUI('start_time', start_time.toLocaleString());
reinitialize_state();
refresh_meta();
wait_for_bets_to_start();


// Bets are locked until the next match.
function wait_for_match_to_start(fighter1, fighter2) {
    var bets_are_locked = /Bets are locked until the next match\./;
    var status = $('#betstatus').text();
    status = status || 'COULD NOT FIND';

    //updateUI('status', status);


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

    //updateUI('status', status);

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

    //updateUI('status', status);

    if (betting_open.test(status)) {
        var balance = $('#balance').text();
        updateUI('balance', balance);
        say('Now accepting bets! We have $' + balance + ' Salty Bucks to spend.');
        var fighter1 = $('#player1').val();
        var fighter2 = $('#player2').val();
        var matchup = {};

        fighter1 = get_fighter(fighter1);
        updateUI('fighter1',fighter1);
        fighter2 = get_fighter(fighter2);
        updateUI('fighter2',fighter2);

        if (fighter1 == fighter2) {
            say('A mirror match! Sitting this one out.');
            wait_for_match_to_end();
        }



        say("Match #" + state.matches_seen + ': ' + fighter1.name + ' (' + fighter1.elo + ') vs. ' + fighter2.name + ' (' + fighter2.elo + ')');

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
        updateUI('fighters_seen', (state.fighters_seen + 1));
        updateUI('fighters_seen_this_session', (state.fighters_seen_this_session + 1));
        // Create a new fighter
        var id = db.insert("Fighter", {
            name: fighter_name,
            seen: 1,
            wins: 0,
            favored: 0,
            bets_made: 0,
            bets_won: 0,
            elo: state.average_elo
        });
        fighter = db.queryAll("Fighter",{query:{ID: id}})[0];

        // Update average
        // This is nice and all, but we need to do a full update anyway after we update scores
        // meta.average_elo = Math.floor(((meta.average_elo * meta.seen) + meta.average_elo) / ++meta.seen);

    }
    else {
        fighter.seen++;
    }
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

    var winner;
    //RwinnerNew = Rwinner + K * (1 - Ewinner)
    //RloserNew  = Rloser  + K * (0 - Eloser )
    if (fighter1.name == winner) {
        fighter1.wins++;
        fighter1.bets_won++;
        fighter1.elo = Math.round(fighter1.elo + (30 * (1 - fighter1.odds)));
        fighter2.elo = Math.round(fighter2.elo + (30 * (0 - fighter2.odds)));
        say(fighter1.name + " (winner) new rating: " + fighter1.elo);
        say(fighter2.name + " (loser) new rating: " + fighter2.elo);
        updateUI('winner', 1);
    }
    else {
        fighter2.wins++;
        fighter2.bets_won++;
        fighter2.elo = Math.round(fighter2.elo + (30 * (1 - fighter2.odds)));
        fighter1.elo = Math.round(fighter1.elo + (30 * (0 - fighter1.odds)));
        say(fighter1.name + " (loser) new rating: " + fighter1.elo);
        say(fighter2.name + " (winner) new rating: " + fighter2.elo);
        updateUI('winner', 2);
    }


    // Remove temporarily stored data
    delete fighter1.odds;
    delete fighter2.odds;

    if (state.favorite == state.winner) {
        updateUI('bets_won', state.bets_won + 1);
        updateUI('bets_won_percent', Math.round((state.bets_won / state.bets_made) * 100));
        updateUI('bets_won_this_session', state.bets_won_this_session + 1);
        updateUI('bets_won_percent_this_session', Math.round((state.bets_won_this_session / state.bets_made_this_session) * 100));
        updateUI('amount_won', state.amount_won + state.amount_wagered);
        updateUI('amount_won_this_session', state.amount_won_this_session + state.amount_wagered_this_session);
    }
    else {
        updateUI('amount_won', state.amount_won - state.amount_wagered);
        updateUI('amount_won_this_session', state.amount_won_this_session - state.amount_wagered_this_session);
    }
    updateUI('matches_seen', state.matches_seen + 1);
    updateUI('matches_seen_this_session', state.matches_seen_this_session + 1);


    db.insertOrUpdate("Fighter", {ID: fighter1.ID}, fighter1);
    db.insertOrUpdate("Fighter", {ID: fighter2.ID}, fighter2);
    refresh_meta();
    db.commit();
}

function place_bet(fighter1, fighter2) {
    var balance = parseInt($('#balance').text().replace(/\,/,''));
    var difference = Math.abs(fighter1.odds - fighter2.odds);
    var wager = Math.floor((balance * difference) + 1);
    var favorite = 1;

    if (fighter1.odds > fighter2.odds) {
        say("I think " + fighter1.name + " will win with a " + (Math.round(fighter1.odds * 10000) / 100) + "% probability");
        say("Betting $" + wager + " on " + fighter1.name);
        favorite = 1;
        fighter1.bets_made++
    }
    else if (fighter2.odds > fighter1.odds) {
        say("I think " + fighter2.name + " will win with a " + (Math.round(fighter2.odds * 10000) / 100) + "% probability");
        say("Betting $" + wager + " on " + fighter2.name);
        favorite = 2;
        fighter2.bets_made++
    }
    else {
        say("These players have about even odds.  Betting randomly");
        wager = 1;
        var lucky = Math.floor((Math.random() * 2) + 1);
        favorite = lucky;
    }

    updateUI('bets_made', state.bets_made + 1);
    updateUI('bets_made_this_session', state.bets_made_this_session + 1);
    updateUI('favorite', favorite);

    // Go all-in on tournament mode since money resets each round
    if ($('#tournament-note').length && $('#tournament-note').is(":visible")) {
        say("Tournament mode!");
        if (wager < 1550) {
            wager = wager + 1550;
        }
    }

    // Just a safety
    if (wager > balance) {
        wager = balance;
    }

    updateUI('amount_wagered', state.amount_wagered + wager);
    updateUI('amount_wagered_this_session', state.amount_wagered_this_session + wager);

    $('#wager').val(wager);
    $('#player' + favorite).click();
}

function refresh_meta() {
    var total = 0;
    var row_count = 0;
    db.queryAll("Fighter").forEach(function(i) {
        total = total + i.elo;
        row_count++;
    });
    if (total && row_count) {
        updateUI('average_elo',Math.floor(total / row_count));
    }
    else {
        updateUI('average_elo',1400);
    }


    updateUI('fighters_seen',row_count);
}

function say(message) {
    console.log(message);
}


function reinitialize_state() {
    updateUI('fighters_seen', state.fighters_seen || 0);
    updateUI('matches_seen', state.matches_seen || 0);
    updateUI('bets_made', state.bets_made || 0);
    updateUI('bets_won', state.bets_won || 0);
    updateUI('bets_won_percent', state.bets_won_percent || 0);
    updateUI('amount_wagered', state.amount_wagered || 0);
    updateUI('amount_won', state.amount_won || 0);
    updateUI('starting_balance', get_balance());

    updateUI('fighters_seen_this_session',0);
    updateUI('matches_seen_this_session',0);
    updateUI('bets_made_this_session',0);
    updateUI('bets_won_this_session',0);
    updateUI('bets_won_percent_this_session',0);
    updateUI('amount_wagered_this_session',0);
    updateUI('amount_won_this_session',0);

    updateUI('new_fighters_seen_this_session',0);

    state.mode = state.mode || 'matchmaking';


    state.fighter1 = {};
    state.fighter2 = {};
}

function get_balance() {
    return parseInt($('#balance').text().replace(/\,/,''));
}

function updateUI(item, val) {
    // Update last active
    var time = new Date();
    state['last_active'] = time.toLocaleString();

    // Store previous value
    var old = state[item];

    // set new value
    state[item] = val;

    // save to storage
    localStorage.setItem('state', JSON.stringify(state));

    say("Received update " + item + " to " + val);

    // change corresponding UI item
    $('#' + item).html(val);

    if (old !== val) {
        say("Updated " + item + " from " + old + " to " + val);
        // flash item if changed;
    }
    else {
        say("No change needed.");
    }
}

function add_ui() {
    GM_addStyle('\
    @import url(//fonts.googleapis.com/css?family=Open+Sans+Condensed:300);\
    #auto-miner-ui * {\
        font-family: "Open Sans Condensed", sans-serif;\
    }\
    #auto-miner-ui  {\
        padding: 0 0 0 3;\
        margin: 0;\
        background-color: white;\
    }\
    #auto-miner-ui h1 {\
        padding: 0 0 0 3;\
        margin: 0;\
    }\
    #auto-miner-ui h2 {\
        padding: 0;\
        margin: 0;\
        vertical-align: bottom;\
    }\
    #auto-miner-ui h3 {\
        padding: 0;\
        margin: 0;\
    }\
    #auto-miner-ui table {\
        border-collapse: collapse;\
    }\
    #auto-miner-ui th {\
        text-align: left;\
    }\
    #auto-miner-ui td {\
        white-space: nowrap;\
        padding-right: 10px;\
    }\
    #auto-miner-ui .small_header {\
        vertical-align: bottom;\
    }\
    #auto-miner-ui .header_bar th {\
        vertical-align: bottom;\
        border-bottom: 1px solid black;\
    }');

    var html = '\
    <div id="auto-miner-ui" >\
        <h1>Auto Miner</h1>\
        <table id="global-stats">\
                <tr class="header_bar">\
                    <th>\
                        <h2>Global Stats</h2>\
                    </th>\
                    <th class="small_header">Total</th>\
                    <th class="small_header">Session</th>\
                </tr>\
                <tr>\
                    <th width="100%">New Fighters seen</th>\
                    <td><span id="fighters_seen">--</span></td>\
                    <td><span id="fighters_seen_this_session">--</span></td>\
                </tr>\
                <tr>\
                    <th>Matches seen</th>\
                    <td><span id="matches_seen">--</span></td>\
                    <td><span id="matches_seen_this_session">--</span></td>\
                </tr>\
                <tr>\
                    <th>Bets made</th>\
                    <td><span id="bets_made">--</span></td>\
                    <td><span id="bets_made_this_session">--</span></td>\
                </tr>\
                <tr>\
                    <th>Bets won</th>\
                    <td><span id="bets_won">--</span> (<span id="bets_won_percent">--</span>%)</td>\
                    <td><span id="bets_won_this_session">--</span> (<span id="bets_won_percent_this_session">--</span>%)</td>\
                </tr>\
                <tr>\
                    <th>Amount wagered</th>\
                    <td>$<span id="amount_wagered">--</span></td>\
                    <td>$<span id="amount_wagered_this_session">--</span></td>\
                </tr>\
                <tr>\
                    <th>Amount won</th>\
                    <td>$<span id="amount_won">99,221</span></td>\
                    <td>$<span id="amount_won_this_session">-486</span></td>\
                </tr>\
                <!--<tr class="header_bar">\
                    <th  colspan="3">\
                        <h2>Last Fight</h2>\
                    </th>\
                </tr>\
                <tr>\
                    <th colspan="3">\
                        <span id="f1_old_name">Ken EX3</span> v.s. <span id="f2_old_name">Omega RyuToo</span>\
                    </th>\
                </tr>\
                <tr>\
                    <th>Us</th>\
                    <th>Fighter 1</th>\
                    <th>Fighter 2</th>\
                </tr>\
                <tr>\
                    <td>Odds</td>\
                    <td><span id="f1_old_odds">59.02</span>%</td>\
                    <td><span id="f2_old_odds">40.98</span>%</td>\
                </tr>\
                <tr>\
                    <td>Wagered</td>\
                    <td>$<span id="f1_old_wagered">653</span></td>\
                    <td>$<span id="f2_old_wagered">0</span></td>\
                </tr>\
                <tr>\
                    <td>Streak</td>\
                    <td><span id="f1_old_comm_wagered">-1</span></td>\
                    <td><span id="f2_old_comm_wagered">5</span></td>\
                </tr>\
                <tr>\
                    <th>Community</th>\
                    <th>Fighter 1</th>\
                    <th>Fighter 2</th>\
                </tr>\
                <tr>\
                    <td>Odds</td>\
                    <td><span id="f1_old_odds">85</span>%</td>\
                    <td><span id="f2_old_odds">15</span>%</td>\
                </tr>\
                <tr>\
                    <td>Wagered</td>\
                    <td>$<span id="f1_old_comm_wagered">653</span></td>\
                    <td>$<span id="f2_old_comm_wagered">6,789,423</span></td>\
                </tr>\
                <tr>\
                    <th colspan="3">\
                        \
                    </th>\
                </tr>-->\
        </table>\
    </div>\
    ';
    $('#sbettorswrapper').prepend(html);
}
