// ==UserScript==
// @name         Fanbox Downloader
// @version      0.3.0
// @description  Download post contents into single zip files
// @author       moom9762
// @match        https://www.fanbox.cc/@*/posts/*
// @match        https://*.fanbox.cc/posts/*
// @grant        GM_xmlhttpRequest
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.6.0/jszip.min.js
// ==/UserScript==

(function() {

    'use strict';

    // create download button style class
    const head = document.head;
    const style = document.createElement('style');
    style.textContent = `
    .download_button {
        box-sizing: border-box;
        font-weight: bold;
        font-size: 14px;
        color: rgb(255, 255, 255);
        height: 32px;
        display: inline-block;
        transition: border-color 0.16s ease-out, background, color;
        padding: 0px calc(16px);
        border-radius: 80000px;
        background: rgb(255, 109, 0);
    }
    `;
    head.appendChild(style);

    const chunkSize = 25 * 1024 * 1024; // 25 MB

    function getImageSize(url, index) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'HEAD',
                url: url,
                onload: function(response) {
                    if (response.status === 200) {
                        const contentLength = response.responseHeaders.match(/content-length:(\d+)/);
                        if(contentLength) {
                            const contentLengthNum = parseInt(contentLength[1]);
                            console.info(`(Fanbox Downloader) [Info] Image #${index} has size ${contentLengthNum}`);
                            resolve(contentLengthNum);
                        }
                        else {
                            console.info(`(Fanbox Downloader) [Info] Image #${index} has unknown content length.`);
                            resolve(0);
                        }
                    }
                    else {
                        reject();
                    }
                }
            });
        });
    }

    function requestImage(url, index, part, chunks, contentLength) {
        return new Promise((resolve, reject) => {
            let start = chunkSize * part;
            let end = Math.min((chunkSize * (part+1) - 1), contentLength);

            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                binary: true,
                responseType: "blob",
                headers: {
                    'Range': `bytes=${start}-${end}`
                },
                onload: function(response) {
                    if(response.status === 206){
                        console.debug(`(Fanbox Downloader) [Debug] Image #${index} part ${part+1} downloaded.`);
                        chunks.push(response.response);
                        if(end !== contentLength){
                            requestImage(url, index, part+1, chunks, contentLength).then(() => {
                                resolve();
                            });
                        }
                        else{
                            console.info(`(Fanbox Downloader) [Info] Image #${index} downloaded. (Total ${part+1} part(s))`);
                            resolve();
                        }
                    }
                    else if(response.status === 200){
                        console.info(`(Fanbox Downloader) [Info] Image #${index} downloaded. (Total ${part+1} part(s))`);
                        chunks.push(response.response);
                        resolve();
                    }
                    else {
                        console.info(`(Fanbox Downloader) [Error] Image #${index} reqeust respond with status ${response.status}.`);
                        reject();
                    }
                },
                onerror: function(e){
                    console.error(`(Fanbox Downloader) [Error] Cannot download image #${index}, ${e}`);
                    reject();
                },
            });
        });
    }

    function requestFullImage(url, index, chunks) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: "GET",
                url: url,
                binary: true,
                responseType: "blob",
                onload: function(response) {
                    if(response.status === 200){
                        console.info(`(Fanbox Downloader) [Info] Image #${index} downloaded. (Total 1 part(s))`);
                        chunks.push(response.response);
                        resolve();
                    }
                    else {
                        console.error(`(Fanbox Downloader) [Error] Image #${index} reqeust respond with status ${response.status}.`);
                        reject();
                    }
                },
                onerror: function(e){
                    console.error(`(Fanbox Downloader) [Error] Cannot download image #${index}, ${e}`);
                    reject();
                },
            });
        });
    }

    function generateZip(zip, zipFilename) {
        console.info(`(Fanbox Downloader) [Info] Start downloading zip...`);

        // Generate the zip file and initiate the download
        zip.generateAsync({ type: 'blob' })
            .then(function(content) {
            // Create a download link and trigger the download
            let link = document.createElement('a');
            link.href = URL.createObjectURL(content);
            link.download = zipFilename;
            link.click();
        });
    }

    async function downloadImages() {
        // search for all image contents
        const imageElements = document.querySelectorAll("a[rel] > div > img");
        let imageUrls = [];
        for(let i = 0; i < imageElements.length; i++){
            imageUrls.push(imageElements[i].parentNode.parentNode.getAttribute("href"));
        }

        // if downloadable
        if(imageUrls.length > 0){
            console.info("(Fanbox Downloader) [Info] Found images.");

            const authorText = document.getElementsByClassName("styled__UserNameText-sc-1upaq18-14")[0].textContent;
            const titleElement = document.getElementsByClassName("styled__PostTitle-sc-1vjtieq-4")[0];
            const titleText = titleElement.textContent;
            const dateElement = titleElement.nextElementSibling;
            const dateText = dateElement.textContent.split(" ")[0];

            const zipFilename = '[' + authorText + '] ' + titleText + ' [' + dateText + '].zip';
            let zip = new JSZip();
            let finishCount = 0;

            const downloadButton = document.getElementsByClassName("download_button")[0];
            downloadButton.innerText = `Downloading ${finishCount}/${imageUrls.length}`;

            await Promise.all(
                imageUrls.map(async (url, index) => {
                    let chunks = [];

                    const contentLengthNum = await getImageSize(url, index);

                    if(contentLengthNum !== 0) {
                        await requestImage(url, index, 0, chunks, contentLengthNum);
                    }
                    else {
                        await requestFullImage(url, index, chunks);
                    }

                    await new Promise((resolve, reject) => {
                        if(chunks.length === 0){
                            console.error(`(Fanbox Downloader) [Error] Blob ${index} is empty.`);
                            reject();
                        }

                        console.debug(`(Fanbox Downloader) [Debug] Handling blob ${index}.`);

                        let filename = "";

                        if((index+1) < 10){ filename = '00'+ (index+1); }
                        else if((index+1) < 100){ filename = '0' + (index+1); }
                        else{ filename = (index+1); }
                        const extension = url.slice(url.lastIndexOf("."));
                        filename += extension;

                        let imageBlob = new Blob(chunks, {type: chunks[0].type});
                        zip.file(filename, imageBlob);

                        console.info(`(Fanbox Downloader) [Info] Finish adding blob ${index}.`);
                        ++finishCount;
                        downloadButton.innerText = `Downloading ${finishCount}/${imageUrls.length}`;
                        resolve();
                    });
                })
            )

            generateZip(zip, zipFilename);
            downloadButton.innerText = "Download finished";
        }
    }

    function createDownloadButton() {
        const imageElement = document.querySelector("a[rel] > div > img");

        // if downloadable
        if(imageElement){
            const downloadButton = document.createElement("button");
            downloadButton.classList.add("download_button");
            downloadButton.style.marginTop = '16px';
            downloadButton.innerText = "Download zip";
            downloadButton.onclick = downloadImages;

            document.getElementsByClassName("styled__PostHead-sc-1vjtieq-2")[0].appendChild(downloadButton);
            console.info("(Fanbox Downloader) [Info] Download button added.");
        }
    }

    function checkPageLoading() {
        let debounceTimer;
        const observer = new MutationObserver(function(mutations, obs) {
            // Clear timer for every mutation
            clearTimeout(debounceTimer);

            // Set a new timer to check for the title element and add the button
            debounceTimer = setTimeout(() => {
                const titleElement = document.querySelector('.styled__PostHead-sc-1vjtieq-2');

                if (titleElement && !titleElement.querySelector('.download_button')) {
                    console.debug(`(Fanbox Downloader) [Debug] Title element is stable. Adding button.`);
                    createDownloadButton();
                    obs.disconnect();
                } else if (titleElement && titleElement.querySelector('.download_button')) {
                    obs.disconnect();
                }
            }, 300);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkPageLoading);
    } else {
        checkPageLoading();
    }
})();