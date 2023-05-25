/*
 * Copyright (c) 2018 Gnock
 * Copyright (c) 2018-2019 The Masari Project
 * Copyright (c) 2018-2020 The Karbo developers
 * Copyright (c) 2018-2023 Conceal Community, Conceal.Network & Conceal Devs
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
import {Translations} from "../model/Translations";
import {BlockchainExplorerProvider} from "../providers/BlockchainExplorerProvider";
import {BlockchainExplorer, RawDaemon_Out} from "../model/blockchain/BlockchainExplorer";
import {WalletWatchdog} from "../model/WalletWatchdog";

let wallet : Wallet = DependencyInjectorInstance().getInstance(Wallet.name, 'default', false);
let blockchainExplorer: BlockchainExplorer = BlockchainExplorerProvider.getInstance();
let walletWatchdog : WalletWatchdog = DependencyInjectorInstance().getInstance(WalletWatchdog.name,'default', false);

class SettingsView extends DestructableView{
	@VueVar(10) readSpeed !: number;
	@VueVar(false) checkMinerTx !: boolean;

	@VueVar(false) customNode !: boolean;
	@VueVar('https://node.conceal.network:16000/') nodeUrl !: string;

	@VueVar(0) creationHeight !: number;
	@VueVar(0) scanHeight !: number;

	@VueVar(-1) maxHeight !: number;
	@VueVar('en') language !: string;

	@VueVar(0) nativeVersionCode !: number;
	@VueVar('') nativeVersionNumber !: string;

  @VueVar(false) optimizeIsNeeded !: boolean;
  @VueVar(false) optimizeLoading !: boolean;

	constructor(container : string) {
		super(container);
		let self = this;
		this.readSpeed = wallet.options.readSpeed;
		this.checkMinerTx = wallet.options.checkMinerTx;

		this.customNode = wallet.options.customNode;
		this.nodeUrl = wallet.options.nodeUrl;

		this.creationHeight = wallet.creationHeight;
		this.scanHeight = wallet.lastHeight;

		this.checkOptimization();

		blockchainExplorer.getHeight().then(function (height: number) {
			self.maxHeight = height;
		});

		Translations.getLang().then((userLang : string) => {
			this.language = userLang;
		});

		if(typeof (<any>window).cordova !== 'undefined' && typeof (<any>window).cordova.getAppVersion !== 'undefined') {
			(<any>window).cordova.getAppVersion.getVersionNumber().then((version : string) => {
				this.nativeVersionNumber = version;
			});
			(<any>window).cordova.getAppVersion.getVersionCode().then((version : number) => {
				this.nativeVersionCode = version;
			});
		}
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

	checkOptimization = () => {
    let self = this;
    blockchainExplorer.getHeight().then(function (blockchainHeight: number) {
      let isNeeded: boolean = wallet.optimizationNeeded(blockchainHeight, config.optimizeThreshold);
      logDebugMsg('isNeeded:', isNeeded);
      logDebugMsg("unspentouts", "end");
      if(isNeeded) {
        self.optimizeIsNeeded = true;
      }
    });
  }

  optimizeWallet = () => {
    let self = this;
    self.optimizeLoading = true; // set loading state to true
    blockchainExplorer.getHeight().then(function (blockchainHeight: number) {
      wallet.optimize(blockchainHeight, config.optimizeThreshold, blockchainExplorer,
        function (amounts: number[], numberOuts: number): Promise<RawDaemon_Out[]> {
          return blockchainExplorer.getRandomOuts(amounts, numberOuts);
        }).then(function (processedOuts: number) {
          let watchdog: WalletWatchdog = DependencyInjectorInstance().getInstance(WalletWatchdog.name);
          logDebugMsg("processedOuts", processedOuts);
          //force a mempool check so the user is up to date
          if (watchdog !== null) {
            watchdog.checkMempool();
          }
          self.optimizeLoading = false; // set loading state to false
          self.checkOptimization(); // check if optimization is still needed
        }).catch(function(err) {
          console.log(err);
          self.optimizeLoading = false; // set loading state to false
          self.checkOptimization(); // check if optimization is still needed
        });
    });
  }

	@VueWatched()	readSpeedWatch(){this.updateWalletOptions();}
	@VueWatched()	checkMinerTxWatch(){this.updateWalletOptions();}
	@VueWatched()	customNodeWatch(){this.updateWalletOptions();}

	@VueWatched()	creationHeightWatch() {
		if(this.creationHeight < 0)this.creationHeight = 0;
		if(this.creationHeight > this.maxHeight && this.maxHeight !== -1)this.creationHeight = this.maxHeight;
	}
	@VueWatched()	scanHeightWatch() {
		if(this.scanHeight < 0)this.scanHeight = 0;
		if(this.scanHeight > this.maxHeight && this.maxHeight !== -1)this.scanHeight = this.maxHeight;
	}

	private updateWalletOptions() {
		let options = wallet.options;
		options.readSpeed = this.readSpeed;
		options.checkMinerTx = this.checkMinerTx;
		options.customNode = this.customNode;
		options.nodeUrl = this.nodeUrl;
		wallet.options = options;
		walletWatchdog.signalWalletUpdate();
	}

	updateWalletSettings() {
		wallet.creationHeight = this.creationHeight;
		wallet.lastHeight = this.scanHeight;
		walletWatchdog.signalWalletUpdate();
	}

	updateConnectionSettings() {
		let options = wallet.options;
		options.customNode = this.customNode;
		options.nodeUrl = this.nodeUrl;
		config.nodeUrl = this.nodeUrl;
		wallet.options = options;
		walletWatchdog.signalWalletUpdate();
	}
}


if(wallet !== null && blockchainExplorer !== null)
	new SettingsView('#app');
else
	window.location.href = '#index';
