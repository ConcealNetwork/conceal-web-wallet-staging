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

import {RawFullyEncryptedWallet, RawWallet, Wallet} from "./Wallet";
import {StorageOld} from "./StorageOld";
import {Storage} from "./Storage";
import {CoinUri} from "./CoinUri";

export class WalletRepository {

  static migrateWallet(): Promise<Boolean> { 
		return new Promise<boolean>((resolve, reject) => {
      StorageOld.getItem('wallet', null).then(walletAsString => {
        if (walletAsString !== null) {
          Storage.setItem('wallet', walletAsString).then(() => {
            StorageOld.remove('wallet');
            resolve(true);
          }).catch(err =>  {
            reject(err);
          });
        } else {
          resolve(false);
        }
      }).catch(err => {
        reject(err);
      });
    });
  }

	static hasOneStored() : Promise<boolean> {
		return new Promise<boolean>((resolve, reject) => {
      this.migrateWallet().then(isSuccess => {
        Storage.getItem('wallet', null).then(function (wallet : any) {
          resolve(wallet !== null);
        });
      }).catch(err => {
        resolve(false);
      })
    });
  }
	
	static decodeWithPassword(rawWallet : RawWallet|RawFullyEncryptedWallet, password : string) : Wallet|null {
		if(password.length > 32)
			password = password.substr(0 , 32);
		if(password.length < 32){
			password = ('00000000000000000000000000000000'+password).slice(-32);
		}
		let privKey = new (<any>TextEncoder)("utf8").encode(password);
		
		// fix cyrillic (non-latin) passwords
		if(privKey.length > 32){
		   privKey = privKey.slice(-32);
		}
		
		//console.log('open wallet with nonce', rawWallet.nonce);
		let nonce = new (<any>TextEncoder)("utf8").encode(rawWallet.nonce);

		let decodedRawWallet = null;

		//detect if old type or new type of wallet
		if(typeof (<any>rawWallet).data !== 'undefined'){//RawFullyEncryptedWallet
			//console.log('new wallet format');
			let rawFullyEncrypted : RawFullyEncryptedWallet = <any>rawWallet;
			let encrypted = new Uint8Array(<any>rawFullyEncrypted.data);
			let decrypted = nacl.secretbox.open(encrypted, nonce, privKey);
			if(decrypted === null)
				return null;

			try {
				decodedRawWallet = JSON.parse(new TextDecoder("utf8").decode(decrypted));
			} catch (e) {
				decodedRawWallet = null;
			}
		}else{//RawWallet
			//console.log('old wallet format');
			let oldRawWallet : RawWallet = <any>rawWallet;
			let encrypted = new Uint8Array(<any>oldRawWallet.encryptedKeys);
			let decrypted = nacl.secretbox.open(encrypted, nonce, privKey);
			if(decrypted === null)
				return null;

			oldRawWallet.encryptedKeys = new TextDecoder("utf8").decode(decrypted);
			decodedRawWallet = oldRawWallet;
		}

		if(decodedRawWallet !== null){
			let wallet = Wallet.loadFromRaw(decodedRawWallet);
			if(wallet.coinAddressPrefix !== config.addressPrefix)
				return null;
			return wallet;
		}
		return null;
	}

	static getLocalWalletWithPassword(password : string) : Promise<Wallet|null>{
		return Storage.getItem('wallet', null).then((existingWallet : any) => {
			if (existingWallet !== null) {
				return this.decodeWithPassword(JSON.parse(existingWallet), password);
			} else {
				return null;
			}
		});
	}
	
	static save(wallet : Wallet, password : string) : Promise<void>{
		return Storage.setItem('wallet', JSON.stringify(this.getEncrypted(wallet, password)));
	}

	static getEncrypted(wallet : Wallet, password : string) : RawFullyEncryptedWallet{
		if(password.length > 32)
			password = password.substr(0 , 32);
		if(password.length < 32){
			password = ('00000000000000000000000000000000'+password).slice(-32);
		}

		let privKey = new (<any>TextEncoder)("utf8").encode(password);
		
		// Fix cyrillic (non-latin) passwords
		if(privKey.length > 32){
		   privKey = privKey.slice(-32);
		}
		
		let rawNonce = nacl.util.encodeBase64(nacl.randomBytes(16));
		let nonce = new (<any>TextEncoder)("utf8").encode(rawNonce);

		let rawWallet = wallet.exportToRaw();
		let uint8EncryptedContent = new (<any>TextEncoder)("utf8").encode(JSON.stringify(rawWallet));

		let encrypted : Uint8Array = nacl.secretbox(uint8EncryptedContent, nonce, privKey);
		let tabEncrypted = [];
		for(let i = 0; i < encrypted.length; ++i){
			tabEncrypted.push(encrypted[i]);
		}

		let fullEncryptedWallet : RawFullyEncryptedWallet = {
			data:tabEncrypted,
			nonce:rawNonce
		};

		return fullEncryptedWallet;
	}

	static deleteLocalCopy() : Promise<void>{
		return Storage.remove('wallet');
	}


	static downloadEncryptedPdf(wallet : Wallet){
		if(wallet.keys.priv.spend === '')
			throw 'missing_spend';

		let coinWalletUri = CoinUri.encodeWalletKeys(
			wallet.getPublicAddress(),
			wallet.keys.priv.spend,
			wallet.keys.priv.view,
			wallet.creationHeight
		);
		let coinWalletUriM = CoinUri.encodeWalletKeys(
			wallet.getPublicAddress(),
			wallet.keys.priv.spend,
			wallet.keys.priv.view
		);

		let publicQrCode = kjua({
			render: 'canvas',
			text: wallet.getPublicAddress(),
			size:300,
		});

		let privateSpendQrCode = kjua({
			render: 'canvas',
			text: coinWalletUri,
			size:300,
		});

		let importQrCode = kjua({
			render: 'canvas',
			text: coinWalletUriM,
			ecLevel: 'M',
			size:333,
		});

		let doc = new jsPDF('landscape');

		//creating background
		doc.setFillColor(48,70,108);
		doc.rect(0,0,297,210, 'F');

		//white blocks
		doc.setFillColor(255,255,255);
		doc.rect(108,8,80,90, 'F');
		doc.rect(10,113,80,90, 'F');
		doc.rect(210,8,80,90, 'F');

		//blue blocks
		doc.setFillColor(0, 160, 227);
		doc.rect(108,113,80,90, 'F');

		//blue background for texts
		doc.setFillColor(0, 160, 227);

		doc.rect(108,8,80,20, 'F');	//Private key
		doc.rect(10,113,80,20, 'F');	//Public address
		doc.rect(210,8,80,20, 'F');	//QR code for Import

		doc.setTextColor(255, 255, 255);
		doc.setFontSize(30);
		doc.text(15, 128, "Public address");
		doc.text(123,19, "Private key");
		doc.text(225,19, "Private key");
		doc.setFontSize(10);
		doc.setFontStyle('italic');
		doc.text(125, 26, "(to import from QR feature)");
		doc.text(228, 26, "(to import from QR feature)");
		doc.setTextColor(0, 0, 0);
		doc.text(118, 96, "(height included, regular scan quality)");
		doc.text(220, 96, "(height not included, high scan quality)");
		doc.text(28, 201, "(QR code to scan to receive)");

		// Draw safe-like frame (outer square)
		doc.setDrawColor(0, 0, 0);
		doc.setLineWidth(1);
		// Outer square (safe frame)
		const outerSize = 80; // Size of outer square
		const outerX = 208;    // X position of outer square
		const outerY = 116;    // Y position of outer square
		const radius = 5;     // Corner radius

		// Fill and draw outer square with rounded corners
		doc.setFillColor(240, 240, 240); // Light gray fill for outer square
		doc.roundedRect(outerX, outerY, outerSize, outerSize, radius, radius, 'FD'); // 'FD' means Fill and Draw

		// Inner square (safe door)
		const innerSize = 68;  // Size of inner square
		const innerX = outerX + (outerSize - innerSize) / 2;  // Center inner square
		const innerY = outerY + (outerSize - innerSize) / 2;  // Center inner square
		const innerRadius = 3; // Slightly smaller radius for inner square

		// Fill and draw inner square with rounded corners
		doc.setFillColor(220, 220, 220); // Slightly darker gray for inner square
		doc.roundedRect(innerX, innerY, innerSize, innerSize, innerRadius, innerRadius, 'FD'); // 'FD' means Fill and Draw

		// Add a combination lock dial to the safe door
		const handleX = innerX + innerSize - 9;
		const handleY = innerY + innerSize/2;
		const handleRadius = 3;
		
		// Draw the outer handle circle (dial)
		doc.setFillColor(180, 180, 180); // Darker gray for handle
		doc.circle(handleX, handleY, handleRadius, 'F'); // Fill the handle
		doc.setDrawColor(0, 0, 0); // Black outline
		doc.circle(handleX, handleY, handleRadius, 'S'); // Draw handle outline

		// Draw the inner circle of the dial
		const innerHandleRadius = 1.5;
		doc.setFillColor(220, 220, 220); // Lighter gray for inner circle
		doc.circle(handleX, handleY, innerHandleRadius, 'F');
		doc.circle(handleX, handleY, innerHandleRadius, 'S');

		// Add dial markings (small lines around the dial)
		const markingLength = 0.5;
		const markingDistance = handleRadius + 0.2;
		for (let i = 0; i < 12; i++) { // 12 markings like a clock
			const angle = (i * 30) * (Math.PI / 180); // Convert degrees to radians
			const startX = handleX + Math.cos(angle) * markingDistance;
			const startY = handleY + Math.sin(angle) * markingDistance;
			const endX = handleX + Math.cos(angle) * (markingDistance + markingLength);
			const endY = handleY + Math.sin(angle) * (markingDistance + markingLength);
			doc.line(startX, startY, endX, endY);
		}

		//white lines
		doc.setDrawColor(255,255,255);
		doc.setLineWidth(1);
		doc.line(99,0,99,210);  //left line
		doc.line(198,0,198,210);  //right line
		doc.line(0,105,297,105);  //middle line

		//adding qr codes
		doc.addImage(publicQrCode.toDataURL(), 'JPEG', 28, 143, 45, 45);
		doc.addImage(privateSpendQrCode.toDataURL(), 'JPEG', 126, 38, 45, 45);
		doc.addImage(importQrCode.toDataURL(), 'JPEG', 224, 36, 50, 50);


		//wallet help
		doc.setTextColor(255, 255, 255);
		doc.setFontSize(10);
		doc.text(110, 120, "To deposit funds to this paper wallet, send CCX");
		doc.text(110, 125, "over the Conceal Network to the public address.");

		doc.text(115, 132, "DO NOT REVEAL THE PRIVATE KEY");

		//adding Conceal Network logos
		let c : HTMLCanvasElement|null = <HTMLCanvasElement>document.getElementById('canvasExport');
		if(c !== null) {
			let ctx = c.getContext("2d");
			
			// First logo (vertical)
			let verticalLogo: ImageBitmap | null = <ImageBitmap | null>document.getElementById("verticalLogo");
			if (ctx !== null && verticalLogo !== null) {
				c.width = verticalLogo.width;
				c.height = verticalLogo.height;
				ctx.drawImage(verticalLogo, 0, 0);

				let ratio = verticalLogo.width/45;
				let smallHeight = verticalLogo.height/ratio;
				doc.addImage(c.toDataURL(), 'JPEG', 224, 106+(100-smallHeight)/2, 45, smallHeight);
			}

			// Second logo (cham)
			let chamLogo: ImageBitmap | null = <ImageBitmap | null>document.getElementById("chamLogo");
			if (ctx !== null && chamLogo !== null) {
				c.width = chamLogo.width;
				c.height = chamLogo.height;
				ctx.clearRect(0, 0, c.width, c.height); // Clear previous logo
				ctx.drawImage(chamLogo, 0, 0);

				let ratio = chamLogo.width/60;
				let smallHeight = chamLogo.height/ratio;
				doc.addImage(c.toDataURL(), 'JPEG', 120, 106+(120-smallHeight)/2, 60, smallHeight);
			}
		}

		try {
			doc.save('keys.pdf');
		} catch(e) {
			alert('Error ' + e);
		}

	}

}