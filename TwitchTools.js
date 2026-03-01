// ==UserScript==
// @name         Twitch Tools
// @version      0.4.0
// @description  A collection of tools to improve the Twitch experience.
// @author       ccchen9762
// @match        https://www.twitch.tv/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=twitch.tv
// @grant        none
// ==/UserScript==

(function() {
    'use strict';

    /* ========== 1. Click claim button when available ========== */
    const claimButtonObserver = new MutationObserver(() => {
        const claimButton = document.evaluate(
            './/*[@aria-label="Claim Bonus"]',
            document,
            null,
            XPathResult.FIRST_ORDERED_NODE_TYPE,
            null).singleNodeValue;

        if(claimButton) {
            claimButton.click();
            console.log('(Twitch tools) [Info] Claim button clicked.');
        }
    });

    claimButtonObserver.observe(document.body, {childList: true, subtree: true});


    /* ========== 2. Prevent page from detecting background/unfocused state ========== */
    // Override visibility properties
    Object.defineProperties(document, {
        'hidden': {get: () => false},
        'webkitHidden': {get: () => false},
        'visibilityState': {get: () => 'visible'},
        'webkitVisibilityState': {get: () => 'visible'}
    });

    document.hasFocus = () => true;

    // Intercept Event Listeners to silently drop visibility trackers
    const originalAddEventListener = EventTarget.prototype.addEventListener;
    EventTarget.prototype.addEventListener = function(type, listener, options) {
        if(type === 'visibilitychange' || type === 'webkitvisibilitychange' || type === 'blur' || type === 'pause') {
            // Silently swallow background-related events
            return;
        }
        return originalAddEventListener.call(this, type, listener, options);
    };

    console.log('(Twitch tools) [Info] Anti-detection feature started.');


    /* ========== 3. Hide live channels ========== */
    const recommendationObserver = new MutationObserver(() => {
        const liveChannels = document.querySelector('div[aria-label="Live Channels"]');
        const alsoWatch = document.querySelector('div[aria-label$="Viewers Also Watch"]');
        let liveChannelsHidden = false;
        let alsoWatchHidden = false;

        if(liveChannels && liveChannels.style.getPropertyValue('display') !== 'none') {
            liveChannels.style.setProperty('display', 'none', 'important');
            liveChannelsHidden = true;
            console.log('(Twitch tools) [Info] Live channels hidden.');
        }
        if(alsoWatch && alsoWatch.style.getPropertyValue('display') !== 'none') {
            alsoWatch.style.setProperty('display', 'none', 'important');
            alsoWatchHidden = true;
            console.log('(Twitch tools) [Info] Also watch channels hidden.');
        }

        if(liveChannelsHidden && alsoWatchHidden) {
            console.log('(Twitch tools) [Info] Recommendation observer disconnected.');
            recommendationObserver.disconnect();
        }
    });

    recommendationObserver.observe(document.body, {childList: true, subtree: true});


    /* ========== 4. Move chat under stream and hide info section when window becomes portrait mode ========== */
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
            .info-div {
                display: none !important;
            }
            .chat-div {
                width: 100% !important;
            }
            .portrait-chat-inner {
                position: relative !important;
                -webkit-box-flex: 0 !important;
                flex-grow: 0 !important;
                flex-shrink: 0 !important;
                height: 100% !important;
                display: block !important;
            }

            [data-a-target="right-column__toggle-collapse-btn"] {
                display: none !important;
            }
        }
    `;

    const reorderStyle = document.createElement('style');
    reorderStyle.appendChild(document.createTextNode(reorderCSS));
    document.head.appendChild(reorderStyle);

    let portraitMode = false;

    function initializeScript() {
        const sideNav = document.querySelector('.side-nav');
        const mainContainer = sideNav.parentElement.parentElement;
        const leftCol = sideNav.parentElement;
        const middleCol = document.querySelector('.root-scrollable').parentElement;
        const rightCol = document.querySelector('.right-column').parentElement;

        // apply portrait mode classes
        mainContainer.classList.add('main-container');
        leftCol.classList.add('left-col');
        middleCol.classList.add('middle-col');
        rightCol.classList.add('right-col');


        const channelAbout = document.querySelector('#live-channel-about-panel');
        const chatDiv = document.querySelector('.channel-root__right-column');
        // entire channel info section under title
        const channelInfoDiv = channelAbout.parentElement.parentElement.parentElement;

        channelInfoDiv.classList.add('info-div');
        chatDiv.classList.add('chat-div');


        async function checkWindowRatio() {
            console.log('(Twitch tools) [Info] checkWindowRatio started');

            const windowRatio = window.innerWidth / window.innerHeight;
            //console.log(`(Twitch tools) [Debug] Window ratio changed to ${windowRatio}`);
            if(windowRatio < 1) {
                if(!portraitMode) {
                    // Expand to ensure the chat functions are loaded (otherwise the chat will frozen)
                    const expandButton = document.querySelector('button[aria-label="Expand Chat"]');
                    expandButton?.click();
                    await new Promise(resolve => setTimeout(resolve, 100));

                    // Collapse right column to expand stream to the very right
                    const collapseButton = document.querySelector('button[aria-label="Collapse Chat"]');
                    collapseButton?.click();
                    await new Promise(resolve => setTimeout(resolve, 100)); // wait for layout collapse

                    // Keeps the chat visible while in collapse status
                    rightCol.children[0].children[1]?.classList.add('portrait-chat-inner');

                    portraitMode = true;
                }
                await new Promise(resolve => setTimeout(resolve, 100));

                const streamInfoElement = document.getElementById('live-channel-stream-information');
                const sideNavElement = document.querySelector('.side-nav');
                const chatShellElement = document.querySelector('.chat-shell');
                if(!streamInfoElement) {
                    console.log('(Twitch tools) [Error] Stream info not found.');
                    return;
                }
                if(!sideNavElement) {
                    console.log('(Twitch tools) [Error] Side nav not found.');
                    return;
                }
                if(!chatShellElement) {
                    console.log('(Twitch tools) [Error] Chat shell not found.');
                    return;
                }

                // Use getBoundingClientRect().bottom to get the distance from the top of the viewport 
                const chatTop = streamInfoElement.getBoundingClientRect().bottom;
                const sideNavRight = sideNavElement.getBoundingClientRect().right;

                chatShellElement.style.setProperty('height', `calc(100vh - ${chatTop}px)`, 'important');
                chatShellElement.style.setProperty('width', `calc(100vw - ${sideNavRight}px)`, 'important');

                console.log('(Twitch tools) [Info] Chat switched to portrait mode');
            }
            else if(windowRatio >= 1) {
                if(portraitMode) {
                    rightCol.children[0].children[1]?.classList.remove('portrait-chat-inner');

                    portraitMode = false;
                }
                await new Promise(resolve => setTimeout(resolve, 100));

                // Expand chat whenever possible 
                const expandButton = document.querySelector('button[aria-label="Expand Chat"]');
                expandButton?.click();
                await new Promise(resolve => setTimeout(resolve, 100));

                const chatShellElement = document.getElementsByClassName('chat-shell')[0];
                if(!chatShellElement) {
                    console.log('(Twitch tools) [Error] Chat shell not found.');
                    return;
                }
                chatShellElement.style.setProperty('height', '100%');
                chatShellElement.style.setProperty('width', '100%');

                console.log('(Twitch tools) [Info] Chat restored to landscape mode');
            }
        }

        /* ========== Event Listeners ========== */
        // tab switching etc.
        window.addEventListener('visibilitychange', function(e) {
            console.log('(Twitch tools) [Info] Visibility changed');
            checkWindowRatio();
        });

        window.addEventListener('resize', function(e) {
            console.log('(Twitch tools) [Info] Resized');
            checkWindowRatio();
        });

        navigation.addEventListener("navigate", e => {
            console.log('(Twitch tools) [Info] url changed.');

            const navigationObserver = new MutationObserver((mutations, observer) => {
                const channelAbout = document.querySelector('#live-channel-about-panel');
                const chatDiv = document.querySelector('.channel-root__right-column');

                if(channelAbout && chatDiv) {
                    console.log('(Twitch tools) [Info] Required elements found, initializing portrait feature.');
                    observer.disconnect();
                    portraitMode = false;
                    checkWindowRatio();
                }
            });
            navigationObserver.observe(document.body, {childList: true, subtree: true});
        });

        // Trigger one initial check when first booted up
        setTimeout(checkWindowRatio, 1000);
        console.log('(Twitch tools) [Info] Portrait Layout script initialized.');
    }

    const initObserver = new MutationObserver((mutations, observer) => {
        const channelAbout = document.querySelector('#live-channel-about-panel');
        const chatDiv = document.querySelector('.channel-root__right-column');

        // Wait until both features AND the root child structure are fully rendered by React
        if(channelAbout && chatDiv) {
            console.log('(Twitch tools) [Info] Required elements found, initializing portrait feature.');
            observer.disconnect();
            initializeScript();
        }
    });

    initObserver.observe(document.body, {childList: true, subtree: true});


    console.log('(Twitch tools) [Info] Script started.');
})();