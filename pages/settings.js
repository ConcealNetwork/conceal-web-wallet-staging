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
define(["require", "exports", "../lib/numbersLab/DestructableView", "../lib/numbersLab/VueAnnotate", "../model/WalletRepository", "../lib/numbersLab/DependencyInjector", "../model/Wallet", "../model/AppState", "../model/Storage", "../model/Translations", "../providers/BlockchainExplorerProvider", "../model/WalletWatchdog"], function (require, exports, DestructableView_1, VueAnnotate_1, WalletRepository_1, DependencyInjector_1, Wallet_1, AppState_1, Storage_1, Translations_1, BlockchainExplorerProvider_1, WalletWatchdog_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var wallet = (0, DependencyInjector_1.DependencyInjectorInstance)().getInstance(Wallet_1.Wallet.name, 'default', false);
    var blockchainExplorer = BlockchainExplorerProvider_1.BlockchainExplorerProvider.getInstance();
    var walletWatchdog = (0, DependencyInjector_1.DependencyInjectorInstance)().getInstance(WalletWatchdog_1.WalletWatchdog.name, 'default', false);
    var SettingsView = /** @class */ (function (_super) {
        __extends(SettingsView, _super);
        function SettingsView(container) {
            var _this = _super.call(this, container) || this;
            _this.unsubscribeTicker = null;
            _this.checkOptimization = function () {
                blockchainExplorer.getHeight().then(function (blockchainHeight) {
                    var optimizeInfo = wallet.optimizationNeeded(blockchainHeight, config.optimizeThreshold);
                    _this.optimizeIsNeeded = optimizeInfo.isNeeded;
                }).catch(function (err) {
                    console.error("Error in checkOptimization, calling getHeight", err);
                });
            };
            _this.optimizeWallet = function () {
                _this.optimizeLoading = true; // set loading state to true
                blockchainExplorer.getHeight().then(function (blockchainHeight) {
                    var optimizeInfo = wallet.optimizationNeeded(blockchainHeight, config.optimizeThreshold);
                    if (optimizeInfo.isNeeded) {
                        wallet.createFusionTransaction(blockchainHeight, config.optimizeThreshold, blockchainExplorer, function (amounts, numberOuts) {
                            return blockchainExplorer.getRandomOuts(amounts, numberOuts);
                        }).then(function (processedOuts) {
                            var watchdog = (0, DependencyInjector_1.DependencyInjectorInstance)().getInstance(WalletWatchdog_1.WalletWatchdog.name);
                            //force a mempool check so the user is up to date
                            if (watchdog !== null) {
                                watchdog.checkMempool();
                            }
                            _this.optimizeLoading = false; // set loading state to false
                            setTimeout(function () {
                                _this.checkOptimization(); // check if optimization is still needed
                            }, 1000);
                        }).catch(function (err) {
                            console.log(err);
                            _this.optimizeLoading = false; // set loading state to false
                            setTimeout(function () {
                                _this.checkOptimization(); // check if optimization is still needed
                            }, 1000);
                        });
                    }
                    else {
                        swal({
                            title: i18n.t('settingsPage.optimizeWalletModal.title'),
                            html: i18n.t('settingsPage.optimizeWalletModal.content'),
                            confirmButtonText: i18n.t('settingsPage.optimizeWalletModal.confirmText'),
                            showCancelButton: false
                        }).then(function (result) {
                            _this.optimizeLoading = false;
                        });
                    }
                }).catch(function (err) {
                    console.error("Error in optimizeWallet, calling getHeight", err);
                });
            };
            _this.destruct = function () {
                // Cleanup ticker subscription
                if (_this.unsubscribeTicker) {
                    _this.unsubscribeTicker();
                }
                return _super.prototype.destruct.call(_this);
            };
            var self = _this;
            // Use the global CordovaDetector instance for environment detection
            _this.initializeCordovaDetection();
            _this.readSpeed = wallet.options.readSpeed;
            _this.checkMinerTx = wallet.options.checkMinerTx;
            // Sync custom node setting from storage to ensure consistency
            Storage_1.Storage.getItem('customNodeUrl', null).then(function (customNodeUrl) {
                if (customNodeUrl) {
                    _this.customNode = true;
                    _this.nodeUrl = customNodeUrl;
                    // Update wallet options to match storage
                    wallet.options.customNode = true;
                    wallet.options.nodeUrl = customNodeUrl;
                }
                else {
                    _this.customNode = wallet.options.customNode;
                    _this.nodeUrl = wallet.options.nodeUrl;
                }
            }).catch(function () {
                _this.customNode = wallet.options.customNode;
                _this.nodeUrl = wallet.options.nodeUrl;
            });
            _this.creationHeight = wallet.creationHeight;
            _this.scanHeight = wallet.lastHeight;
            // Initialize ticker from store
            Translations_1.tickerStore.initialize().then(function () {
                _this.useShortTicker = Translations_1.tickerStore.useShortTicker;
                _this.currentTicker = Translations_1.tickerStore.currentTicker;
                // Subscribe to ticker changes
                _this.unsubscribeTicker = Translations_1.tickerStore.subscribe(function (useShortTicker) {
                    _this.useShortTicker = useShortTicker;
                    _this.currentTicker = Translations_1.tickerStore.currentTicker;
                });
            });
            _this.checkOptimization();
            blockchainExplorer.getHeight().then(function (height) {
                self.maxHeight = height;
            }).catch(function (err) {
                // do nothing
            });
            Translations_1.Translations.getLang().then(function (userLang) {
                _this.language = userLang;
            }).catch(function (err) {
                console.error("Error trying to get user language", err);
            });
            // Initialize notification setting
            Storage_1.Storage.getItem('notificationsEnabled', false).then(function (enabled) {
                _this.notificationsEnabled = enabled;
            }).catch(function () {
                _this.notificationsEnabled = false;
            });
            // Initialize debug information for troubleshooting
            _this.initializeDebugInfo();
            return _this;
        }
        /**
         * Initialize debug information that can be displayed on the phone
         */
        SettingsView.prototype.initializeDebugInfo = function () {
            var _this = this;
            var updateDebugInfo = function () {
                var _a, _b, _c;
                var debugData = {
                    // Time info
                    timestamp: new Date().toISOString(),
                    timeElapsed: Math.round((Date.now() - window.loadStartTime) / 1000) + 's',
                    // Environment detection
                    currentUrl: window.location.href,
                    documentUrl: document.URL,
                    protocol: window.location.protocol,
                    host: window.location.host,
                    // Cordova detection
                    cordovaDetectorExists: typeof cordovaDetector !== 'undefined',
                    cordovaDetectorIsNative: typeof cordovaDetector !== 'undefined' ? cordovaDetector.isNative() : 'N/A',
                    isNativeEnvironment: _this.isNativeEnvironment,
                    // Window objects
                    windowNative: window.native,
                    windowCordova: typeof window.cordova !== 'undefined',
                    windowDevice: typeof window.device !== 'undefined',
                    windowPlugins: typeof window.plugins !== 'undefined',
                    // Cordova object details
                    cordovaVersion: ((_a = window.cordova) === null || _a === void 0 ? void 0 : _a.version) || 'N/A',
                    cordovaPlatformId: ((_b = window.cordova) === null || _b === void 0 ? void 0 : _b.platformId) || 'N/A',
                    cordovaGetAppVersion: typeof ((_c = window.cordova) === null || _c === void 0 ? void 0 : _c.getAppVersion) !== 'undefined',
                    // User agent and environment
                    userAgent: navigator.userAgent,
                    hasServiceWorker: 'serviceWorker' in navigator,
                    isAndroidWebView: navigator.userAgent.includes('Android') && navigator.userAgent.includes('wv'),
                    // Version info
                    nativeVersionCode: _this.nativeVersionCode,
                    nativeVersionNumber: _this.nativeVersionNumber,
                    // Additional checks
                    bodyHasNativeClass: document.body.classList.contains('native'),
                    hasDeviceReadyListener: true,
                    // URL analysis
                    isFileProtocol: window.location.protocol === 'file:',
                    isHttpsProtocol: window.location.protocol === 'https:',
                    isHttpProtocol: window.location.protocol === 'http:'
                };
                _this.debugInfo = JSON.stringify(debugData, null, 2);
            };
            // Set load start time if not already set
            if (!window.loadStartTime) {
                window.loadStartTime = Date.now();
            }
            // Update immediately
            updateDebugInfo();
            // Show debug info automatically if we're having issues or detection failed
            if (typeof cordovaDetector === 'undefined' || !this.isNativeEnvironment) {
                this.showDebugInfo = true;
            }
            // Refresh debug info every 3 seconds for live monitoring
            var debugInterval = setInterval(function () {
                if (_this.showDebugInfo) {
                    updateDebugInfo();
                }
            }, 3000);
            // Stop refreshing after 30 seconds to save resources
            setTimeout(function () {
                clearInterval(debugInterval);
            }, 30000);
        };
        SettingsView.prototype.toggleDebugInfo = function () {
            this.showDebugInfo = !this.showDebugInfo;
            if (this.showDebugInfo) {
                this.initializeDebugInfo(); // Refresh the info
            }
        };
        /**
         * Initialize Cordova detection using the global CordovaDetector
         * This leverages the centralized detection system from index.ts
         */
        SettingsView.prototype.initializeCordovaDetection = function () {
            var _this = this;
            // Check if we're in a native environment using the global detector
            if (typeof cordovaDetector !== 'undefined') {
                this.isNativeEnvironment = cordovaDetector.isNative();
                // If we're in a native environment, initialize Cordova features
                if (this.isNativeEnvironment) {
                    // Since the router waits for Cordova detection, we can try immediate initialization
                    // If Cordova is ready, this will work immediately; if not, use the promise
                    if (this.tryInitializeCordovaPlugins()) {
                        console.log('Cordova plugins initialized immediately');
                    }
                    else {
                        // Fallback to promise-based initialization
                        cordovaDetector.getLoadingPromise().then(function () {
                            _this.initializeCordovaPlugins();
                        });
                    }
                }
            }
            else {
                // Fallback if CordovaDetector is not available
                console.warn('CordovaDetector not found, falling back to web mode');
                this.isNativeEnvironment = false;
            }
        };
        /**
         * Try to initialize Cordova plugins immediately if Cordova is ready
         * Returns true if successful, false if Cordova is not yet ready
         */
        SettingsView.prototype.tryInitializeCordovaPlugins = function () {
            var cordova = window.cordova;
            if (!cordova || !cordova.getAppVersion) {
                return false; // Cordova not ready yet
            }
            // Cordova is ready, initialize plugins
            this.initializeCordovaPlugins();
            return true;
        };
        /**
         * Initialize Cordova plugins after environment is confirmed
         */
        SettingsView.prototype.initializeCordovaPlugins = function () {
            var _this = this;
            var cordova = window.cordova;
            if (!cordova) {
                console.warn('Cordova object not found despite native environment detection');
                return;
            }
            // Get app version information
            if (cordova.getAppVersion) {
                cordova.getAppVersion.getVersionNumber().then(function (version) {
                    _this.nativeVersionNumber = version;
                    console.log('App version number:', version);
                }).catch(function (err) {
                    console.warn('Could not get app version number:', err);
                });
                cordova.getAppVersion.getVersionCode().then(function (version) {
                    _this.nativeVersionCode = version;
                    console.log('App version code:', version);
                }).catch(function (err) {
                    console.warn('Could not get app version code:', err);
                });
            }
            else {
                console.warn('getAppVersion plugin not available');
            }
            // Initialize other Cordova-specific features here
            // For example: push notifications, file system access, etc.
        };
        SettingsView.prototype.languageWatch = function () {
            Translations_1.Translations.setBrowserLang(this.language);
            Translations_1.Translations.loadLangTranslation(this.language);
        };
        SettingsView.prototype.deleteWallet = function () {
            swal({
                title: i18n.t('settingsPage.deleteWalletModal.title'),
                html: i18n.t('settingsPage.deleteWalletModal.content'),
                showCancelButton: true,
                confirmButtonText: i18n.t('settingsPage.deleteWalletModal.confirmText'),
                cancelButtonText: i18n.t('settingsPage.deleteWalletModal.cancelText'),
            }).then(function (result) {
                if (result.value) {
                    AppState_1.AppState.disconnect();
                    (0, DependencyInjector_1.DependencyInjectorInstance)().register(Wallet_1.Wallet.name, undefined, 'default');
                    WalletRepository_1.WalletRepository.deleteLocalCopy();
                    window.location.href = '#index';
                }
            });
        };
        SettingsView.prototype.resetWallet = function () {
            swal({
                title: i18n.t('settingsPage.resetWalletModal.title'),
                html: i18n.t('settingsPage.resetWalletModal.content'),
                showCancelButton: true,
                confirmButtonText: i18n.t('settingsPage.resetWalletModal.confirmText'),
                cancelButtonText: i18n.t('settingsPage.resetWalletModal.cancelText'),
            }).then(function (result) {
                if (result.value) {
                    walletWatchdog.stop();
                    wallet.clearTransactions();
                    wallet.resetScanHeight();
                    walletWatchdog.start();
                    window.location.href = '#account';
                }
            });
        };
        SettingsView.prototype.readSpeedWatch = function () { this.updateWalletOptions(); };
        SettingsView.prototype.checkMinerTxWatch = function () { this.updateWalletOptions(); };
        //@VueWatched()	customNodeWatch(){this.updateConnectionSettings();}
        //@VueWatched()	nodeUrlWatch(){this.updateConnectionSettings();}
        SettingsView.prototype.creationHeightWatch = function () {
            if (this.creationHeight < 0)
                this.creationHeight = 0;
            if (this.creationHeight > this.maxHeight && this.maxHeight !== -1)
                this.creationHeight = this.maxHeight;
        };
        SettingsView.prototype.scanHeightWatch = function () {
            if (this.scanHeight < 0)
                this.scanHeight = 0;
            if (this.scanHeight > this.maxHeight && this.maxHeight !== -1)
                this.scanHeight = this.maxHeight;
        };
        SettingsView.prototype.useShortTickerWatch = function () {
            Translations_1.tickerStore.setTickerPreference(this.useShortTicker);
        };
        SettingsView.prototype.notificationsEnabledWatch = function () {
            Storage_1.Storage.setItem('notificationsEnabled', this.notificationsEnabled);
        };
        SettingsView.prototype.updateWalletOptions = function () {
            var options = wallet.options;
            options.readSpeed = this.readSpeed;
            options.checkMinerTx = this.checkMinerTx;
            wallet.options = options;
            walletWatchdog.setupWorkers();
            walletWatchdog.signalWalletUpdate();
        };
        SettingsView.prototype.updateWalletSettings = function () {
            wallet.creationHeight = this.creationHeight;
            wallet.lastHeight = this.scanHeight;
            walletWatchdog.signalWalletUpdate();
        };
        SettingsView.prototype.updateConnectionSettings = function () {
            var options = wallet.options;
            var oldCustomNode = options.customNode;
            var oldNodeUrl = options.nodeUrl;
            options.customNode = this.customNode;
            options.nodeUrl = this.nodeUrl;
            wallet.options = options;
            if (options.customNode) {
                Storage_1.Storage.setItem('customNodeUrl', options.nodeUrl);
            }
            else {
                Storage_1.Storage.remove('customNodeUrl');
            }
            // Update wallet watchdog with new options
            walletWatchdog.setupWorkers();
            walletWatchdog.signalWalletUpdate();
            // Reset nodes if custom node setting changed (enabled/disabled)
            // This ensures proper switching between custom and random nodes
            if (oldCustomNode !== this.customNode) {
                console.log('Custom node setting changed, resetting nodes...');
                // Reset the node connection workers with new values
                // This will automatically clean up and reinitialize the session
                BlockchainExplorerProvider_1.BlockchainExplorerProvider.getInstance().resetNodes();
            }
            else if (this.customNode && oldNodeUrl !== this.nodeUrl) {
                // Only reset if custom node URL changed (when using custom node)
                console.log('Custom node URL changed, resetting nodes...');
                BlockchainExplorerProvider_1.BlockchainExplorerProvider.getInstance().resetNodes();
            }
            else {
                console.log('Node configuration unchanged, skipping node reset');
            }
        };
        __decorate([
            (0, VueAnnotate_1.VueVar)(10)
        ], SettingsView.prototype, "readSpeed", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)(false)
        ], SettingsView.prototype, "checkMinerTx", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)(false)
        ], SettingsView.prototype, "customNode", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)('https://node.conceal.network/')
        ], SettingsView.prototype, "nodeUrl", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)(0)
        ], SettingsView.prototype, "creationHeight", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)(0)
        ], SettingsView.prototype, "scanHeight", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)(-1)
        ], SettingsView.prototype, "maxHeight", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)('en')
        ], SettingsView.prototype, "language", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)(0)
        ], SettingsView.prototype, "nativeVersionCode", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)('')
        ], SettingsView.prototype, "nativeVersionNumber", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)(false)
        ], SettingsView.prototype, "isNativeEnvironment", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)(false)
        ], SettingsView.prototype, "optimizeIsNeeded", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)(false)
        ], SettingsView.prototype, "optimizeLoading", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)(false)
        ], SettingsView.prototype, "useShortTicker", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)('')
        ], SettingsView.prototype, "currentTicker", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)(config)
        ], SettingsView.prototype, "config", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)(false)
        ], SettingsView.prototype, "notificationsEnabled", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)('')
        ], SettingsView.prototype, "debugInfo", void 0);
        __decorate([
            (0, VueAnnotate_1.VueVar)(false)
        ], SettingsView.prototype, "showDebugInfo", void 0);
        __decorate([
            (0, VueAnnotate_1.VueWatched)()
        ], SettingsView.prototype, "languageWatch", null);
        __decorate([
            (0, VueAnnotate_1.VueWatched)()
        ], SettingsView.prototype, "readSpeedWatch", null);
        __decorate([
            (0, VueAnnotate_1.VueWatched)()
        ], SettingsView.prototype, "checkMinerTxWatch", null);
        __decorate([
            (0, VueAnnotate_1.VueWatched)()
        ], SettingsView.prototype, "creationHeightWatch", null);
        __decorate([
            (0, VueAnnotate_1.VueWatched)()
        ], SettingsView.prototype, "scanHeightWatch", null);
        __decorate([
            (0, VueAnnotate_1.VueWatched)()
        ], SettingsView.prototype, "useShortTickerWatch", null);
        __decorate([
            (0, VueAnnotate_1.VueWatched)()
        ], SettingsView.prototype, "notificationsEnabledWatch", null);
        return SettingsView;
    }(DestructableView_1.DestructableView));
    if (wallet !== null && blockchainExplorer !== null)
        new SettingsView('#app');
    else
        window.location.href = '#index';
});
