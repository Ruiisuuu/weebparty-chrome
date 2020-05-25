/**
 * injector.js
 * Author : Louis Mollick - 2020
 * https://stackoverflow.com/questions/9515704/insert-code-into-the-page-context-using-a-content-script/9517879#9517879
 * 
 * NOTES:
 * For some reason, web socket connection SPECIFICALLY does not work on 9anime.to :
 * - with this content script, get "GET http://localhost:3000/socket.io/?EIO=3&transport=polling&t=N8LBdu1 net::ERR_BLOCKED_BY_CLIENT"
 * - same thing when using deployed server (https://weebparty-server.herokuapp.com/)
 * - tried injecting into top frame, got "WebSocket connection to 'ws://localhost:3000/socket.io/?EIO=3&transport=websocket' failed: Unknown reason"
 * 
 * TODO: 
 * Most this code should probably be in the background script. 
 * Not in the popup script, since that is cleared when you close the popup window.
 * Everything is currently injected in a content script in the video iFrame of the webpage, meaning that if the
 * user leaves the current webpage, the Socket io connnection will end.
 * The current implementation is useful since we can access the "video" tag easily inside our socket events.
 * But ideally, this injected script should only be used to interact with the video tag, and use messaging to send those events
 * to the background script, where the socket events are handled. That way a Watch party can change videos/webpages without issue.
 * This might also fix the problems with 9anime.to mentionned above ^^^^.
 */
(() => {
    console.log('INJECTED CONTENT SCRIPT');
    chrome.runtime.sendMessage({injected: true});
    //////////////////////////////////////////////////////////////////////////
    // Application Variables                                                //
    //////////////////////////////////////////////////////////////////////////
    const video = document.getElementsByTagName("video")[0];
    
    //////////////////////////////////////////////////////////////////////////
    // Socket Io Events                                                     //
    //////////////////////////////////////////////////////////////////////////
    const socket = io('http://localhost:3000'); //io('https://weebparty-server.herokuapp.com/');
    socket.on('connect', function() {
        console.log("Connected via websocket!");
        chrome.runtime.sendMessage({connected: true}); // Tell popup you're connected
    });

    //////////////////////////////////////////////////////////////////////////
    // Chrome Popup Interaction                                             //
    //////////////////////////////////////////////////////////////////////////
    chrome.runtime.onMessage.addListener(function(request) {
        console.log("RUNTIME MESSAGE :", request);
        if(request == "leader") startLeading();
        else if (request == "follower") startFollowing();
        else if (request == "time") timeReq();
    });

    //////////////////////////////////////////////////////////////////////////
    // Starting Points                                                      //
    //////////////////////////////////////////////////////////////////////////
    const startLeading = () => {
        socket.emit('becomeLeader');
        socket.on('leaderTimeReq', (callback) => {
            callback({
                leaderIsPaused: video.paused,
                lastKnownTime: video.currentTime,
                lastKnownTimeUpdatedAt: new Date(),
            });
            console.log('Sent time update...');
        });
        video.onplaying = video.onpause = () => {
            console.log("Sending state update...", video.paused);
            socket.emit('stateUpdate', video.paused);
        };
        video.onseeked = () => {
            // TODO : Account for load time after seeking :
            //      1. Leader finishes seeking to a position and pauses for everyone. 
            //         (Since BUFFER happens every time you seek, most of everyone should already be paused)
            //      2. Leader sends timeUpdate to server and it is broadcasted to all followers
            //      3. Each follower receives timeUpdate and sends out message once it is done seeking
            //      4. Leader unpauses when all followers have done seeking, or after a timeOut timer of 
            //          5 seconds (whichever comes first).
            //video.pause();
            console.log('SEEKING');
            socket.emit('leaderSeeked', {
                leaderIsPaused: video.paused,
                lastKnownTime: video.currentTime,
                lastKnownTimeUpdatedAt: new Date(),
            });
            // const countdown = setTimeout(() => {
            //     console.log('Waited too long for other clients after seeked, playing now');
            //     video.play();
            // }, 5000);
        }
        video.onwaiting = () => {
            // TODO : Pause when leader is buffering : 
            //         1. Pause everyone else, but not leader
            //         2. When player resumes, video.onplaying is called and unpauses all followers
            // Currently removed since currently don't want to pause after seeking (since buffer always happens when seeking)
            console.log('BUFFER');
            //socket.emit('stateUpdate', true); // Pause everyone else while buffering
        };
    }

    const startFollowing = () => {
        socket.on('stateUpdate', function(leaderIsPaused){
            console.log("-------------");
            console.log('STATE UPDATE', leaderIsPaused);
            if(video.paused != leaderIsPaused) {
                if(leaderIsPaused) video.pause();
                else video.play();
            }
        });
        socket.on('timeUpdate', function(data) {
            console.log("-------------");
            console.log("TIME UPDATE", data);
            if(video.paused != data.leaderIsPaused) {
                if(data.leaderIsPaused) video.pause();
                else video.play();
            }
            if(data.leaderIsPaused) video.currentTime = data.lastKnownTime;
            else {
                const now = new Date().getTime();
                const lastKnownTimeUpdatedAt = new Date(data.lastKnownTimeUpdatedAt).getTime();
                const timeDiff = (now - lastKnownTimeUpdatedAt)/1000; // milliseconds -> seconds
                console.log("DIFF:", timeDiff);
                video.currentTime = data.lastKnownTime + timeDiff; // Add more if not precise enough
            } 
        });
        socket.emit('followerTimeReq');
    }
    socket.on("displayError", (error) =>{ alert(error); });

    const timeReq = () => { socket.emit('followerTimeReq'); }
})();