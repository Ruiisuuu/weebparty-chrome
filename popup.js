(() => {
    document.getElementById("leaderBtn").onclick = document.getElementById("followerBtn").onclick = () =>{
        if(event.srcElement.id == "leaderBtn") chrome.runtime.sendMessage({ type: "inject", isLeader: true });
        else chrome.runtime.sendMessage({ type: "inject", isLeader: false });
    }
    document.getElementById("timeReqBtn").onclick = () => {
        chrome.runtime.sendMessage({ type: "timeRequest" });
    }
})();