// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

/**
 * @title MintAuthority
 * @notice Library for mint authority types and utilities
 */
library MintAuthority {
    /**
     * @notice Enum for mint authority types
     */
    enum Type {
        OWNER,      // Only the deployer can mint
        ANYONE,     // Anyone can mint
        SPECIFIC    // A specific address can mint
    }
    
    /**
     * @notice Resolves the mint authority address based on type
     * @param authorityType Type of mint authority
     * @param deployer Address of the deployer (for OWNER type)
     * @param specificAddress Specific address (for SPECIFIC type)
     * @return authority The resolved mint authority address
     */
    function resolveAuthority(
        Type authorityType,
        address deployer,
        address specificAddress
    ) internal pure returns (address authority) {
        if (authorityType == Type.OWNER) {
            return deployer;
        } else if (authorityType == Type.ANYONE) {
            return address(0); // address(0) means anyone can mint
        } else if (authorityType == Type.SPECIFIC) {
            require(specificAddress != address(0), "MintAuthority: specific address required");
            return specificAddress;
        } else {
            revert("MintAuthority: invalid type");
        }
    }
}

