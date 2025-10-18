"use strict";
/**
 * Address generation for all derivation paths
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AddressGenerator = exports.DERIVATION_PATHS = void 0;
const hd_wallet_1 = require("./hd-wallet");
const logger_1 = require("../utils/logger");
/**
 * Derivation paths configuration
 */
exports.DERIVATION_PATHS = [
    {
        standard: 'BIP44',
        type: 'legacy',
        indices: [0, 1, 2],
        path: "m/44'/0'/0'/0/{index}"
    },
    {
        standard: 'BIP49',
        type: 'nested-segwit',
        indices: [0, 1, 2],
        path: "m/49'/0'/0'/0/{index}"
    },
    {
        standard: 'BIP84',
        type: 'native-segwit',
        indices: [0, 1, 2],
        path: "m/84'/0'/0'/0/{index}"
    },
    {
        standard: 'BIP86',
        type: 'taproot',
        indices: [0, 1, 2],
        path: "m/86'/0'/0'/0/{index}"
    }
];
class AddressGenerator {
    /**
     * Derive all addresses for a given mnemonic
     * Returns 12 addresses (4 types × 3 indices)
     */
    static deriveAllAddresses(mnemonic) {
        if (!mnemonic || typeof mnemonic !== 'string') {
            throw new Error('Invalid mnemonic: must be a non-empty string');
        }
        const words = mnemonic.trim().split(/\s+/);
        if (words.length !== 12) {
            throw new Error(`Invalid mnemonic: expected 12 words, got ${words.length}`);
        }
        try {
            const wallet = new hd_wallet_1.HDWallet(mnemonic);
            const addresses = [];
            for (const pathConfig of exports.DERIVATION_PATHS) {
                for (const index of pathConfig.indices) {
                    try {
                        const address = this.deriveAddress(wallet, pathConfig.type, index);
                        const path = pathConfig.path.replace('{index}', index.toString());
                        if (!address || typeof address !== 'string') {
                            throw new Error(`Failed to derive address for ${pathConfig.type} at index ${index}`);
                        }
                        addresses.push({
                            address,
                            path,
                            type: pathConfig.type,
                            index
                        });
                    }
                    catch (derivationError) {
                        logger_1.logger.error('Failed to derive single address', {
                            type: pathConfig.type,
                            index,
                            error: String(derivationError)
                        });
                        throw derivationError;
                    }
                }
            }
            if (addresses.length !== 12) {
                throw new Error(`Expected 12 addresses, but derived ${addresses.length}`);
            }
            return addresses;
        }
        catch (error) {
            logger_1.logger.error('Failed to derive addresses', { error: String(error), mnemonic: '***' });
            throw error;
        }
    }
    /**
     * Derive a single address based on type and index
     */
    static deriveAddress(wallet, type, index) {
        switch (type) {
            case 'legacy':
                return wallet.deriveLegacyAddress(index);
            case 'nested-segwit':
                return wallet.deriveNestedSegWitAddress(index);
            case 'native-segwit':
                return wallet.deriveNativeSegWitAddress(index);
            case 'taproot':
                return wallet.deriveTaprootAddress(index);
            default:
                throw new Error(`Unknown address type: ${type}`);
        }
    }
    /**
     * Derive addresses for a specific type and index range
     */
    static deriveAddressesByType(mnemonic, type, startIndex = 0, count = 3) {
        try {
            const wallet = new hd_wallet_1.HDWallet(mnemonic);
            const addresses = [];
            const pathConfig = exports.DERIVATION_PATHS.find(p => p.type === type);
            if (!pathConfig) {
                throw new Error(`Unknown address type: ${type}`);
            }
            for (let i = startIndex; i < startIndex + count; i++) {
                const address = this.deriveAddress(wallet, type, i);
                const path = pathConfig.path.replace('{index}', i.toString());
                addresses.push({
                    address,
                    path,
                    type,
                    index: i
                });
            }
            return addresses;
        }
        catch (error) {
            logger_1.logger.error('Failed to derive addresses by type', {
                error: String(error),
                type,
                startIndex,
                count
            });
            throw error;
        }
    }
    /**
     * Get total number of addresses that will be derived per seed
     */
    static getTotalAddressCount() {
        return exports.DERIVATION_PATHS.reduce((sum, path) => sum + path.indices.length, 0);
    }
}
exports.AddressGenerator = AddressGenerator;
//# sourceMappingURL=address-generator.js.map