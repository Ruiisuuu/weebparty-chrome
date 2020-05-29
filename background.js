/**
 * background.js
 * Author : Louis Mollick - 2020
 * https://stackoverflow.com/questions/9515704/insert-code-into-the-page-context-using-a-content-script/9517879#9517879
 */
(() => {
    let socket = null;
    let tabId = null;
    let frameId = null;
    let isLeader = null;

    chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
        console.log("RUNTIME MESSAGE :", request);
        // if (request.type == "connect"){
            
        // }
        // else if(request.type == "disconnect"){
        //     socket.disconnect();
        //     socket = null;
        // }
        if (request.type == "inject"){
            isLeader = request.isLeader;
            chrome.tabs.executeScript(null, {allFrames: true, file:"videoInject.js"});
        } 
        else if (request.type == "timeRequest") socket.emit('followerTimeReq');
        else if (request.type == "hasVideo"){
            tabId = sender.tab.id;
            frameId = sender.frameId;

            console.log("Has video!");
            sendResponse(isLeader);

            socket = io('http://localhost:3000'); //io('https://weebparty-server.herokuapp.com/');
            socket.on('connect', () => { console.log("Connected via websocket!"); });
            socket.on("displayError", (error) =>{ alert(error); });

            if(isLeader) {
                socket.emit('becomeLeader');
                socket.on('leaderTimeReq', (callback) => {
                    chrome.tabs.sendMessage(tabId, "getTime", {frameId}, (response) => {
                        if (response.type != "time") alert("FUCK");
                        callback(response); // Send back to server
                    });
                    console.log('Sent time update...');
                });
            }
            else {
                const passDataToVideo = (data) => { chrome.tabs.sendMessage(tabId, data, {frameId});}
                socket.on('stateUpdate', passDataToVideo);
                socket.on('timeUpdate', passDataToVideo);
                socket.emit('followerTimeReq');
            }
        }
        else if (request.type == "playpause") socket.emit('stateUpdate', request);
        else if (request.type == "time") socket.emit('leaderSeeked', request);
    });
})();
