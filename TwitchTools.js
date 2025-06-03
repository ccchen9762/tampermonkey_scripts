// ==UserScript==
// @name         Twitch Tools
// @version      0.3.0
// @description  list of tools improve twitch ux | v0.1.0 auto click reward box | v0.2.0 disable data saving feature | v0.3.0 add responsive chat feature
// @author       ccchen9762
// @match        https://www.twitch.tv/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitch.tv
// @grant        GM_addStyle
// ==/UserScript==

(function() {
    'use strict';

    // twitch chat button cannot be clicked

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
    /*Object.defineProperty(document, 'hidden', { value: false, writable: false });
    Object.defineProperty(document, 'visibilityState', { value: 'visible', writable: false });
    Object.defineProperty(document, 'webkitVisibilityState', { value: 'visible', writable: false });

    // Prevent visibility change events (for modern sites)
    document.hasFocus = function() { return true; };
    window.addEventListener('visibilitychange', function(e) {
        e.preventDefault();
        e.stopPropagation();
    }, true);*/


    /* ========== Swap chat and info section when window becomes portrait mode ========== */
    let chatSwapped = false; // param recording swapping status

    // tab switching etc.
    window.addEventListener('visibilitychange', function(e) {
        console.log('(Twitch tool) [Info] Visibility changed');
        checkWindowRatio();
    });

    window.addEventListener('resize', function(e) {
        console.log('(Twitch tool) [Info] Resized');
        checkWindowRatio();
    });

    function elementsExist(topNav, streamElement, streamInfoElement, infoDiv, chatDiv){
        if (!topNav){
            console.log('(Twitch tool) [Error] Top nav bar not found');
            return false;
        }
        if (!streamElement){
            console.log('(Twitch tool) [Error] Stream element not found');
            return false;
        }
        if(!streamInfoElement){
            console.log('(Twitch tool) [Error] Stream info element not found');
            return false;
        }
        if (!infoDiv){
            console.log('(Twitch tool) [Error] info div not found');
            return false;
        }
        if(!chatDiv){
            console.log('(Twitch tool) [Error] chat div not found');
            return false;
        }

        return true;
    }

    async function checkWindowRatio() {
        // Expand right column before action happens
        const expandButton = document.querySelector('button[aria-label="Expand Chat"]');
        expandButton.click();

        const topNav = document.getElementsByClassName('top-nav')[0];
        const streamElement = document.getElementsByClassName('persistent-player')[0];
        const streamInfoElement = document.getElementById('live-channel-stream-information');
        const infoDiv = document.getElementsByClassName('channel-info-content')[0].children[1];
        const chatDiv = document.getElementsByClassName('channel-root__right-column')[0].children[0];

        if(!elementsExist(topNav, streamElement, streamInfoElement, infoDiv, chatDiv)){
            return;
        }

        const windowRatio = window.innerWidth / window.innerHeight;
        console.log(`(Twitch tool) [Debug] Window ratio changed to ${windowRatio}`);

        if (windowRatio < 1) {
            await new Promise(resolve => setTimeout(resolve, 200));

            // Swap elements if not already
            if(!chatSwapped){
                swapDiv(infoDiv, chatDiv);
                let chatContent = document.getElementsByClassName('chat-shell')[0].children[0];
                chatContent.style.width='100%';
                chatSwapped = true;

                // Collapse right column when swithcing to portrait mode
                const collapseButton = document.querySelector('button[aria-label="Collapse Chat"]');
                collapseButton.click();
            }

            // Adjust height of chat element
            await new Promise(resolve => setTimeout(resolve, 200));

            const topNavHeight = topNav.offsetHeight;
            const streamheight = streamElement.offsetHeight;
            const streamInfoheight = streamInfoElement.offsetHeight;

            // Remove style if not already
            let removeStyleElement = document.getElementById('height-override');
            if (removeStyleElement && removeStyleElement.parentNode) {
                removeStyleElement.parentNode.removeChild(removeStyleElement);
                removeStyleElement = null;
            }

            // Override height property
            let overrideStyleElement = document.createElement('style');
            overrideStyleElement.id = 'height-override';
            overrideStyleElement.textContent = `
            .chat-shell {
                height: calc(100vh - ${topNavHeight}px - ${streamheight}px - ${streamInfoheight}px) !important;
                display: flex;
            }`;
            document.head.appendChild(overrideStyleElement);

            console.log('(Twitch tool) [Info] Chat swapped to portrait mode');
        } 
        else if (windowRatio >= 1 && chatSwapped) {
            await new Promise(resolve => setTimeout(resolve, 200));

            swapDiv(chatDiv, infoDiv);
            let chatContent = document.getElementsByClassName('chat-shell')[0].children[0];
            chatContent.style.width='';

            // Remove style
            let removeStyleElement = document.getElementById('height-override');
            if (removeStyleElement && removeStyleElement.parentNode) {
                removeStyleElement.parentNode.removeChild(removeStyleElement);
                removeStyleElement = null;
            }

            chatSwapped = false;
            console.log('(Twitch tool) [Info] Chat restored to landscape mode');
        }
    }

    function swapDiv(div1, div2){
        const div1Parent = div1.parentNode;
        const div1Sibling = div1.nextSibling;
        const div2Parent = div2.parentNode;
        const div2Sibling = div2.nextSibling;

        if (div1Sibling) {
            div1Parent.insertBefore(div2, div1Sibling);
        } else {
            div1Parent.appendChild(div2);
        }

        if (div2Sibling) {
            div2Parent.insertBefore(div1, div2Sibling);
        } else {
            div2Parent.appendChild(div1);
        }
    }

    console.log('(Twitch tool) [Info] Script started.');
})();