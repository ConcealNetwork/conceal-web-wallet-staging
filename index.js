/*
 * Copyright (c) 2018 Gnock
 * Copyright (c) 2018-2019 The Masari Project
 * Copyright (c) 2018-2020 The Karbo developers
 * Copyright (c) 2018-2025 Conceal Community, Conceal.Network & Conceal Devs
 *
 * Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
 *
 * 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
 *
 * 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
 *
 * 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
define(["require", "exports", "./lib/numbersLab/Router", "./model/Mnemonic", "./lib/numbersLab/VueAnnotate", "./model/Storage", "./model/Translations", "./lib/numbersLab/messageClick"], function (require, exports, Router_1, Mnemonic_1, VueAnnotate_1, Storage_1, Translations_1, messageClick_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    //========================================================
    //bridge for cnUtil with the new mnemonic class
    //========================================================
    window.mn_random = Mnemonic_1.Mnemonic.mn_random;
    window.mn_encode = Mnemonic_1.Mnemonic.mn_encode;
    window.mn_decode = Mnemonic_1.Mnemonic.mn_decode;
    //========================================================
    //====================Translation code====================
    //========================================================
    var i18n = new VueI18n({
        locale: 'en',
        fallbackLocale: 'en',
    });
    window.i18n = i18n;
    var browserUserLang = '' + (navigator.language || navigator.userLanguage);
    browserUserLang = browserUserLang.toLowerCase().split('-')[0];
    // Create a promise that resolves when i18n is ready
    var i18nReadyPromise = new Promise(function (resolve) {
        Storage_1.Storage.getItem('user-lang', browserUserLang).then(function (userLang) {
            if (userLang) {
                Translations_1.Translations.loadLangTranslation(userLang).catch(function (err) {
                    console.error("Failed to load '".concat(userLang, "' language"), err);
                    return Translations_1.Translations.loadLangTranslation('en');
                }).catch(function (err) {
                    console.error("Failed to load 'en' language", err);
                }).finally(function () {
                    resolve();
                });
            }
            else {
                resolve();
            }
        });
    });
    window.i18nReadyPromise = i18nReadyPromise;
    window.safeSwal = function (options) {
        return i18nReadyPromise.then(function () {
            return swal(options);
        });
    };
    //========================================================
    //====================Generic design======================
    //========================================================
    var MenuView = /** @class */ (function (_super) {
        __extends(MenuView, _super);
        function MenuView(containerName, vueData) {
            if (vueData === void 0) { vueData = null; }
            var _this = _super.call(this, vueData) || this;
            _this.isMenuHidden = false;
            _this.isMenuHidden = $('body').hasClass('menuHidden');
            if ($('body').hasClass('menuDisabled'))
                _this.isMenuHidden = true;
            _this.update();
            return _this;
        }
        MenuView.prototype.toggle = function () {
            if ($('body').hasClass('menuDisabled'))
                this.isMenuHidden = true;
            else
                this.isMenuHidden = !this.isMenuHidden;
            this.update();
        };
        MenuView.prototype.update = function () {
            if (this.isMenuHidden)
                $('body').addClass('menuHidden');
            else
                $('body').removeClass('menuHidden');
        };
        MenuView = __decorate([
            (0, VueAnnotate_1.VueClass)()
        ], MenuView);
        return MenuView;
    }(Vue));
    var menuView = new MenuView('#menu');
    $('#menu a').on('click', function (event) {
        menuView.toggle();
    });
    $('#menu').on('click', function (event) {
        event.stopPropagation();
    });
    $('#topBar .toggleMenu').on('click', function (event) {
        menuView.toggle();
        event.stopPropagation();
        return false;
    });
    $(window).click(function () {
        menuView.isMenuHidden = true;
        $('body').addClass('menuHidden');
    });
    //mobile swipe
    var pageWidth = window.innerWidth || document.body.clientWidth;
    var treshold = Math.max(1, Math.floor(0.2 * (pageWidth)));
    var touchstartX = 0;
    var touchstartY = 0;
    var touchendX = 0;
    var touchendY = 0;
    var gestureZone = $('body')[0];
    gestureZone.addEventListener('touchstart', function (event) {
        touchstartX = event.changedTouches[0].screenX;
        touchstartY = event.changedTouches[0].screenY;
    }, false);
    gestureZone.addEventListener('touchend', function (event) {
        touchendX = event.changedTouches[0].screenX;
        touchendY = event.changedTouches[0].screenY;
        handleGesture(event);
    }, false);
    var limit = 0.8; // Add this constant before handleGesture function
    function handleGesture(e) {
        var x = touchendX - touchstartX;
        var y = touchendY - touchstartY;
        var xy = Math.abs(x / y);
        var yx = Math.abs(y / x);
        if (Math.abs(x) > treshold) { // || Math.abs(y) > treshold      ----- >   do we care about y other than a big diagonal swipe already taken into account by xy and yx ?
            if (yx <= limit) {
                if (x < 0) {
                    //left
                    if (!menuView.isMenuHidden)
                        menuView.toggle();
                }
                else {
                    //right
                    if (menuView.isMenuHidden)
                        menuView.toggle();
                }
            }
            if (xy <= limit) {
                if (y < 0) {
                    //top
                }
                else {
                    //bottom
                }
            }
        }
        else {
            //tap
        }
    }
    //Collapse the menu after clicking on a menu item
    function navigateToPage(page) {
        window.location.hash = "!".concat(page);
    }
    function isMobileDevice() {
        return window.innerWidth <= 600; // Adjust this breakpoint as needed
    }
    // Select all menu items
    var menuItems = document.querySelectorAll('#menu a[href^="#!"]');
    menuItems.forEach(function (item) {
        item.addEventListener('click', function (event) {
            // Prevent the default action
            event.preventDefault();
            var target = event.currentTarget.getAttribute('href');
            if (target) {
                // Remove the "#!" from the beginning of the href
                var page = target.substring(2);
                navigateToPage(page);
                // Toggle the menu off only on mobile devices
                if (isMobileDevice() && !menuView.isMenuHidden) {
                    menuView.toggle();
                }
            }
        });
    });
    var CopyrightView = /** @class */ (function (_super) {
        __extends(CopyrightView, _super);
        function CopyrightView(containerName, vueData) {
            if (vueData === void 0) { vueData = null; }
            var _this = _super.call(this, vueData) || this;
            Translations_1.Translations.getLang().then(function (userLang) {
                _this.language = userLang;
            });
            return _this;
        }
        CopyrightView.prototype.languageWatch = function () {
            var _this = this;
            Translations_1.Translations.setBrowserLang(this.language);
            Translations_1.Translations.loadLangTranslation(this.language).catch(function (err) {
                console.error("Failed to load \"".concat(_this.language, "\" language"), err);
            });
        };
        __decorate([
            (0, VueAnnotate_1.VueVar)('en')
        ], CopyrightView.prototype, "language", void 0);
        __decorate([
            (0, VueAnnotate_1.VueWatched)()
        ], CopyrightView.prototype, "languageWatch", null);
        CopyrightView = __decorate([
            (0, VueAnnotate_1.VueClass)()
        ], CopyrightView);
        return CopyrightView;
    }(Vue));
    var copyrightView = new CopyrightView('#copyright');
    //========================================================
    //==================Loading the right page================
    //========================================================
    /**
     * Cordova Environment Detection and Initialization
     * Uses the official event-driven approach as recommended by Apache Cordova
     */
    var CordovaDetector = /** @class */ (function () {
        function CordovaDetector() {
            var _this = this;
            this.deviceReadyFired = false;
            this.isNativeEnvironment = false;
            this.loadingPromiseResolve = null;
            this.loadingPromiseReject = null;
            this.loadingPromise = new Promise(function (resolve, reject) {
                _this.loadingPromiseResolve = resolve;
                _this.loadingPromiseReject = reject;
            });
            this.initializeCordovaDetection();
        }
        CordovaDetector.getInstance = function () {
            if (!CordovaDetector.instance) {
                CordovaDetector.instance = new CordovaDetector();
            }
            return CordovaDetector.instance;
        };
        /**
         * Initialize Cordova detection using the official event-driven approach
         */
        CordovaDetector.prototype.initializeCordovaDetection = function () {
            var _this = this;
            console.log('Initializing Cordova detection...');
            // Method 1: Listen for deviceready event (OFFICIAL METHOD)
            document.addEventListener('deviceready', function () {
                console.log('Cordova deviceready event fired');
                _this.deviceReadyFired = true;
                _this.isNativeEnvironment = true;
                _this.handleCordovaReady();
            }, false);
            // Method 2: Fallback detection with validation
            setTimeout(function () {
                if (!_this.deviceReadyFired) {
                    if (_this.validateCordovaObject()) {
                        console.log('Cordova detected via fallback method');
                        _this.deviceReadyFired = true;
                        _this.isNativeEnvironment = true;
                        _this.handleCordovaReady();
                    }
                    else {
                        console.log('Cordova not detected - running in web mode');
                        _this.isNativeEnvironment = false;
                        _this.handleWebMode();
                    }
                }
            }, 3000); // Increased timeout to allow for slower devices
            // Method 3: Aggressive detection for remote-loading Cordova apps (parallel process)
            this.startAggressiveDetection();
        };
        /**
         * Aggressive detection method that runs in parallel for Android WebView apps
         * This won't interfere with the main detection logic
         */
        CordovaDetector.prototype.startAggressiveDetection = function () {
            var _this = this;
            var detectionAttempts = 0;
            var maxAttempts = 8;
            var tryAggressiveDetection = function () {
                detectionAttempts++;
                // Only continue if we haven't already detected Cordova
                if (!_this.deviceReadyFired && !_this.isNativeEnvironment) {
                    // Check for Android WebView environment indicators
                    if (_this.isLikelyAndroidWebViewApp()) {
                        console.log("Aggressive detection attempt ".concat(detectionAttempts, ": Android WebView detected"));
                        // Try to validate Cordova object
                        if (_this.validateCordovaObject()) {
                            console.log('Cordova detected via aggressive method');
                            _this.deviceReadyFired = true;
                            _this.isNativeEnvironment = true;
                            _this.handleCordovaReady();
                            return; // Stop trying
                        }
                    }
                    // Continue trying if we haven't reached max attempts
                    if (detectionAttempts < maxAttempts) {
                        setTimeout(tryAggressiveDetection, 600); // Try every 600ms
                    }
                }
            };
            // Start aggressive detection after a short delay
            setTimeout(tryAggressiveDetection, 200);
        };
        /**
         * Check specifically for Android WebView app environment
         */
        CordovaDetector.prototype.isLikelyAndroidWebViewApp = function () {
            var userAgent = navigator.userAgent.toLowerCase();
            // Android WebView indicators
            var isAndroid = userAgent.includes('android');
            var hasWebView = userAgent.includes('wv') || userAgent.includes('webview');
            var hasVersionString = userAgent.includes('version/');
            var lacksChrome = !userAgent.includes('chrome/') || userAgent.includes('chrome/0.');
            // Service worker check (often missing in WebView)
            var noServiceWorker = !('serviceWorker' in navigator);
            // URL checks for remote loading
            var isRemoteUrl = window.location.protocol.startsWith('http');
            return isAndroid && (hasWebView || (hasVersionString && lacksChrome) || noServiceWorker) && isRemoteUrl;
        };
        /**
         * Validate that the cordova object has expected properties
         */
        CordovaDetector.prototype.validateCordovaObject = function () {
            var cordova = window.cordova;
            if (!cordova)
                return false;
            // Check for essential Cordova properties
            return (typeof cordova.version === 'string' &&
                typeof cordova.platformId === 'string' &&
                cordova.plugins !== undefined);
        };
        /**
         * Handle Cordova-specific initialization after environment is confirmed
         */
        CordovaDetector.prototype.handleCordovaReady = function () {
            console.log('Cordova environment confirmed - setting up native mode');
            window.native = true;
            $('body').addClass('native');
            // Load cordova.js if not already loaded
            if (!document.querySelector('script[src="cordova.js"]')) {
                var cordovaJs = document.createElement('script');
                cordovaJs.type = 'text/javascript';
                cordovaJs.src = 'cordova.js';
                document.body.appendChild(cordovaJs);
            }
            // Resolve the loading promise
            if (this.loadingPromiseResolve) {
                this.loadingPromiseResolve();
            }
        };
        /**
         * Handle web mode initialization
         */
        CordovaDetector.prototype.handleWebMode = function () {
            console.log('Web environment confirmed - setting up web mode');
            window.native = false;
            // Don't add native class
            // Resolve the loading promise immediately for web mode
            if (this.loadingPromiseResolve) {
                this.loadingPromiseResolve();
            }
        };
        /**
         * Get the loading promise that resolves when environment is determined
         */
        CordovaDetector.prototype.getLoadingPromise = function () {
            return this.loadingPromise;
        };
        /**
         * Check if running in native environment
         */
        CordovaDetector.prototype.isNative = function () {
            return this.isNativeEnvironment;
        };
        return CordovaDetector;
    }());
    // Initialize Cordova detection
    var cordovaDetector = CordovaDetector.getInstance();
    var promiseLoadingReady = cordovaDetector.getLoadingPromise();
    // Legacy compatibility - remove these once all code is updated
    var isCordovaApp = false; // Deprecated - use cordovaDetector.isNative() instead
    promiseLoadingReady.then(function () {
        var router = new Router_1.Router('./', '../../');
        window.onhashchange = function () {
            router.changePageFromHash();
        };
        // Initialize message menu after the page is ready
        (0, messageClick_1.initializeMessageMenu)();
    });
    //========================================================
    //==================Service worker for web================
    //========================================================
    //only install the service on web platforms and not native
    console.log("%c                                            \n .d8888b.  888                       888    \nd88P  Y88b 888                       888    \nY88b.      888                       888    This is a browser feature intended for \n \"Y888b.   888888  .d88b.  88888b.   888    developers. If someone told you to copy-paste \n    \"Y88b. 888    d88\"\"88b 888 \"88b  888    something here to enable a feature \n      \"888 888    888  888 888  888  Y8P    or \"hack\" someone's account, it is a \nY88b  d88P Y88b.  Y88..88P 888 d88P         scam and will give them access to your \n \"Y8888P\"   \"Y888  \"Y88P\"  88888P\"   888    Conceal Network Wallet!\n                           888              \n                           888              \n                           888              \n\nIA Self-XSS scam tricks you into compromising your wallet by claiming to provide a way to log into someone else's wallet, or some other kind of reward, after pasting a special code or link into your web browser.", "font-family:monospace");
    // Use proper Cordova detection for service worker registration
    promiseLoadingReady.then(function () {
        if (!cordovaDetector.isNative() && 'serviceWorker' in navigator) {
            // Flag to prevent showing the same update multiple times
            var updateModalShown_1 = false;
            var showRefreshUI_1 = function (registration) {
                // Prevent showing the same update multiple times
                if (updateModalShown_1) {
                    return;
                }
                updateModalShown_1 = true;
                // Use safeSwal which automatically waits for i18n
                window.safeSwal({
                    type: 'info',
                    title: i18n.t('global.newVersionModal.title'),
                    html: i18n.t('global.newVersionModal.content'),
                    confirmButtonText: i18n.t('global.newVersionModal.confirmText'),
                    showCancelButton: true,
                    cancelButtonText: i18n.t('global.newVersionModal.cancelText'),
                }).then(function (value) {
                    if (!value.dismiss) {
                        registration.waiting.postMessage('force-activate');
                    }
                    else {
                        // Reset flag when user cancels so they can see it again later
                        updateModalShown_1 = false;
                    }
                });
            };
            var onNewServiceWorker_1 = function (registration, callback) {
                if (registration.waiting) {
                    // SW is waiting to activate. Can occur if multiple clients open and
                    // one of the clients is refreshed.
                    return callback();
                }
                var listenInstalledStateChange = function () {
                    registration.installing.addEventListener('statechange', function (event) {
                        if (event.target.state === 'installed') {
                            // A new service worker is available, inform the user
                            callback();
                        }
                    });
                };
                if (registration.installing) {
                    return listenInstalledStateChange();
                }
                // We are currently controlled so a new SW may be found...
                // Add a listener in case a new SW is found,
                registration.addEventListener('updatefound', listenInstalledStateChange);
            };
            navigator.serviceWorker.addEventListener('message', function (event) {
                if (!event.data) {
                    return;
                }
                switch (event.data) {
                    case 'reload-window-update':
                        window.location.reload();
                        break;
                    default:
                        // NOOP
                        break;
                }
            });
            navigator.serviceWorker.register('/service-worker.js').then(function (registration) {
                // Track updates to the Service Worker.
                if (!navigator.serviceWorker.controller) {
                    // The window client isn't currently controlled so it's a new service
                    // worker that will activate immediately
                    return;
                }
                //console.log('on new service worker');
                onNewServiceWorker_1(registration, function () {
                    showRefreshUI_1(registration);
                });
            });
        }
    });
});
