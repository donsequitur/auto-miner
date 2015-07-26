// ==UserScript==
// @name         Auto Salt
// @namespace    http://your.homepage/
// @version      0.1
// @description  Place bets automatically on Salty Bet
// @author       DonSequitur
// @match        http://www.saltybet.com/*
// @require      https://code.jquery.com/jquery-1.11.3.js
// @require      https://cdn.rawgit.com/dfahlander/Dexie.js/master/dist/latest/Dexie.min.js
// @grant        none
// ==/UserScript==

(function() {

    console.log("Let's get Salty!");

    var waiting_for_bet = setInterval(place_bet, 5000);
    var waiting_for_match;

    var wait_for_match = function() {
        if ($('player1').disabled) {
            console.log('Match Started!');
            clearInterval(waiting_for_match);
            waiting_for_bet = setInterval(place_bet, 5000);
        }
        else {
            console.log('Waiting for match to start...');
        }
    }

    var place_bet = function() {
        if (!$('player1').disabled) {
            var rand1 = Math.floor((Math.random() * 2000) + 1000);
            var rand2 = Math.floor((Math.random() * 2000) + 1000);
            setTimeout(function(){
                simulateClick('interval1');
                console.log('Betting 10%!');
                setTimeout(function(){
                    simulateClick('player1');
                    console.log('Betting on red!');
                }, rand1);
            }, rand2);

            console.log('Bet placed!');
            clearInterval(waiting_for_bet);
            waiting_for_match = setInterval(wait_for_match, 5000);
        }
        else {
            console.log('Waiting for betting time...');
        }
    }


    var simulateCLick = function(id) {
        var event = new MouseEvent('click', {
            'view': window,
            'bubbles': true,
            'cancelable': true
        });
        $(id).dispatchEvent(event);
    }



    var load = function (key){
        return JSON.parse(localStorage["yourKey"]);
    };

    var save = function(key, obj) {
        localStorage[key] = JSON.stringify(obj);
    };


})()




