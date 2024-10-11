// ==UserScript==
// @name         Fanbox Downloader
// @version      0.1
// @description  Download post contents into single zip files
// @author       moom9762
// @match        https://www.fanbox.cc/@*/posts/*
// @match        https://*.fanbox.cc/posts/*
// @grant        GM_xmlhttpRequest
// @require      https://cdnjs.cloudflare.com/ajax/libs/jszip/3.6.0/jszip.min.js
// ==/UserScript==

var downloadImage = function() {
    // search for all image contents
    var imageElements = document.querySelectorAll("a[rel] > div > img");
    var imageUrls = [];
    for(var i = 0; i < imageElements.length; i++){
        imageUrls.push(imageElements[i].parentNode.parentNode.getAttribute("href"));
    }

    // if downloadable
    if(imageUrls.length > 0){
        console.log("[Fanbox Downloader] Found contents");

        var authorText = document.getElementsByClassName("styled__UserNameText-sc-1upaq18-14")[0].textContent;

        var articleElement = document.querySelectorAll('article')[0];

        var titleText = articleElement.children[1].children[0].textContent;
        var dateElement = articleElement.children[1].children[1];
        var dateText = dateElement.textContent.split(" ")[0];

        /*var dateNumber = "";
        var fillCheck = 0;
        for(let i=0;i<dateText.length;i++){
            if(!isNaN(dateText[i])){
                dateNumber+=dateText[i];
                fillCheck++;
            }
            else{
                // if month or date is single number, fill 0 before it
                if(fillCheck<2){
                    dateNumber=dateNumber.substr(0, dateNumber.length-1) + '0' + dateNumber[dateNumber.length-1];
                }
                fillCheck=0;
            }
        }*/

        var downloadButton = document.createElement("button");
        downloadButton.classList.add("btn");
        downloadButton.innerText = "Download All as Zip";
        downloadButton.onclick = function() {
            var finishCount = 0;
            var zipFilename = '[' + authorText + '] ' + titleText + ' [' + dateText + '].zip';
            var zip = new JSZip();

            imageUrls.forEach(function(url, index) {
                GM_xmlhttpRequest({
                    method: "GET",
                    url: url,
                    binary: true,
                    responseType: "blob",
                    onload: function(response) {
                        var filename = "";
                        if((index+1) < 10){ filename = '00'+ (index+1); }
                        else if((index+1) < 100){ filename = '0' + (index+1); }
                        else{ filename = (index+1); }
                        const extensionIndex = url.lastIndexOf(".");
                        const extension = url.slice(extensionIndex + 1);
                        filename += "." + extension;

                        console.log("[Fanbox Downloader] Finish " + filename + "(" + url + ")");
                        console.log(response);

                        zip.file(filename, response.response);

                        ++finishCount;

                        if(finishCount === imageUrls.length) {
                            // Generate the zip file and initiate the download
                            zip.generateAsync({ type: 'blob' })
                                .then(function(content) {
                                // Create a download link and trigger the download
                                var link = document.createElement('a');
                                link.href = URL.createObjectURL(content);
                                link.download = zipFilename;
                                link.click();
                            });
                        }
                    },
                    onprogress: function (e) {
                        console.log("[Fanbox Downloader] Downloading " + filename + (e.loaded / 1024).toFixed(3) + "kB (No total length found)");
                    },
                    onerror: function(e){
                        console.error("[Fanbox Downloader] Error downloading image " + finishCount);
                    },
                });
            });
        };
        dateElement.appendChild(downloadButton);
    }
}

setTimeout(downloadImage, 2000);