"use strict";
/**
 * HD Wallet derivation with BIP32/44/49/84/86 support
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.HDWallet = void 0;
const bip39 = __importStar(require("bip39"));
const bip32_1 = require("bip32");
const bitcoin = __importStar(require("bitcoinjs-lib"));
const ecc = __importStar(require("@bitcoinerlab/secp256k1"));
const tinysecp = __importStar(require("tiny-secp256k1"));
// Initialize ECC library for Taproot support
bitcoin.initEccLib(ecc);
// Create BIP32 factory
const bip32 = (0, bip32_1.BIP32Factory)(tinysecp);
class HDWallet {
    root;
    network;
    constructor(mnemonic, network = bitcoin.networks.bitcoin) {
        if (!bip39.validateMnemonic(mnemonic)) {
            throw new Error('Invalid mnemonic');
        }
        const seed = bip39.mnemonicToSeedSync(mnemonic);
        this.root = bip32.fromSeed(seed, network);
        this.network = network;
    }
    /**
     * Derive a child node at the given path
     */
    derivePath(path) {
        return this.root.derivePath(path);
    }
    /**
     * Generate Legacy P2PKH address (BIP44)
     * Path: m/44'/0'/0'/0/index
     */
    deriveLegacyAddress(index) {
        const path = `m/44'/0'/0'/0/${index}`;
        const child = this.derivePath(path);
        const { address } = bitcoin.payments.p2pkh({
            pubkey: child.publicKey,
            network: this.network
        });
        if (!address) {
            throw new Error('Failed to derive legacy address');
        }
        return address;
    }
    /**
     * Generate Nested SegWit P2SH-P2WPKH address (BIP49)
     * Path: m/49'/0'/0'/0/index
     */
    deriveNestedSegWitAddress(index) {
        const path = `m/49'/0'/0'/0/${index}`;
        const child = this.derivePath(path);
        const { address } = bitcoin.payments.p2sh({
            redeem: bitcoin.payments.p2wpkh({
                pubkey: child.publicKey,
                network: this.network
            }),
            network: this.network
        });
        if (!address) {
            throw new Error('Failed to derive nested SegWit address');
        }
        return address;
    }
    /**
     * Generate Native SegWit Bech32 address (BIP84)
     * Path: m/84'/0'/0'/0/index
     */
    deriveNativeSegWitAddress(index) {
        const path = `m/84'/0'/0'/0/${index}`;
        const child = this.derivePath(path);
        const { address } = bitcoin.payments.p2wpkh({
            pubkey: child.publicKey,
            network: this.network
        });
        if (!address) {
            throw new Error('Failed to derive native SegWit address');
        }
        return address;
    }
    /**
     * Generate Taproot Bech32m address (BIP86)
     * Path: m/86'/0'/0'/0/index
     */
    deriveTaprootAddress(index) {
        const path = `m/86'/0'/0'/0/${index}`;
        const child = this.derivePath(path);
        // For Taproot, we need to use the x-only public key (32 bytes)
        // Remove the first byte (prefix) from the 33-byte compressed public key
        const internalPubkey = child.publicKey.slice(1, 33);
        const { address } = bitcoin.payments.p2tr({
            internalPubkey: internalPubkey,
            network: this.network
        });
        if (!address) {
            throw new Error('Failed to derive Taproot address');
        }
        return address;
    }
    /**
     * Get the root extended public key
     */
    getXPub() {
        return this.root.toBase58();
    }
    /**
     * Get the mnemonic used to create this wallet
     * (Note: not stored, must be passed separately)
     */
    static seedToMnemonic(seed) {
        return bip39.entropyToMnemonic(seed);
    }
    /**
     * Validate a mnemonic phrase
     */
    static validateMnemonic(mnemonic) {
        return bip39.validateMnemonic(mnemonic);
    }
    /**
     * Get all BIP39 wordlist
     */
    static getWordlist() {
        return bip39.wordlists.english;
    }
}
exports.HDWallet = HDWallet;
