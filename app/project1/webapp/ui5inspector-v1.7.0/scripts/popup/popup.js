(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';
/**
 * @typedef {Object} resolveMessageOptions
 * @property {Object} message - port.onMessage.addListener parameter
 * @property {Object} messageSender - port.onMessage.addListener parameter
 * @property {Object} sendResponse - port.onMessage.addListener parameter
 * @property {Object} actions - Object with all the needed actions as methods
 */
/**
 * Calls the needed message action.
 * @param {resolveMessageOptions} options
 * @private
 */
function _resolveMessage(options) {
    if (!options) {
        return;
    }
    var message = options.message;
    var messageSender = options.messageSender;
    var sendResponse = options.sendResponse;
    var actions = options.actions;
    var messageHandlerFunction = actions[message.action];
    if (messageHandlerFunction) {
        messageHandlerFunction(message, messageSender, sendResponse);
    }
}
/**
 * Convert UI5 timestamp to readable date.
 * @param {string} timeStamp  - timestamp in UI5 format ("20150427-1201")
 * @returns {string|undefined}
 * @private
 */
function _convertUI5TimeStampToHumanReadableFormat(timeStamp) {
    var formattedTime = '';
    if (!timeStamp) {
        return;
    }
    timeStamp = timeStamp.replace(/-/g, '');
    // Year
    formattedTime += timeStamp.substr(0, 4) + '/';
    // Month
    formattedTime += timeStamp.substr(4, 2) + '/';
    // Date
    formattedTime += timeStamp.substr(6, 2);
    formattedTime += ' ';
    // Hour
    formattedTime += timeStamp.substr(8, 2) + ':';
    // Minutes
    formattedTime += timeStamp.substr(10, 2) + 'h';
    return formattedTime;
}
/**
 * Set specific class for each OS.
 * @private
 */
function _setOSClassNameToBody() {
    // Set a body attribute for detecting and styling according the OS
    var osName = '';
    if (navigator.appVersion.indexOf('Win') !== -1) {
        osName = 'windows';
    }
    if (navigator.appVersion.indexOf('Mac') !== -1) {
        osName = 'mac';
    }
    if (navigator.appVersion.indexOf('Linux') !== -1) {
        osName = 'linux';
    }
    document.querySelector('body').setAttribute('os', osName);
}
/**
 * Applies the theme. Default is light.
 * @private
 */
function _applyTheme(theme) {
    var oldLink = document.getElementById('ui5inspector-theme');
    var head = document.getElementsByTagName('head')[0];
    var link = document.createElement('link');
    var url = '/styles/themes/light/light.css';
    if (oldLink) {
        oldLink.remove();
    }
    if (theme === 'dark') {
        url = '/styles/themes/dark/dark.css';
    }
    link.id = 'ui5inspector-theme';
    link.rel = 'stylesheet';
    link.href = url;
    head.appendChild(link);
}
function _isObjectEmpty(obj) {
    return Object.keys(obj).length === 0 && obj.constructor === Object;
}
function _getPort() {
    return {
        postMessage: function (message, callback) {
            chrome.runtime.sendMessage(message, callback);
        },
        onMessage: function (callback) {
            chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
                callback(request, sender, sendResponse);
            });
        }
    };
}
/**
 * Send message to all ports listening.
 * @param {Object} message
 */
function _sendToAll(message, callback) {
    var frameId = message.frameId;
    var options;
    chrome.windows.getCurrent().then(w => {
        chrome.tabs.query({ active: true, windowId: w.id }).then(tabs => {
            // options.frameId allows to send the message to
            // a specific frame instead of all frames in the tab
            if (frameId !== undefined) {
                options = { frameId };
            }
            chrome.tabs.sendMessage(tabs[0].id, message, options, callback);
        });
    });
}
module.exports = {
    formatter: {
        convertUI5TimeStampToHumanReadableFormat: _convertUI5TimeStampToHumanReadableFormat
    },
    resolveMessage: _resolveMessage,
    setOSClassName: _setOSClassNameToBody,
    applyTheme: _applyTheme,
    isObjectEmpty: _isObjectEmpty,
    getPort: _getPort,
    sendToAll: _sendToAll
};

},{}],2:[function(require,module,exports){
'use strict';
var utils = require('../modules/utils/utils.js');
window.chrome.tabs.query({ active: true, currentWindow: true }).then(function (tabs) {
    // Create a port with background page for continuous message communication
    var port = utils.getPort();
    // Name space for message handler functions.
    var messageHandler = {
        /**
         * Ask for the framework information, as soon as the main script is injected.
         * @param {Object} message
         */
        'on-main-script-injection': function (message) {
            port.postMessage({ action: 'get-framework-information' });
        },
        /**
         * Visualize the framework information.
         * @param {Object} message
         */
        'on-framework-information': function (message) {
            var linksDom;
            var library = document.querySelector('library');
            var buildtime = document.querySelector('buildtime');
            if (message.frameworkInformation.OpenUI5) {
                linksDom = document.querySelector('links[openui5]');
                library.innerText = 'OpenUI5';
                buildtime.innerText = message.frameworkInformation.OpenUI5;
            }
            else {
                linksDom = document.querySelector('links[sapui5]');
                library.innerText = 'SAPUI5';
                buildtime.innerText = message.frameworkInformation.SAPUI5;
            }
            linksDom.removeAttribute('hidden');
        }
    };
    // Listen for messages from the background page
    port.onMessage(function (message, messageSender, sendResponse) {
        // Resolve incoming messages
        utils.resolveMessage({
            message: message,
            messageSender: messageSender,
            sendResponse: sendResponse,
            actions: messageHandler
        });
    });
    port.postMessage({
        action: 'do-script-injection',
        tabId: tabs[0].id,
        file: '/scripts/content/main.js'
    });
});

},{"../modules/utils/utils.js":1}]},{},[2]);
