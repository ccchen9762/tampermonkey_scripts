// ==UserScript==
// @name         Twitch Tools
// @version      0.3.1
// @description  List of tools for improving Twitch UX: 1. Auto claim bonus. 2. Prevent data saving mechanisms. 3. Provide portraint mode chatting.
// @author       ccchen9762
// @match        https://www.twitch.tv/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitch.tv
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    /* ========== Click claim button & support streamer button when available, checks periodically  ========== */
    function checkButton() {
        const claimButton = document.evaluate('.//*[@aria-label="Claim Bonus"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (claimButton) {
            claimButton.click();
            console.log('(Twitch tool) [Info] Claim button clicked.');
        }

        const closeSupportButton = document.evaluate('.//*[@aria-label="Return to stream"]', document, null, XPathResult.FIRST_ORDERED_NODE_TYPE, null).singleNodeValue;
        if (closeSupportButton) {
            closeSupportButton.click();
            console.log('(Twitch tool) [Info] Annonying support streamer button clicked. Ad block does not block anything anyway.');
        }
    }

    // check buttons every 10 seconds
    setInterval(checkButton, 10000);

    /* ========== Disable visibility state changes so twitch won't lower video quality ========== */

    // Override visibility properties
    Object.defineProperty(document, 'hidden', { value: false, writable: false });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: false });
    Object.defineProperty(document, 'webkitVisibilityState', { value: 'visible', writable: false });

    // Prevent visibility change events (for modern sites)
    document.hasFocus = function() { return true; };

    /* ========== Move chat under stream and hide info section when window becomes portrait mode ========== */
    /* grid-template-columns: left column's width, middle takes remaining, right column's width */
    const reorderCSS = `
        .main-container {
            display: grid !important;
            grid-template-columns: auto 1fr;
            grid-template-rows: auto 1fr;
        }
        .left-col {
            grid-column: 1;
            grid-row: 1 / span 2;
        }
        .middle-col {
            grid-column: 2;
            grid-row: 1;
        }
        .right-col {
            grid-column: 2;
            grid-row: 2;
            width: 100% !important;
        }
        .info-div {
            display: none !important;
        }
        .chat-div{
            width: 100% !important;
        }
    `;

    const reorderStyle = document.createElement('style');
    reorderStyle.type = 'text/css';
    reorderStyle.appendChild(document.createTextNode(reorderCSS));
    document.head.appendChild(reorderStyle);

    let portraitMode = false;
    let chatOffset = null; // store the chat initial position style offset

    // tab switching etc.
    window.addEventListener('visibilitychange', function(e) {
        console.log('(Twitch tool) [Info] Visibility changed');
        checkWindowRatio();
    });

    window.addEventListener('resize', function(e) {
        console.log('(Twitch tool) [Info] Resized');
        checkWindowRatio();
    });

    async function checkWindowRatio() {
        const mainContainer = document.getElementById('root').children[0].children[0].children[1];

        if(!mainContainer){
            console.log('(Twitch tool) [Error] Main container not found');
            return;
        }

        const leftCol = mainContainer.children[0];
        const middleCol = mainContainer.children[1];
        const rightCol = mainContainer.children[2];
        const infoDiv = document.getElementsByClassName('channel-info-content')[0].children[1];
        const chatDiv = document.getElementsByClassName('channel-root__right-column')[0];

        if(!infoDiv){
            console.log('(Twitch tool) [Error] Channel info not found');
            return;
        }
        if(!chatDiv){
            console.log('(Twitch tool) [Error] Chat not found');
            return;
        }

        const windowRatio = window.innerWidth / window.innerHeight;
        //console.log(`(Twitch tool) [Debug] Window ratio changed to ${windowRatio}`);

        if (windowRatio < 1) {
            if(!portraitMode){
                chatOffset = getComputedStyle(chatDiv).transform;

                // Collapse right column to expand stream to the very right
                const collapseButton = document.querySelector('button[aria-label="Collapse Chat"]');
                if(collapseButton){
                    collapseButton.click();

                    await new Promise(resolve => setTimeout(resolve, 100)); // wait for layout collapse

                    // Keeps the chat visible while in collapse status
                    rightCol.children[0].classList.remove('ieZICN');
                    rightCol.children[0].classList.add('eOzPrw');

                    rightCol.children[0].children[1].classList.remove('iLMtDH');
                    rightCol.children[0].children[1].classList.add('gYVLVA');
                }

                await new Promise(resolve => setTimeout(resolve, 100));

                mainContainer.classList.add('main-container');
                leftCol.classList.add('left-col');
                middleCol.classList.add('middle-col');
                rightCol.classList.add('right-col');
                infoDiv.classList.add('info-div');
                chatDiv.classList.add('chat-div', 'channel-root__right-column--expanded');
                chatDiv.style.setProperty('transform', 'none');

                portraitMode = true;
            }

            console.log('(Twitch tool) [Info] Chat switched to portrait mode');
        }
        else if (windowRatio >= 1) {
            if(portraitMode){
                mainContainer.classList.remove('main-container');
                leftCol.classList.remove('left-col');
                middleCol.classList.remove('middle-col');
                rightCol.classList.remove('right-col');
                infoDiv.classList.remove('info-div');
                chatDiv.classList.remove('chat-div');
                chatDiv.style.setProperty('transform', chatOffset);

                await new Promise(resolve => setTimeout(resolve, 100));

                const expandButton = document.querySelector('button[aria-label="Expand Chat"]');
                if(expandButton){
                    // No need to restore the class status, expand function magically don't care.
                    expandButton.click();
                }

                portraitMode = false;
            }

            console.log('(Twitch tool) [Info] Chat restored to landscape mode');
        }
    }

    console.log('(Twitch tool) [Info] Script started.');
})();