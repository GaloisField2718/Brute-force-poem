/**
 * Address generation for all derivation paths
 */
import { DerivedAddress, AddressType, DerivationPath } from '../types';
/**
 * Derivation paths configuration
 */
export declare const DERIVATION_PATHS: DerivationPath[];
export declare class AddressGenerator {
    /**
     * Derive all addresses for a given mnemonic
     * Returns 12 addresses (4 types × 3 indices)
     */
    static deriveAllAddresses(mnemonic: string): DerivedAddress[];
    /**
     * Derive a single address based on type and index
     */
    private static deriveAddress;
    /**
     * Derive addresses for a specific type and index range
     */
    static deriveAddressesByType(mnemonic: string, type: AddressType, startIndex?: number, count?: number): DerivedAddress[];
    /**
     * Get total number of addresses that will be derived per seed
     */
    static getTotalAddressCount(): number;
}
//# sourceMappingURL=address-generator.d.ts.map