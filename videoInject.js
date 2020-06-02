/**
 * videoInject.js
 * Author : Louis Mollick - 2020
 * Injected into all frames of a page and sends signal if it finds the desired frame (with video player).
 * The injection is needed in order to control the video player. Since it is contained an iFrame, it cannot
 * be accessed from higher-level frames.
 * Used a content script in order to access the Chrome Messaging API.
 * https://stackoverflow.com/questions/9915311/chrome-extension-code-vs-content-scripts-vs-injected-scripts
 * 
 * Message Types :
 * - getTime : Responds with the current time of the video, the current state and current date.
 * - becomeLeader : Sets up event listeners for pause, play and seek ; these are then sent to other clients (if leader).
 * - playpause : Pauses or plays the video
 * - time : skips to a certain time in the video. If the video is playing, it calculates how long the message took to arrive and adds a delay.
 */
(() => {
    const video = document.getElementsByTagName("video")[0];
    if(video){
        console.log('INJECTOR FOUND VIDEO');
        chrome.runtime.sendMessage({type: "hasVideo"});

        chrome.storage.local.get(['isLeader'], (result) => {
            if (result.isLeader) becomeLeader();
        });

        // Socket events
        chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
            console.log("RUNTIME MESSAGE :", request);
            if (request.type == "getTime") sendResponse({
                type : "time",
                leaderIsPaused: video.paused,
                lastKnownTime: video.currentTime,
                lastKnownTimeUpdatedAt: new Date(),
            });
            else if (request.type == "becomeLeader"){
                becomeLeader();
            }
            else if (request.type == "playpause" || request.type == "time"){
                if(request.leaderIsPaused){
                    video.pause();
                    if(request.lastKnownTime) video.currentTime = request.lastKnownTime;
                } 
                else{
                    video.play();
                    if (request.lastKnownTime && request.lastKnownTimeUpdatedAt){
                        const now = new Date().getTime();
                        const lastKnownTimeUpdatedAt = new Date(request.lastKnownTimeUpdatedAt).getTime();
                        const timeDiff = (now - lastKnownTimeUpdatedAt)/1000; // milliseconds -> seconds
                        console.log("DIFF:", timeDiff);
                        video.currentTime = request.lastKnownTime + timeDiff; // Add more if not precise enough
                    }
                } 
            }
        });

        const becomeLeader = () => {
            console.log("Becoming Leader...");
            video.onplaying = video.onpause = () => {
                console.log("Sending state update...", video.paused);
                chrome.runtime.sendMessage({
                    type: "playpause",
                    leaderIsPaused: video.paused 
                });
            };
            video.onseeked = () => {
                console.log("Seeking...");
                chrome.runtime.sendMessage({
                    type: "time",
                    leaderIsPaused: video.paused,
                    lastKnownTime: video.currentTime,
                    lastKnownTimeUpdatedAt: new Date(),
                });
            }
            video.onwaiting = () => { console.log('BUFFER'); }
        };
    }
})();