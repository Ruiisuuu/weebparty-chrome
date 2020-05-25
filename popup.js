(() => {
    let role = null;
    document.getElementById("leaderBtn").onclick = () => {
        
    }
    document.getElementById("followerBtn").onclick = () => {
        role = "follower";
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
            
        }
        if(request.connected){
            document.getElementById("statusText").innerHTML = "Connected to server..."
        }
        if(request.injected){
            document.getElementById("statusText").innerHTML = "Injected script in video player..."
        }
    });
})();