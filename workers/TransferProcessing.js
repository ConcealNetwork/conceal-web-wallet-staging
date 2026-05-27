define(["require", "exports", "../model/TransactionsExplorer", "../model/Wallet", "../model/Mnemonic"], function (require, exports, TransactionsExplorer_1, Wallet_1, Mnemonic_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    //bridge for cnUtil with the new mnemonic class
    self.mn_random = Mnemonic_1.Mnemonic.mn_random;
    self.mn_decode = Mnemonic_1.Mnemonic.mn_decode;
    self.mn_encode = Mnemonic_1.Mnemonic.mn_encode;
    onmessage = function (data) {
        var _a, _b;
        // if(data.isTrusted){
        var event = data.data;
        try {
            if (event.type === 'initWallet') {
                postMessage({ type: 'readyWallet' });
            }
            else if (event.type === 'screen') {
                var readMinersTx = typeof event.readMinersTx !== 'undefined' && event.readMinersTx;
                var rawTransactions = event.transactions;
                var maxBlockNumber = event.maxBlock;
                var startBlockNumber = typeof event.startBlock !== 'undefined' ? event.startBlock : 0;
                var shardIndex = typeof event.shardIndex !== 'undefined' ? event.shardIndex : 0;
                var currentWallet = Wallet_1.Wallet.loadFromRaw(event.wallet);
                var hashes = [];
                if (!currentWallet) {
                    postMessage('missing_wallet');
                    return;
                }
                for (var _i = 0, rawTransactions_1 = rawTransactions; _i < rawTransactions_1.length; _i++) {
                    var rawTransaction = rawTransactions_1[_i];
                    if (!(rawTransaction === null || rawTransaction === void 0 ? void 0 : rawTransaction.height)) {
                        continue;
                    }
                    if (!readMinersTx && TransactionsExplorer_1.TransactionsExplorer.isMinerTx(rawTransaction)) {
                        continue;
                    }
                    try {
                        if (TransactionsExplorer_1.TransactionsExplorer.ownsTx(rawTransaction, currentWallet)) {
                            if (rawTransaction.hash) {
                                hashes.push(rawTransaction.hash);
                            }
                        }
                    }
                    catch (err) {
                        console.error('Failed to screen ownsTx for tx:', (_a = rawTransaction.hash) !== null && _a !== void 0 ? _a : rawTransaction, err);
                    }
                }
                postMessage({
                    type: 'screened',
                    startBlock: startBlockNumber,
                    maxHeight: maxBlockNumber,
                    shardIndex: shardIndex,
                    hashes: hashes,
                });
            }
            else if (event.type === 'process') {
                logDebugMsg("process new transactions...");
                var readMinersTx = typeof event.readMinersTx !== 'undefined' && event.readMinersTx;
                var rawTransactions = event.transactions;
                var maxBlockNumber = event.maxBlock;
                var startBlockNumber = typeof event.startBlock !== "undefined" ? event.startBlock : 0;
                var currentWallet = null;
                var transactions = [];
                // get the current wallet from even parameters
                currentWallet = Wallet_1.Wallet.loadFromRaw(event.wallet);
                // log any raw transactions that need to be processed
                logDebugMsg("rawTransactions", rawTransactions);
                if (!currentWallet) {
                    logDebugMsg("Wallet is missing...");
                    postMessage('missing_wallet');
                    return;
                }
                var addedHashes = new Set();
                // Two passes: merge each owned tx into the worker wallet so later spends
                // (same batch) see key images; second pass catches receive-before-spend ordering.
                for (var pass = 0; pass < 2; pass++) {
                    for (var _c = 0, rawTransactions_2 = rawTransactions; _c < rawTransactions_2.length; _c++) {
                        var rawTransaction = rawTransactions_2[_c];
                        if (!(rawTransaction === null || rawTransaction === void 0 ? void 0 : rawTransaction.height)) {
                            continue;
                        }
                        if (rawTransaction.hash && addedHashes.has(rawTransaction.hash)) {
                            continue;
                        }
                        if (!readMinersTx && TransactionsExplorer_1.TransactionsExplorer.isMinerTx(rawTransaction)) {
                            continue;
                        }
                        try {
                            if (TransactionsExplorer_1.TransactionsExplorer.ownsTx(rawTransaction, currentWallet)) {
                                var txData = TransactionsExplorer_1.TransactionsExplorer.parse(rawTransaction, currentWallet);
                                if (txData && txData.transaction) {
                                    currentWallet.addNew(txData.transaction);
                                    currentWallet.addDeposits(txData.deposits);
                                    currentWallet.addWithdrawals(txData.withdrawals);
                                    transactions.push(txData.export());
                                }
                                if (rawTransaction.hash) {
                                    addedHashes.add(rawTransaction.hash);
                                }
                            }
                        }
                        catch (err) {
                            console.error("Failed to process ownsTx for tx:", (_b = rawTransaction.hash) !== null && _b !== void 0 ? _b : rawTransaction, err);
                        }
                    }
                }
                postMessage({
                    type: "processed",
                    startBlock: startBlockNumber,
                    maxHeight: maxBlockNumber,
                    transactions: transactions,
                });
            }
        }
        catch (err) {
            reportError(err);
        }
    };
    postMessage('ready');
});
