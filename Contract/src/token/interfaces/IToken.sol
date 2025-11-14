// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {IERC20} from "forge-std/interfaces/IERC20.sol";

/**
 * @title IToken
 * @notice Interface for the Token contract with minting capabilities
 */
interface IToken is IERC20 {
    /**
     * @notice Mints new tokens to a recipient
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external;
    
    /**
     * @notice Returns the maximum supply cap
     * @return maxSupply Maximum supply (0 = unlimited)
     */
    function maxSupply() external view returns (uint256);
    
    /**
     * @notice Returns the mint authority address
     * @return mintAuthority Address with minting authority (address(0) = anyone)
     */
    function mintAuthority() external view returns (address);
    
    /**
     * @notice Updates the mint authority
     * @param newAuthority New mint authority address
     */
    function updateMintAuthority(address newAuthority) external;
    
    /**
     * @notice Emitted when tokens are minted
     */
    event Mint(address indexed to, uint256 amount);
    
    /**
     * @notice Emitted when mint authority is updated
     */
    event MintAuthorityUpdated(address indexed newAuthority);
    
    /**
     * @notice Emitted when max supply is updated
     */
    event MaxSupplyUpdated(uint256 newMaxSupply);
}

