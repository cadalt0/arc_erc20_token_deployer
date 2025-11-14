// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {Token} from "./Token.sol";
import {MintAuthority} from "./types/MintAuthority.sol";

/**
 * @title TokenDeployer
 * @notice Factory contract for deploying customizable ERC20 tokens
 * @dev This contract allows users to deploy tokens with various configurations
 */
contract TokenDeployer {
    
    // Struct to hold deployment parameters
    struct TokenParams {
        string name;
        string symbol;
        uint8 decimals;
        uint256 initialSupply;
        uint256 maxSupply;
        MintAuthority.Type mintAuthorityType;
        address specificMintAuthority; // Only used if mintAuthorityType is SPECIFIC
    }
    
    // Events
    event TokenDeployed(
        address indexed token,
        address indexed deployer,
        string name,
        string symbol
    );
    
    // Track deployed tokens
    mapping(address => address[]) public deployedTokens; // deployer => tokens[]
    address[] public allTokens;
    
    /**
     * @notice Deploys a new token with the specified parameters
     * @param params Token deployment parameters
     * @return tokenAddress Address of the deployed token
     */
    function deployToken(TokenParams memory params) public returns (address tokenAddress) {
        require(bytes(params.name).length > 0, "TokenDeployer: name required");
        require(bytes(params.symbol).length > 0, "TokenDeployer: symbol required");
        require(params.decimals <= 18, "TokenDeployer: decimals too high");
        
        // Determine mint authority address using library
        address mintAuthority = MintAuthority.resolveAuthority(
            params.mintAuthorityType,
            msg.sender,
            params.specificMintAuthority
        );
        
        // Deploy the token
        Token token = new Token(
            params.name,
            params.symbol,
            params.decimals,
            params.initialSupply,
            params.maxSupply,
            mintAuthority,
            msg.sender // Initial recipient is the deployer
        );
        
        tokenAddress = address(token);
        
        // Track the deployment
        deployedTokens[msg.sender].push(tokenAddress);
        allTokens.push(tokenAddress);
        
        emit TokenDeployed(tokenAddress, msg.sender, params.name, params.symbol);
        
        return tokenAddress;
    }
    
    /**
     * @notice Deploys a token with individual parameters (convenience function)
     * @param name Token name
     * @param symbol Token symbol
     * @param decimals Token decimals
     * @param initialSupply Initial supply
     * @param maxSupply Max supply (0 = unlimited)
     * @param mintAuthorityType Mint authority type (0=OWNER, 1=ANYONE, 2=SPECIFIC)
     * @param specificMintAuthority Specific mint authority (only used if type is SPECIFIC)
     * @return tokenAddress Address of the deployed token
     */
    function deployTokenSimple(
        string memory name,
        string memory symbol,
        uint8 decimals,
        uint256 initialSupply,
        uint256 maxSupply,
        uint8 mintAuthorityType,
        address specificMintAuthority
    ) external returns (address tokenAddress) {
        TokenParams memory params = TokenParams({
            name: name,
            symbol: symbol,
            decimals: decimals,
            initialSupply: initialSupply,
            maxSupply: maxSupply,
            mintAuthorityType: MintAuthority.Type(mintAuthorityType),
            specificMintAuthority: specificMintAuthority
        });
        
        return deployToken(params);
    }
    
    /**
     * @notice Returns all tokens deployed by a specific address
     * @param deployer Address of the deployer
     * @return tokens Array of token addresses
     */
    function getDeployedTokens(address deployer) external view returns (address[] memory) {
        return deployedTokens[deployer];
    }
    
    /**
     * @notice Returns the total number of tokens deployed
     * @return count Total count
     */
    function getTotalTokensDeployed() external view returns (uint256) {
        return allTokens.length;
    }
    
    /**
     * @notice Returns all deployed tokens
     * @return tokens Array of all token addresses
     */
    function getAllTokens() external view returns (address[] memory) {
        return allTokens;
    }
}

