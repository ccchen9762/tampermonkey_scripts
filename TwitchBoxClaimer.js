// ==UserScript==
// @name         Twitch reward box claimer
// @version      0.1.1
// @description  click the box automatically when available
// @author       moom9762
// @match        https://www.twitch.tv/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitch.tv
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function checkButton() {
        let claimButton = document.evaluate('.//*[@aria-label="Claim Bonus"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

        if (claimButton) {
            claimButton.click();
            console.log('(Box Claimer) [Info] Claim button clicked.');
        }
    }

    // check claim button every 10 seconds
    setInterval(checkButton, 10000);
    console.log('(Box Claimer) [Info] Script started.');
})();