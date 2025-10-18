/**
 * HD Wallet derivation with BIP32/44/49/84/86 support
 */
import * as bitcoin from 'bitcoinjs-lib';
export declare class HDWallet {
    private root;
    private network;
    constructor(mnemonic: string, network?: bitcoin.Network);
    /**
     * Derive a child node at the given path
     */
    private derivePath;
    /**
     * Generate Legacy P2PKH address (BIP44)
     * Path: m/44'/0'/0'/0/index
     */
    deriveLegacyAddress(index: number): string;
    /**
     * Generate Nested SegWit P2SH-P2WPKH address (BIP49)
     * Path: m/49'/0'/0'/0/index
     */
    deriveNestedSegWitAddress(index: number): string;
    /**
     * Generate Native SegWit Bech32 address (BIP84)
     * Path: m/84'/0'/0'/0/index
     */
    deriveNativeSegWitAddress(index: number): string;
    /**
     * Generate Taproot Bech32m address (BIP86)
     * Path: m/86'/0'/0'/0/index
     */
    deriveTaprootAddress(index: number): string;
    /**
     * Get the root extended public key
     */
    getXPub(): string;
    /**
     * Get the mnemonic used to create this wallet
     * (Note: not stored, must be passed separately)
     */
    static seedToMnemonic(seed: Buffer): string;
    /**
     * Validate a mnemonic phrase
     */
    static validateMnemonic(mnemonic: string): boolean;
    /**
     * Get all BIP39 wordlist
     */
    static getWordlist(): string[];
}
//# sourceMappingURL=hd-wallet.d.ts.map