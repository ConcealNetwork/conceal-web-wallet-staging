/*
 * Copyright (c) 2024 Acktarius
 * Copyright (c) 2018-2025 Conceal Community, Conceal.Network & Conceal Devs
*/
define(["require", "exports", "../../model/Storage"], function (require, exports, Storage_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.initializeMessageMenu = initializeMessageMenu;
    /**
     * Initializes the message menu functionality.
     * This function ensures the event handler is attached at the right time
     * depending on the DOM loading state.
     */
    function initializeMessageMenu() {
        // Wait for DOM to be ready
        if (document.readyState === 'loading') {
            // If DOM is loading, wait for it to be ready before attaching handler
            document.addEventListener('DOMContentLoaded', attachHandler);
        }
        else {
            // If DOM is already loaded, attach handler immediately
            attachHandler();
            console.log('Message menu initialized after DOM ready');
        }
    }
    /**
     * Attaches click event handler to the message menu link.
     * This handler removes the unread message counter and bold styling
     * and reset isInitialized to false.
     */
    function attachHandler() {
        // Find the message menu link in the DOM
        var messageLink = document.querySelector('#menu a[href="#!messages"]');
        if (!messageLink) {
            console.log('Message menu link not found');
            return;
        }
        // Add click event listener to handle message notifications
        messageLink.addEventListener('click', function (event) {
            var _a;
            var target = event.currentTarget;
            // select last span
            var messageText = target.querySelector('span:last-child');
            // If message count exists (ends with parenthesis), remove it
            if ((_a = messageText === null || messageText === void 0 ? void 0 : messageText.textContent) === null || _a === void 0 ? void 0 : _a.endsWith(')')) {
                // Remove the count and keep only the text
                messageText.textContent = messageText.textContent.split(' (')[0];
                // Remove bold styling indicating unread messages
                target.classList.remove('font-bold');
                // Reset the initialization state in AccountView
                var accountView = window.accountView;
                if (accountView) {
                    accountView.isInitialized = false;
                }
                // Clear Cordova badge when user visits messages
                clearCordovaBadge();
            }
        });
    }
    /**
     * Clear the Cordova badge when user visits messages
     */
    function clearCordovaBadge() {
        Storage_1.Storage.getItem('notificationsEnabled', false).then(function (enabled) {
            var _a, _b, _c;
            if (enabled && ((_c = (_b = (_a = window.cordova) === null || _a === void 0 ? void 0 : _a.plugins) === null || _b === void 0 ? void 0 : _b.notification) === null || _c === void 0 ? void 0 : _c.badge)) {
                window.cordova.plugins.notification.badge.clear();
            }
        }).catch(function () {
            // If storage fails, don't clear notifications
        });
    }
});
