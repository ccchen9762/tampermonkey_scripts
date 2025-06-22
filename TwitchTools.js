// ==UserScript==
// @name         Twitch Tools
// @version      0.3.1
// @description  List of tools for improving Twitch UX: 1. Auto claim bonus. 2. Prevent data saving mechanisms. 3. Provide portraint mode chatting. 4. Hide recommendation channels
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
         @media (max-aspect-ratio: 1/1) {
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

    const rootDiv = document.getElementById('root');
    if(!rootDiv){
        console.log('(Twitch tool) [Error] Channel info not found.');
    }

    const mainContainer = rootDiv.children[0].children[0].children[1];
    const leftCol = mainContainer.children[0];
    const middleCol = mainContainer.children[1];
    const rightCol = mainContainer.children[2];
    mainContainer.classList.add('main-container');
    leftCol.classList.add('left-col');
    middleCol.classList.add('middle-col');
    rightCol.classList.add('right-col');

    let portraitMode = false;
    let chatOffset = null; // store the chat initial position style offset

    async function checkWindowRatio() {

        const channelInfo = document.getElementsByClassName('channel-info-content')[0];
        if(!channelInfo){
            console.log('(Twitch tool) [Error] Channel info not found.');
            return;
        }
        const chatDiv = document.getElementsByClassName('channel-root__right-column')[0];
        if(!chatDiv){
            console.log('(Twitch tool) [Error] Chat not found.');
            return;
        }
        const infoDiv = channelInfo.children[1];

        const windowRatio = window.innerWidth / window.innerHeight;
        //console.log(`(Twitch tool) [Debug] Window ratio changed to ${windowRatio}`);
        if (windowRatio < 1) {
            if(!portraitMode){
                // Expand to ensure the chat functions are loaded
                const expandButton = document.querySelector('button[aria-label="Expand Chat"]');
                if(expandButton){
                    expandButton.click();
                }
                await new Promise(resolve => setTimeout(resolve, 100));

                chatOffset = getComputedStyle(chatDiv).transform;

                // Collapse right column to expand stream to the very right
                const collapseButton = document.querySelector('button[aria-label="Collapse Chat"]');
                if(collapseButton){
                    collapseButton.click();
                }

                await new Promise(resolve => setTimeout(resolve, 100)); // wait for layout collapse

                // Keeps the chat visible while in collapse status
                rightCol.children[0].classList.remove('ieZICN');
                rightCol.children[0].classList.add('eOzPrw');

                rightCol.children[0].children[1].classList.remove('iLMtDH');
                rightCol.children[0].children[1].classList.add('gYVLVA');

                await new Promise(resolve => setTimeout(resolve, 100));

                infoDiv.classList.add('info-div');
                chatDiv.classList.add('chat-div', 'channel-root__right-column--expanded');
                chatDiv.style.setProperty('transform', 'none');

                portraitMode = true;
            }

            await new Promise(resolve => setTimeout(resolve, 100));

            const topNav = document.getElementsByClassName('top-nav')[0];
            const streamElement = document.getElementsByClassName('persistent-player')[0];
            const streamInfoElement = document.getElementById('live-channel-stream-information');
            const sideNav = document.getElementsByClassName('side-nav__scrollable_content')[0];
            const chatShellElement = document.getElementsByClassName('chat-shell')[0];

            if(!topNav){
                console.log('(Twitch tool) [Error] Top nav not found.');
                return;
            }
            if(!streamElement){
                console.log('(Twitch tool) [Error] Stream not found.');
                return;
            }
            if(!streamInfoElement){
                console.log('(Twitch tool) [Error] Stream info not found.');
                return;
            }
            if(!sideNav){
                console.log('(Twitch tool) [Error] Side nav not found.');
                return;
            }
            if(!chatShellElement){
                console.log('(Twitch tool) [Error] Chat shell not found.');
                return;
            }

            const topNavHeight = topNav.offsetHeight;
            const streamHeight = streamElement.offsetHeight;
            const streamInfoHeight = streamInfoElement.offsetHeight;

            const sideNavWidth = sideNav.offsetWidth;

            chatShellElement.style.setProperty('height', `calc(100vh - ${topNavHeight}px - ${streamHeight}px - ${streamInfoHeight}px)`, 'important');
            chatShellElement.style.setProperty('width', `calc(100vw - ${sideNavWidth}px)`, 'important');

            console.log('(Twitch tool) [Info] Chat switched to portrait mode');
        }
        else if (windowRatio >= 1) {
            if(portraitMode){
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

            await new Promise(resolve => setTimeout(resolve, 100));

            const chatShellElement = document.getElementsByClassName('chat-shell')[0];
            if(!chatShellElement){
                console.log('(Twitch tool) [Error] Chat shell not found.');
                return;
            }
            chatShellElement.style.setProperty('height', '100%');
            chatShellElement.style.setProperty('width', '100%');

            console.log('(Twitch tool) [Info] Chat restored to landscape mode');
        }
    }

    /* ========== Hide live channels ========== */
    function hideLiveChannels(){
        const liveChannels = document.querySelector('div[aria-label="Live Channels"]');
        const alsoWatch = liveChannels.nextSibling;
        if(liveChannels){
            liveChannels.style.setProperty('display', 'none', 'important');
            alsoWatch.style.setProperty('display', 'none', 'important');
            console.log('(Twitch tool) [Info] Recommendation channels are hidden.');
        }
        else{
            console.log('(Twitch tool) [Info] Live channels not found.');
        }
    }

    /* ========== Event Listeners ========== */
    // tab switching etc.
    window.addEventListener('visibilitychange', function(e) {
        console.log('(Twitch tool) [Info] Visibility changed');
        checkWindowRatio();
    });

    window.addEventListener('resize', function(e) {
        console.log('(Twitch tool) [Info] Resized');
        checkWindowRatio();
    });

    if (document.readyState === 'loading') {
        // If the DOM is not yet loaded, wait for DOMContentLoaded
        document.addEventListener('DOMContentLoaded', function(e) {
        console.log('(Twitch tool) [Info] DOMContentLoaded.');
        setTimeout(checkWindowRatio, 2000);
        setTimeout(hideLiveChannels, 2000);
    });
    } else {
        console.log('(Twitch tool) [Info] Document already loaded.');
        setTimeout(checkWindowRatio, 2000);
        setTimeout(hideLiveChannels, 2000);
    }

    console.log('(Twitch tool) [Info] Script started.');
})();