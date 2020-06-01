(() => {
    const toggle = document.getElementById("switch");
    chrome.runtime.getBackgroundPage( (window) => {
        const label = document.getElementById('switchLabel');
        label.classList.add('notransition');
        showConnected( (window.socket != null) );
        label.offsetHeight; // Trigger a reflow, flushing the CSS changes
        label.classList.remove('notransition');
    });
    toggle.onchange = function(){
        console.log('Yeet');
        if(this.checked) chrome.runtime.sendMessage({ type: "connect" });
        else chrome.runtime.sendMessage({ type: "disconnect" });
        showConnected(this.checked);
    }
    document.getElementById("syncBtn").onclick = () => {
        chrome.runtime.sendMessage({ type: "sync" });
    }
    document.getElementById("leaderBtn").onclick = () => {
        chrome.runtime.sendMessage({ type: "changeLeader" });
    }
    // chrome.runtime.onMessage.addListener((request) => {
    //     if (request.type == "hasVideo"){
    //         document.getElementById("afterInjection")
    //     }
    // });

    const showConnected = (isConnected) => {
        toggle.checked = isConnected;
        if(isConnected){
            document.getElementById("buttonBox").style.display = "flex";
            chrome.tabs.executeScript(null, {allFrames: true, file:"videoInject.js"}); // Can inject because of inclusion guard
        } 
        else document.getElementById("buttonBox").style.display = "none";
    }
})();