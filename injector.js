/**
 * injector.js
 * Author : Louis Mollick - 2020
 * Injected into all frames of a page and sends signal 
 * if it finds the desired frame (with video player).
 * https://stackoverflow.com/questions/9915311/chrome-extension-code-vs-content-scripts-vs-injected-scripts
 */
(function(){
    const video = document.getElementsByTagName("video")[0];
    if(video){
        console.log('INJECTOR FOUND VIDEO');
        chrome.runtime.sendMessage({hasVideo: true});
        
    }
})();
