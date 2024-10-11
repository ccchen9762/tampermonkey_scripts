// ==UserScript==
// @name         Claim the stupid box
// @version      2024-10-06
// @description  bad twitch
// @author       moom9762
// @match        https://www.twitch.tv/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitch.tv
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    function checkButton() {
        var claimButton = document.evaluate('.//*[@aria-label="Claim Bonus"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;

        if (claimButton) {
            console.log('[Info] claim button found.')
            claimButton.click();
        }
    }

    // check claim button every 10 seconds
    setInterval(checkButton, 10000);
})();