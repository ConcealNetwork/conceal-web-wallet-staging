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

import {DestructableView} from "../lib/numbersLab/DestructableView";
import {VueVar, VueWatched} from "../lib/numbersLab/VueAnnotate";
import {TransactionsExplorer} from "../model/TransactionsExplorer";
import {WalletRepository} from "../model/WalletRepository";
import {DependencyInjectorInstance} from "../lib/numbersLab/DependencyInjector";
import {Constants} from "../model/Constants";
import {Wallet} from "../model/Wallet";
import {AppState} from "../model/AppState";
import {Storage} from "../model/Storage";
import {Translations, tickerStore} from "../model/Translations";
import {BlockchainExplorerProvider} from "../providers/BlockchainExplorerProvider";
import {BlockchainExplorer, RawDaemon_Out} from "../model/blockchain/BlockchainExplorer";
import {WalletWatchdog} from "../model/WalletWatchdog";

let wallet : Wallet = DependencyInjectorInstance().getInstance(Wallet.name, 'default', false);
let blockchainExplorer: BlockchainExplorer = BlockchainExplorerProvider.getInstance();
let walletWatchdog : WalletWatchdog = DependencyInjectorInstance().getInstance(WalletWatchdog.name,'default', false);

// Access the global CordovaDetector instance
declare const cordovaDetector: any;

class SettingsView extends DestructableView{
	@VueVar(10) readSpeed !: number;
	@VueVar(false) checkMinerTx !: boolean;

	@VueVar(false) customNode !: boolean;
	@VueVar('https://node.conceal.network/') nodeUrl !: string;

	@VueVar(0) creationHeight !: number;
	@VueVar(0) scanHeight !: number;

	@VueVar(-1) maxHeight !: number;
	@VueVar('en') language !: string;

	@VueVar(0) nativeVersionCode !: number;
	@VueVar('') nativeVersionNumber !: string;
	@VueVar(false) isNativeEnvironment !: boolean;

  @VueVar(false) optimizeIsNeeded !: boolean;
  @VueVar(false) optimizeLoading !: boolean;

	@VueVar(false) useShortTicker !: boolean;
	@VueVar('') currentTicker !: string;
	@VueVar(config) config !: any;
	@VueVar(false) notificationsEnabled !: boolean;

	// Debug information for troubleshooting on device
	@VueVar('') debugInfo !: string;
	@VueVar(false) showDebugInfo !: boolean;

	private unsubscribeTicker: (() => void) | null = null;

	constructor(container : string) {
		super(container);
		let self = this;
		
		// Use the global CordovaDetector instance for environment detection
		this.initializeCordovaDetection();
		
		this.readSpeed = wallet.options.readSpeed;
		this.checkMinerTx = wallet.options.checkMinerTx;

		// Sync custom node setting from storage to ensure consistency
		Storage.getItem('customNodeUrl', null).then(customNodeUrl => {
			if (customNodeUrl) {
				this.customNode = true;
				this.nodeUrl = customNodeUrl;
				// Update wallet options to match storage
				wallet.options.customNode = true;
				wallet.options.nodeUrl = customNodeUrl;
			} else {
				this.customNode = wallet.options.customNode;
				this.nodeUrl = wallet.options.nodeUrl;
			}
		}).catch(() => {
			this.customNode = wallet.options.customNode;
			this.nodeUrl = wallet.options.nodeUrl;
		});

		this.creationHeight = wallet.creationHeight;
		this.scanHeight = wallet.lastHeight;

		// Initialize ticker from store
		tickerStore.initialize().then(() => {
			this.useShortTicker = tickerStore.useShortTicker;
			this.currentTicker = tickerStore.currentTicker;
			
			// Subscribe to ticker changes
			this.unsubscribeTicker = tickerStore.subscribe((useShortTicker) => {
				this.useShortTicker = useShortTicker;
				this.currentTicker = tickerStore.currentTicker;
			});
		});

		this.checkOptimization();

		blockchainExplorer.getHeight().then(function (height: number) {
			self.maxHeight = height;
		}).catch((err: any) => {
			// do nothing
		});

		Translations.getLang().then((userLang : string) => {
			this.language = userLang;
		}).catch((err: any) => {
			console.error("Error trying to get user language", err);
		});

		// Initialize notification setting
		Storage.getItem('notificationsEnabled', false).then((enabled : boolean) => {
			this.notificationsEnabled = enabled;
		}).catch(() => {
			this.notificationsEnabled = false;
		});

		// Initialize debug information for troubleshooting
		this.initializeDebugInfo();
	}

	/**
	 * Initialize debug information that can be displayed on the phone
	 */
	private initializeDebugInfo(): void {
		const updateDebugInfo = () => {
			const debugData = {
				// Time info
				timestamp: new Date().toISOString(),
				timeElapsed: Math.round((Date.now() - (window as any).loadStartTime) / 1000) + 's',
				
				// Environment detection
				currentUrl: window.location.href,
				documentUrl: document.URL,
				protocol: window.location.protocol,
				host: window.location.host,
				
				// CordovaDetector results
				cordovaDetectorExists: typeof cordovaDetector !== 'undefined',
				cordovaDetectorIsNative: typeof cordovaDetector !== 'undefined' ? cordovaDetector.isNative() : 'N/A',
				isNativeEnvironment: this.isNativeEnvironment,
				
				// WebView detection details
				userAgent: navigator.userAgent,
				isAndroidWebView: navigator.userAgent.includes('Android') && navigator.userAgent.includes('wv'),
				hasAndroidInUA: navigator.userAgent.includes('Android'),
				hasWvInUA: navigator.userAgent.includes('wv'),
				hasWebViewInUA: navigator.userAgent.includes('webview'),
				hasVersionInUA: navigator.userAgent.includes('version/'),
				hasChromeInUA: navigator.userAgent.includes('chrome/'),
				
				// Environment checks
				windowNative: (window as any).native,
				bodyHasNativeClass: document.body.classList.contains('native'),
				hasServiceWorker: 'serviceWorker' in navigator,
				
				// Cordova runtime (may or may not be present)
				windowCordova: typeof (window as any).cordova !== 'undefined',
				windowDevice: typeof (window as any).device !== 'undefined',
				windowPlugins: typeof (window as any).plugins !== 'undefined',
				cordovaVersion: (window as any).cordova?.version || 'N/A',
				cordovaPlatformId: (window as any).cordova?.platformId || 'N/A',
				cordovaGetAppVersion: typeof (window as any).cordova?.getAppVersion !== 'undefined',
				
				// Version info
				nativeVersionCode: this.nativeVersionCode,
				nativeVersionNumber: this.nativeVersionNumber,
				
				// URL analysis
				isFileProtocol: window.location.protocol === 'file:',
				isHttpsProtocol: window.location.protocol === 'https:',
				isHttpProtocol: window.location.protocol === 'http:',
				
				// Detection method used
				detectionMethod: this.isNativeEnvironment ? 'WebView detected' : 'Web browser detected'
			};

			this.debugInfo = JSON.stringify(debugData, null, 2);
		};

		// Set load start time if not already set
		if (!(window as any).loadStartTime) {
			(window as any).loadStartTime = Date.now();
		}

		// Update immediately
		updateDebugInfo();
		
		// Show debug info automatically if CordovaDetector is missing or WebView detection might need verification
		if (typeof cordovaDetector === 'undefined') {
			this.showDebugInfo = true;
		}
		
		// Refresh debug info every 3 seconds for live monitoring
		const debugInterval = setInterval(() => {
			if (this.showDebugInfo) {
				updateDebugInfo();
			}
		}, 3000);
		
		// Stop refreshing after 30 seconds to save resources
		setTimeout(() => {
			clearInterval(debugInterval);
		}, 30000);
	}

	toggleDebugInfo(): void {
		this.showDebugInfo = !this.showDebugInfo;
		if (this.showDebugInfo) {
			this.initializeDebugInfo(); // Refresh the info
		}
	}

	/**
	 * Initialize Cordova detection using the global CordovaDetector
	 * This leverages the centralized detection system from index.ts
	 */
	private initializeCordovaDetection(): void {
		// Check if we're in a native environment using the global detector
		if (typeof cordovaDetector !== 'undefined') {
			this.isNativeEnvironment = cordovaDetector.isNative();
			
			// If we're in a native environment, try to initialize Cordova plugins
			if (this.isNativeEnvironment) {
				// Since detection is now immediate, we can try to initialize plugins right away
				// If Cordova.js is loaded, this will work; if not, it will gracefully fail
				this.initializeCordovaPlugins();
			}
		} else {
			// Fallback if CordovaDetector is not available
			console.warn('CordovaDetector not found, falling back to web mode');
			this.isNativeEnvironment = false;
		}
	}

	/**
	 * Initialize Cordova plugins if available
	 */
	private initializeCordovaPlugins(): void {
		const cordova = (window as any).cordova;
		
		if (!cordova) {
			console.log('Cordova object not found - native environment without Cordova runtime');
			return;
		}

		// Get app version information if plugin is available
		if (cordova.getAppVersion) {
			cordova.getAppVersion.getVersionNumber().then((version: string) => {
				this.nativeVersionNumber = version;
				console.log('App version number:', version);
			}).catch((err: any) => {
				console.warn('Could not get app version number:', err);
			});

			cordova.getAppVersion.getVersionCode().then((version: number) => {
				this.nativeVersionCode = version;
				console.log('App version code:', version);
			}).catch((err: any) => {
				console.warn('Could not get app version code:', err);
			});
		} else {
			console.log('getAppVersion plugin not available');
		}

		// Initialize other Cordova-specific features here
		// For example: push notifications, file system access, etc.
	}

	@VueWatched()
	languageWatch() {
		Translations.setBrowserLang(this.language);
		Translations.loadLangTranslation(this.language);
	}

	deleteWallet() {
		swal({
			title: i18n.t('settingsPage.deleteWalletModal.title'),
			html: i18n.t('settingsPage.deleteWalletModal.content'),
			showCancelButton: true,
			confirmButtonText: i18n.t('settingsPage.deleteWalletModal.confirmText'),
			cancelButtonText: i18n.t('settingsPage.deleteWalletModal.cancelText'),
		}).then((result:any) => {
			if (result.value) {
				AppState.disconnect();
				DependencyInjectorInstance().register(Wallet.name, undefined,'default');
				WalletRepository.deleteLocalCopy();
				window.location.href = '#index';
			}
		});
	}

	resetWallet() {
		swal({
			title: i18n.t('settingsPage.resetWalletModal.title'),
			html: i18n.t('settingsPage.resetWalletModal.content'),
			showCancelButton: true,
			confirmButtonText: i18n.t('settingsPage.resetWalletModal.confirmText'),
			cancelButtonText: i18n.t('settingsPage.resetWalletModal.cancelText'),
		}).then((result:any) => {
			if (result.value) {
        walletWatchdog.stop();
        wallet.clearTransactions();
        wallet.resetScanHeight();
        walletWatchdog.start();
				window.location.href = '#account';
			}
		});
	}

  checkOptimization = () => {
    blockchainExplorer.getHeight().then((blockchainHeight: number) => {
      let optimizeInfo = wallet.optimizationNeeded(blockchainHeight, config.optimizeThreshold);
      this.optimizeIsNeeded = optimizeInfo.isNeeded;
    }).catch((err: any) => {
      console.error("Error in checkOptimization, calling getHeight", err);
    });
  }

  optimizeWallet = () => {
    this.optimizeLoading = true; // set loading state to true
    blockchainExplorer.getHeight().then((blockchainHeight: number) => {
      let optimizeInfo = wallet.optimizationNeeded(blockchainHeight, config.optimizeThreshold);

      if (optimizeInfo.isNeeded) {
        wallet.createFusionTransaction(blockchainHeight, config.optimizeThreshold, blockchainExplorer,
          function (amounts: number[], numberOuts: number): Promise<RawDaemon_Out[]> {
            return blockchainExplorer.getRandomOuts(amounts, numberOuts);
          }).then((processedOuts: number) => {
            let watchdog: WalletWatchdog = DependencyInjectorInstance().getInstance(WalletWatchdog.name);
            //force a mempool check so the user is up to date
            if (watchdog !== null) {
              watchdog.checkMempool();
            }
            this.optimizeLoading = false; // set loading state to false
            setTimeout(() => {
              this.checkOptimization(); // check if optimization is still needed
            }, 1000);  
          }).catch((err) => {
            console.log(err);
            this.optimizeLoading = false; // set loading state to false
            setTimeout(() => {
              this.checkOptimization(); // check if optimization is still needed
            }, 1000);  
          });
      } else {
        swal({
          title: i18n.t('settingsPage.optimizeWalletModal.title'),
          html: i18n.t('settingsPage.optimizeWalletModal.content'),
          confirmButtonText: i18n.t('settingsPage.optimizeWalletModal.confirmText'),
          showCancelButton: false
        }).then((result:any) => {
          this.optimizeLoading = false;
        });    
      }
    }).catch((err: any) => {
      console.error("Error in optimizeWallet, calling getHeight", err);
    });
  }

	@VueWatched()	readSpeedWatch(){this.updateWalletOptions();}
	@VueWatched()	checkMinerTxWatch(){this.updateWalletOptions();}
	//@VueWatched()	customNodeWatch(){this.updateConnectionSettings();}
	//@VueWatched()	nodeUrlWatch(){this.updateConnectionSettings();}

	@VueWatched()	creationHeightWatch() {
		if(this.creationHeight < 0)this.creationHeight = 0;
		if(this.creationHeight > this.maxHeight && this.maxHeight !== -1)this.creationHeight = this.maxHeight;
	}
	@VueWatched()	scanHeightWatch() {
		if(this.scanHeight < 0)this.scanHeight = 0;
		if(this.scanHeight > this.maxHeight && this.maxHeight !== -1)this.scanHeight = this.maxHeight;
	}

	@VueWatched()
	useShortTickerWatch() {
		tickerStore.setTickerPreference(this.useShortTicker);
	}

	@VueWatched()
	notificationsEnabledWatch() {
		Storage.setItem('notificationsEnabled', this.notificationsEnabled);
	}

	private updateWalletOptions() {
		let options = wallet.options;
		options.readSpeed = this.readSpeed;
		options.checkMinerTx = this.checkMinerTx;
		wallet.options = options;
    walletWatchdog.setupWorkers();
		walletWatchdog.signalWalletUpdate();
	}

	updateWalletSettings() {
		wallet.creationHeight = this.creationHeight;
		wallet.lastHeight = this.scanHeight;
		walletWatchdog.signalWalletUpdate();
	}

	updateConnectionSettings() {
		let options = wallet.options;
		let oldCustomNode = options.customNode;
		let oldNodeUrl = options.nodeUrl;
		
		options.customNode = this.customNode;
		options.nodeUrl = this.nodeUrl;
		wallet.options = options;

    if (options.customNode) {
      Storage.setItem('customNodeUrl', options.nodeUrl);
    } else {
      Storage.remove('customNodeUrl');
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
      BlockchainExplorerProvider.getInstance().resetNodes();
    } else if (this.customNode && oldNodeUrl !== this.nodeUrl) {
      // Only reset if custom node URL changed (when using custom node)
      console.log('Custom node URL changed, resetting nodes...');
      BlockchainExplorerProvider.getInstance().resetNodes();
    } else {
      console.log('Node configuration unchanged, skipping node reset');
    }
	}

	destruct = (): Promise<void> => {
		// Cleanup ticker subscription
		if (this.unsubscribeTicker) {
			this.unsubscribeTicker();
		}
		return super.destruct();
	}
}


if(wallet !== null && blockchainExplorer !== null)
	new SettingsView('#app');
else
	window.location.href = '#index';
