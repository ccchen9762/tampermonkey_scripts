// ==UserScript==
// @name         Fanbox Downloader
// @version      0.2
// @description  Download post contents into single zip files
// @author       moom9762
// @match        https://www.fanbox.cc/@*/posts/*
// @match        https://*.fanbox.cc/posts/*
// @grant        GM_xmlhttpRequest
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.6.0/jszip.min.js
// ==/UserScript==

(function() {

    'use strict';

    const chunkSize = 25 * 1024 * 1024; // 25 MB
    const checkLoadingInterval = setInterval(CheckLoading, 100);

    function CheckLoading() {
        let articleElement = document.querySelectorAll('article')[0];
        if(articleElement){
            clearInterval(checkLoadingInterval);
            DownloadButton();
        }
    }

    function GetImageSize(url, index) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'HEAD',
                url: url,
                onload: function(response) {
                    if (response.status === 200) {
                        const contentLength = response.responseHeaders.match(/content-length:(\d+)/);
                        const contentLengthNum = parseInt(contentLength[1]);
                        resolve(contentLengthNum);
                        console.log(`(Fanbox Downloader) [Info] Image #${index} has size ${contentLengthNum}`);
                    }
                    else {
                        reject();
                    }
                }
            });
        });
    }

    function RequestImage(url, index, part, chunks, contentLength) {
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
                        console.log(`(Fanbox Downloader) [Debug] Image #${index} part ${part+1} downloaded.`);
                        chunks.push(response.response);
                        if(end !== contentLength){
                            RequestImage(url, index, part+1, chunks, contentLength).then(() => {
                                resolve();
                            });
                        }
                        else{
                            console.log(`(Fanbox Downloader) [Info] Image #${index} downloaded. (Total ${part+1} part(s))`);
                            resolve();
                        }
                    }
                    else if(response.status === 200){
                        console.log(`(Fanbox Downloader) [Info] Image #${index} downloaded. (Total ${part+1} part(s))`);
                        chunks.push(response.response);
                        resolve();
                    }
                    else {
                        console.log(`(Fanbox Downloader) [Error] Image #${index} reqeust respond with status ${response.status}.`);
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

    function GenerateZip(zip, zipFilename) {
        console.log(`(Fanbox Downloader) [Info] Start downloading zip...`);

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

    function DownloadButton() {
        // search for all image contents
        let imageElements = document.querySelectorAll("a[rel] > div > img");
        let imageUrls = [];
        for(let i = 0; i < imageElements.length; i++){
            imageUrls.push(imageElements[i].parentNode.parentNode.getAttribute("href"));
        }

        // if downloadable
        if(imageUrls.length > 0){
            console.log("(Fanbox Downloader) [Info] Found contents");

            let authorText = document.getElementsByClassName("styled__UserNameText-sc-1upaq18-14")[0].textContent;

            let articleElement = document.querySelectorAll('article')[0];

            let titleText = articleElement.children[1].children[0].textContent;
            let dateElement = articleElement.children[1].children[1];
            let dateText = dateElement.textContent.split(" ")[0];

            let downloadButton = document.createElement("button");
            downloadButton.classList.add("CommonButton__CommonButtonLikeOuter-sc-1s35wwu-1");
            downloadButton.classList.add("iLfyvO");
            downloadButton.style.marginTop = '16px';
            downloadButton.innerText = "Download zip";
            downloadButton.onclick = async function() {
                let zipFilename = '[' + authorText + '] ' + titleText + ' [' + dateText + '].zip';
                let zip = new JSZip();
                let finishCount = 0;

                downloadButton.innerText = `Downloading ${finishCount}/${imageUrls.length}`;

                await Promise.all(
                    imageUrls.map(async (url, index) => {
                        let chunks = [];

                        const contentLengthNum = await GetImageSize(url, index);

                        await RequestImage(url, index, 0, chunks, contentLengthNum);

                        await new Promise((resolve, reject) => {
                            if(chunks.length === 0){
                                console.log(`(Fanbox Downloader) [Error] Blob ${index} is empty.`);
                                reject();
                            }

                            console.log(`(Fanbox Downloader) [Debug] Handling blob ${index}.`);

                            let filename = "";

                            if((index+1) < 10){ filename = '00'+ (index+1); }
                            else if((index+1) < 100){ filename = '0' + (index+1); }
                            else{ filename = (index+1); }
                            const extension = url.slice(url.lastIndexOf("."));
                            filename += extension;

                            let imageBlob = new Blob(chunks, {type: chunks[0].type});
                            zip.file(filename, imageBlob);

                            console.log(`(Fanbox Downloader) [Info] Finish adding blob ${index}.`);
                            ++finishCount;
                            downloadButton.innerText = `Downloading ${finishCount}/${imageUrls.length}`;
                            resolve();
                        });
                    })
                )

                await GenerateZip(zip, zipFilename);
                downloadButton.innerText = `Download finished`;
            };

            // append button as child of title head
            document.getElementsByClassName("styled__PostHead-sc-1vjtieq-2")[0].appendChild(downloadButton);
        }
    }
})();