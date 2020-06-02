/**
 * background.js
 * Author : Louis Mollick - 2020
 * 
 * The background script serves as the main script for the extension.
 * Example execution flow :
 * 1. On Chrome start, this and Socket.io script are injected in Background (see manifest.json).
 * 2. Popup connect switch is clicked and a message is sent of type "connect"
 * 3. Background script receives the message and sets up socket io connection
 * 4. User navigates to desired website, clicks "Inject" in Popup which sends a message of type "inject"
 * 5. videoInject.js is injected into all frames of the website. If the frame contains a video, it sends back
 * a message of type "hasVideo" to this background script (the tabId and frameId are saved for later use). 
 * The user is officially a follower, ie can receive video updates (sync/followerTimeReq = 6. is automatically 
 * called here on injection).
 * 6. If the client loses sync with the leader, they press the "Sync" button in the popup, sending a message
 * of type "sync" to this background script. This requests the current time from the leader and sends it back 
 * to this client.
 * 7. If there is no current leader, the client can press the "Become Leader" button in the popup, sending a 
 * message of type "changeLeader" to the background script. This requests leader permissions from the server,
 * whose response is sent through a callback (a boolean isLeader). The background script then sends a message
 * of type "becomeLeader" to videoInject.js (using the frameid and tabId previously saved).
 * Additionally, a socket event listener is set up, now that the client is the Leader. This is called when 
 * a follower sends a 'followerTimeReq', ie presses the "Sync" button in the popup. In this case, a message
 * of type "getTime" is sent to videoInject.js, which sends back a message of type "time", which is finally
 * sent back to the server and broadcasted to all the followers.
 * 8. When the leader plays, pauses, or seeks in their video, a message is sent from videoInject.js
 * of type "playpause" or "time", and then broadcasted to all followers.
 * 9. When the user is done, the disconnect switch is clicked in the popup, a message is sent of type "disconnect"
 * is sent/received and the background script closes the socket io connection.
 */
var socket = null;
var connected = false;
var tabId = null;
var frameId = null;

chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    console.log("RUNTIME MESSAGE :", request);
    if (request.type == "connect"){
        socket = io('http://localhost:3000'); //io('https://weebparty-server.herokuapp.com/');
        socket.on('connect', () => { 
            connected = true;
            chrome.storage.local.set({isLeader: false});
            console.log("Connected via websocket!"); });
        socket.on('disconnect', () => { 
            connected = false;
            chrome.storage.local.set({isLeader: false});
            console.log("Disconnected."); })
        socket.on("displayError", (error) => { alert(error); });
    }
    else if (request.type == "disconnect"){
        socket.disconnect();
        socket = null;
    }
    else if (connected){
        if (request.type == "inject") chrome.tabs.executeScript(null, { allFrames: true, file:"videoInject.js" });
        else if (request.type == "hasVideo"){
            tabId = sender.tab.id;
            frameId = sender.frameId;
            // When receiving time or state updates, pass them to videoInject.js
            const passDataToVideo = (data) => { console.log("SENDING TO VIDEO"); chrome.tabs.sendMessage(tabId, data, {frameId});}
            socket.on('stateUpdate', passDataToVideo);
            socket.on('timeUpdate', passDataToVideo);

            chrome.storage.local.get(['isLeader'], (result) => {
                if (!result.isLeader) socket.emit('followerTimeReq');
            });
            
        }
        else if (request.type == "playpause") socket.emit('stateUpdate', request);
        else if (request.type == "time") socket.emit('leaderSeeked', request);
        else if (request.type == "sync") socket.emit('followerTimeReq');
        else if (request.type == "changeLeader" && tabId && frameId){
            socket.emit('changeLeader', (isLeader) => {
                chrome.storage.local.set({isLeader});
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
        
    }
});
