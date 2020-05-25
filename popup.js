(() => {
    let role = null;
    document.getElementById("leaderBtn").onclick = () => {
        role = "leader";
        chrome.tabs.executeScript(null, {allFrames: true, file:"injector.js"});
    }
    document.getElementById("followerBtn").onclick = () => {
        role = "follower";
        chrome.tabs.executeScript(null, {allFrames: true, file:"injector.js"});
    }
    document.getElementById("timeReqBtn").onclick = () => {
        console.log("Clicked");
        const videoFrameId = parseInt(localStorage.getItem('videoFrameId'));
        if(videoFrameId) chrome.tabs.query({ currentWindow: true, active: true }, (tabs) => {
            console.log("SENDING TIME REQ"); 
            chrome.tabs.sendMessage(tabs[0].id, "time", {frameId: videoFrameId});
            });
    }
    chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
        console.log("Response received!");
        if (request.hasVideo){
            console.log("has video!");
            localStorage.setItem('videoFrameId', sender.frameId); // Save frameId for timeReq
            chrome.tabs.executeScript(null, {frameId: sender.frameId, file:"socket.io.js"});
            chrome.tabs.executeScript(null, {frameId: sender.frameId, file:"content.js"},
            () => { if (role) // Tell content script to act like follower or leader
                chrome.tabs.query({ currentWindow: true, active: true },
                (tabs) => {chrome.tabs.sendMessage(tabs[0].id, role, {frameId: sender.frameId});});
            });
        }
        if(request.connected){
            document.getElementById("statusText").innerHTML = "Connected to server..."
        }
        if(request.injected){
            document.getElementById("statusText").innerHTML = "Injected scripts in video player..."
        }
    });
})();