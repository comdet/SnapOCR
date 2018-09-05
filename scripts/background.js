'use strict';

var WAIT_FOR_REPAINT_MS = 100;

var delay = function(ms) {
    return new Promise(function(resolve) {
        setTimeout(resolve, ms);
    });
};

var waitForPaint = function() {
    return delay(WAIT_FOR_REPAINT_MS);
};

function onPageActionClicked(tab) {
    console.log('onPageActionClicked', tab.id);

    var cssPromise = new Promise(function(resolve) {
        chrome.tabs.insertCSS(tab.id, {file: 'styles/pinsnapper.css'}, resolve);
    });
    var jsPromise = new Promise(function(resolve) {
        chrome.tabs.executeScript(tab.id, {file: 'scripts/pinsnapper.js'}, resolve);
    });

    Promise.all([cssPromise, jsPromise])
        // Fragile: the insertCSS and executeScript callback don't guarantee
        // that the styles all styles have been painted.  Delay a little
        // while to let a paint happen.  Maybe this can be made more robust
        // by waiting on RAF from in the tab and signaling back to the
        // background page that it's ready for capture.
        .then(function() {
            return waitForPaint();
        })
        .then(function() {
            chrome.tabs.captureVisibleTab(null, function(dataUri) {
                // TODO: Restore all nopin images after taking the screenshot.
                chrome.tabs.sendRequest(tab.id, {
                    action: 'pinSnap',
                    screenshotDataUri: dataUri
                });
            });
        })
        .catch(function(error) {
            console.log('Uncaught error', error);
        });
}

function onTabUpdated(tabId, changeInfo) {
    console.log('onTabUpdated', tabId, changeInfo);
    chrome.pageAction.show(tabId);
}

chrome.pageAction.onClicked.addListener(onPageActionClicked);

chrome.tabs.onUpdated.addListener(onTabUpdated);
