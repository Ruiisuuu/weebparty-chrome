/**
 * popup.js
 * Author : Louis Mollick - 2020
 * 
 * The popup script is reloaded every time it is opened, so all persistance
 * is saved in the background script. The popup script simply sends messages 
 * to the background script when buttons are clicked.
 */
(() => {
    const toggle = document.getElementById("switch");
    chrome.runtime.getBackgroundPage( (window) => {
        // Prevent transition when loading current Connect switch state
        const label = document.getElementById('switchLabel');
        label.classList.add('notransition');
        showConnected( (window.socket != null) );
        label.offsetHeight; // Trigger a reflow, flushing the CSS changes
        label.classList.remove('notransition');
    });
    toggle.onchange = function(){
        if(this.checked) chrome.runtime.sendMessage({ type: "connect" });
        else chrome.runtime.sendMessage({ type: "disconnect" });
        showConnected(this.checked);
    }
    document.getElementById("injectBtn").onclick = () => {
        chrome.runtime.sendMessage({ type: "inject" });
    }
    document.getElementById("syncBtn").onclick = () => {
        chrome.runtime.sendMessage({ type: "sync" });
    }
    document.getElementById("leaderBtn").onclick = () => {
        chrome.runtime.sendMessage({ type: "changeLeader" });
    }

    const showConnected = (isConnected) => {
        toggle.checked = isConnected;
        if(isConnected){
            document.getElementById("buttonBox").style.display = "flex";
        } 
        else document.getElementById("buttonBox").style.display = "none";
    }
})();