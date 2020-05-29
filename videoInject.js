/**
 * videoInject.js
 * Author : Louis Mollick - 2020
 * Injected into all frames of a page and sends signal 
 * if it finds the desired frame (with video player).
 * https://stackoverflow.com/questions/9915311/chrome-extension-code-vs-content-scripts-vs-injected-scripts
 */
(function(){
    const video = document.getElementsByTagName("video")[0];
    if(video){
        console.log('INJECTOR FOUND VIDEO');
        chrome.runtime.sendMessage({type: "hasVideo"}, (isLeader) => { 
            if(isLeader){
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
            } 
        });

        // Socket events
        chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
            console.log("RUNTIME MESSAGE :", request);
            if (request == "getState") sendResponse({ leaderIsPaused: video.paused });
            else if (request == "getTime") sendResponse({
                type : "time",
                leaderIsPaused: video.paused,
                lastKnownTime: video.currentTime,
                lastKnownTimeUpdatedAt: new Date(),
            });
            if (request.type == "playpause" || request.type == "time"){
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
    }
}
)();