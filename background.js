/**
 * background.js
 * Author : Louis Mollick - 2020
 * https://stackoverflow.com/questions/9515704/insert-code-into-the-page-context-using-a-content-script/9517879#9517879
 */
var socket = null;
var tabId = null;
var frameId = null;
var foundVideo = false;

chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    console.log("RUNTIME MESSAGE :", request);
    if (request.type == "connect"){
        socket = io('http://localhost:3000'); //io('https://weebparty-server.herokuapp.com/');
        socket.on('connect', () => { console.log("Connected via websocket!"); });
        socket.on("displayError", (error) => { alert(error); });
    }
    else if (request.type == "disconnect"){
        socket.disconnect();
        socket = null;
    }
    else if (request.type == "hasVideo"){
        tabId = sender.tab.id;
        frameId = sender.frameId;
        console.log("Has video!");

        // When receiving time or state updates, pass them to videoInject.js
        const passDataToVideo = (data) => { console.log("SENDING TO VIDEO"); chrome.tabs.sendMessage(tabId, data, {frameId});}
        socket.on('stateUpdate', passDataToVideo);
        socket.on('timeUpdate', passDataToVideo);
        socket.emit('followerTimeReq');
    }
    else if (request.type == "sync") socket.emit('followerTimeReq');
    else if (request.type == "changeLeader"){
        socket.emit('changeLeader', (isLeader) => {
            if(isLeader){
                console.log("SENDING TO VIDEO");
                chrome.tabs.sendMessage(tabId, { type : "becomeLeader" }, {frameId});
                socket.on('leaderTimeReq', (callback) => {
                    chrome.tabs.sendMessage(tabId, { type : "getTime" }, {frameId}, (response) => {
                        if (response.type != "time") alert("FUCK");
                        callback(response); // Send back to server
                    });
                    console.log('Sent time update...');
                });
            }
        });
    }
    else if (request.type == "playpause") socket.emit('stateUpdate', request);
    else if (request.type == "time") socket.emit('leaderSeeked', request);
});
