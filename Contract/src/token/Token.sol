// SPDX-License-Identifier: MIT
pragma solidity ^0.8.13;

import {IERC20} from "forge-std/interfaces/IERC20.sol";
import {IToken} from "./interfaces/IToken.sol";

/**
 * @title Token
 * @notice A customizable ERC20 token with minting capabilities and supply cap
 * @dev This contract implements a standard ERC20 token with additional features:
 *      - Configurable minting authority
 *      - Maximum supply cap
 *      - Initial supply minting
 */
contract Token is IToken {
    // Token metadata
    string private _name;
    string private _symbol;
    uint8 private _decimals;
    
    // Supply management
    uint256 private _totalSupply;
    uint256 public maxSupply;
    
    // Minting authority
    address public mintAuthority;
    
    // Balances and allowances
    mapping(address => uint256) private _balances;
    mapping(address => mapping(address => uint256)) private _allowances;
    
    /**
     * @notice Constructor to initialize the token
     * @param name_ Token name
     * @param symbol_ Token symbol
     * @param decimals_ Token decimals
     * @param initialSupply_ Initial supply to mint
     * @param maxSupply_ Maximum supply cap (0 = unlimited)
     * @param mintAuthority_ Address with minting authority
     * @param initialRecipient_ Address to receive initial supply
     */
    constructor(
        string memory name_,
        string memory symbol_,
        uint8 decimals_,
        uint256 initialSupply_,
        uint256 maxSupply_,
        address mintAuthority_,
        address initialRecipient_
    ) {
        require(bytes(name_).length > 0, "Token: name required");
        require(bytes(symbol_).length > 0, "Token: symbol required");
        // Note: mintAuthority_ can be address(0) to allow anyone to mint
        require(initialRecipient_ != address(0), "Token: invalid recipient");
        
        if (maxSupply_ > 0) {
            require(initialSupply_ <= maxSupply_, "Token: initial supply exceeds max");
        }
        
        _name = name_;
        _symbol = symbol_;
        _decimals = decimals_;
        maxSupply = maxSupply_;
        mintAuthority = mintAuthority_;
        
        if (initialSupply_ > 0) {
            _totalSupply = initialSupply_;
            _balances[initialRecipient_] = initialSupply_;
            emit Transfer(address(0), initialRecipient_, initialSupply_);
            emit Mint(initialRecipient_, initialSupply_);
        }
    }
    
    /**
     * @notice Returns the name of the token
     */
    function name() public view override returns (string memory) {
        return _name;
    }
    
    /**
     * @notice Returns the symbol of the token
     */
    function symbol() public view override returns (string memory) {
        return _symbol;
    }
    
    /**
     * @notice Returns the decimals of the token
     */
    function decimals() public view override returns (uint8) {
        return _decimals;
    }
    
    /**
     * @notice Returns the total supply of tokens
     */
    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }
    
    /**
     * @notice Returns the balance of an account
     * @param account Address to check balance for
     */
    function balanceOf(address account) public view override returns (uint256) {
        return _balances[account];
    }
    
    /**
     * @notice Transfers tokens to a recipient
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transfer(address to, uint256 amount) public override returns (bool) {
        address owner = msg.sender;
        _transfer(owner, to, amount);
        return true;
    }
    
    /**
     * @notice Returns the allowance of a spender
     * @param owner Token owner
     * @param spender Spender address
     */
    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }
    
    /**
     * @notice Approves a spender to spend tokens
     * @param spender Spender address
     * @param amount Amount to approve
     */
    function approve(address spender, uint256 amount) public override returns (bool) {
        address owner = msg.sender;
        _approve(owner, spender, amount);
        return true;
    }
    
    /**
     * @notice Transfers tokens using allowance
     * @param from Sender address
     * @param to Recipient address
     * @param amount Amount to transfer
     */
    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        address spender = msg.sender;
        _spendAllowance(from, spender, amount);
        _transfer(from, to, amount);
        return true;
    }
    
    /**
     * @notice Mints new tokens to a recipient
     * @param to Recipient address
     * @param amount Amount to mint
     */
    function mint(address to, uint256 amount) external {
        require(
            mintAuthority == address(0) || mintAuthority == msg.sender,
            "Token: not authorized to mint"
        );
        require(to != address(0), "Token: cannot mint to zero address");
        require(amount > 0, "Token: amount must be greater than zero");
        
        if (maxSupply > 0) {
            require(_totalSupply + amount <= maxSupply, "Token: exceeds max supply");
        }
        
        _totalSupply += amount;
        _balances[to] += amount;
        
        emit Transfer(address(0), to, amount);
        emit Mint(to, amount);
    }
    
    /**
     * @notice Updates the mint authority (only current authority can update)
     * @param newAuthority New mint authority address
     */
    function updateMintAuthority(address newAuthority) external {
        require(
            mintAuthority == address(0) || mintAuthority == msg.sender,
            "Token: not authorized"
        );
        require(newAuthority != address(0), "Token: invalid authority");
        
        mintAuthority = newAuthority;
        emit MintAuthorityUpdated(newAuthority);
    }
    
    /**
     * @notice Internal transfer function
     */
    function _transfer(address from, address to, uint256 amount) internal {
        require(from != address(0), "Token: transfer from zero address");
        require(to != address(0), "Token: transfer to zero address");
        
        uint256 fromBalance = _balances[from];
        require(fromBalance >= amount, "Token: insufficient balance");
        
        unchecked {
            _balances[from] = fromBalance - amount;
            _balances[to] += amount;
        }
        
        emit Transfer(from, to, amount);
    }
    
    /**
     * @notice Internal approve function
     */
    function _approve(address owner, address spender, uint256 amount) internal {
        require(owner != address(0), "Token: approve from zero address");
        require(spender != address(0), "Token: approve to zero address");
        
        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }
    
    /**
     * @notice Internal spend allowance function
     */
    function _spendAllowance(address owner, address spender, uint256 amount) internal {
        uint256 currentAllowance = allowance(owner, spender);
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "Token: insufficient allowance");
            unchecked {
                _approve(owner, spender, currentAllowance - amount);
            }
        }
    }
}

