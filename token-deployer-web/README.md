# Token Deployer

A zero-code platform for deploying and managing ERC20 tokens on Arc Testnet. Deploy custom tokens with full control over parameters, no smart contract knowledge required.

## 🌐 Website

Visit the live application to start deploying tokens instantly.

## 👤 User Guide

### Getting Started

1. **Connect Your Wallet**
   - Click "Connect Wallet" on the homepage or in the navigation
   - Approve the connection in your MetaMask or compatible wallet
   - Make sure you're connected to Arc Testnet

2. **Get Testnet USDC**
   - If your wallet shows 0 USDC balance, you'll see a faucet link
   - Click "Get USDC from Faucet" to open [Circle Faucet](https://faucet.circle.com/)
   - Select "Arc Testnet" and request 10 USDC (free, once per hour)

3. **Switch to Arc Testnet**
   - If you're on a different network, the wallet status box will show a warning
   - Click "Switch to Arc Testnet" to automatically add and switch to the network
   - The network will be added to your wallet if it's not already present

### Deploying a Token

1. **Navigate to Deploy Page**
   - Click "Deploy Token" on the homepage, or
   - Click "Deploy" in the navigation menu (when wallet is connected)

2. **Fill in Token Details**
   - **Token Name**: Full name of your token (e.g., "ARC")
   - **Token Symbol**: Ticker symbol (e.g., "USDC") - typically 3-5 characters
   - **Decimals**: Standard is 18 (like Ethereum)
   - **Initial Supply**: Amount of tokens to mint at deployment
   - **Max Supply**: Maximum tokens that can exist (check "Unlimited" for no limit)

3. **Choose Mint Authority**
   - **Owner**: Only your connected wallet can mint (requires wallet connection)
   - **Anyone**: Public minting - anyone can mint tokens
   - **Specific Address**: Only a specific address can mint

4. **Select Deployment Method**
   - **Use my connected wallet**: Deploy directly from your wallet (requires USDC for gas)
     - Note: Not available for "Owner" mint authority
   - **Deploy without wallet (Token Deployer key)**: Uses platform signer (no gas needed from you)
     - Note: Not available for "Owner" mint authority

5. **Deploy**
   - Click "Deploy Token"
   - Wait for transaction confirmation
   - You'll be automatically redirected to the token details page

### Viewing Your Tokens

1. **Dashboard**
   - Click "Dashboard" in the navigation (requires wallet connection)
   - View all tokens you've deployed
   - See total tokens, total supply, and your balance across all tokens
   - Click any token to view detailed information

2. **Token Details Page**
   - View complete token information:
     - Name, Symbol, Decimals
     - Total Supply and Max Supply
     - Mint Authority type and address
     - Your balance (if wallet is connected)
   - Copy token address or view on explorer
   - Perform actions if you have permission

### Minting Tokens

1. **Open Mint Dialog**
   - Navigate to a token's details page
   - Click "Mint Tokens" button (only visible if you have permission)

2. **Select Recipient**
   - **Connected Wallet Address**: Mint to your connected wallet
   - **Another Address**: Enter a custom recipient address

3. **Enter Amount**
   - Type the amount of tokens to mint (in token units, not wei)

4. **Choose Mint Method**
   - **Use my connected wallet**: Sign transaction with your wallet (requires USDC for gas)
   - **Deploy without wallet (Token Deployer key)**: Uses platform signer
     - Note: Not available for tokens with mint authority `0xA93E963Af221e9fe5215C18Ee14588C8119266FE`

5. **Mint**
   - Click "Mint Tokens"
   - Wait for confirmation
   - View transaction hash and updated balances
   - Click "View on Explorer" to see transaction on Arc Testnet explorer

### Permissions

- **Mint Authority = Anyone (0x0000...)**: Anyone can mint tokens
- **Mint Authority = Your Address**: Only you can mint (when wallet matches)
- **Mint Authority = Specific Address**: Only that address can mint
- **Exception Address**: Token with mint authority `0xA93E963Af221e9fe5215C18Ee14588C8119266FE` allows any connected wallet to mint (but only via backend, not wallet)

### Network Requirements

- **Arc Testnet** (Chain ID: 5042002)
- Native currency: USDC (18 decimals)
- RPC: `https://rpc.testnet.arc.network`
- Explorer: `https://testnet.arcscan.app/`

## 👨‍💻 Developer Guide

### Prerequisites

- Node.js 18+ and npm
- Git
- MetaMask or compatible wallet (for testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd token-deployer
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   Create a `.env.local` file in the root directory:
   ```env
   PRIVATE_KEY=your_private_key_here
   ARC_TESTNET_RPC_URL=https://rpc.testnet.arc.network
   TOKEN_DEPLOYER_ADDRESS=0x3B552805Ab544292a2A13ae5317E83D2BBBf37bf
   ```

   **Important**: 
   - Never commit `.env.local` to version control
   - Use a dedicated wallet for the Token Deployer key
   - Never use a wallet with real funds for the private key

4. **Run development server**
   ```bash
   npm run dev
   ```

5. **Open in browser**
   Navigate to `http://localhost:3000`

### Project Structure

```
token-deployer/
├── app/
│   ├── api/
│   │   ├── deploy/          # API route for backend token deployment
│   │   └── mint/            # API route for backend token minting
│   ├── dashboard/           # Dashboard page (user's deployed tokens)
│   ├── deploy/              # Token deployment page
│   ├── token/
│   │   └── [address]/       # Dynamic token details page
│   ├── layout.tsx           # Root layout with metadata
│   ├── page.tsx             # Homepage
│   └── not-found.tsx        # 404 page
├── components/
│   ├── ui/                  # Shadcn UI components
│   ├── deployment-form.tsx  # Token deployment form
│   ├── mint-dialog.tsx      # Token minting dialog
│   ├── navigation.tsx       # Main navigation component
│   └── wallet-status.tsx    # Wallet connection status
├── contexts/
│   └── wallet-context.tsx   # Wallet connection context
├── lib/
│   ├── fetch-token-details.ts  # Fetch single token details
│   ├── fetch-tokens.ts         # Fetch user's deployed tokens
│   ├── wallet-deploy.ts        # Wallet-based deployment
│   └── wallet-mint.ts         # Wallet-based minting
└── public/                  # Static assets (logos, icons)
```



### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `PRIVATE_KEY` | Private key for Token Deployer wallet | Yes | - |
| `ARC_TESTNET_RPC_URL` | Arc Testnet RPC endpoint | No | `https://rpc.testnet.arc.network` |
| `TOKEN_DEPLOYER_ADDRESS` | TokenDeployer contract address | No | `0x3B552805Ab544292a2A13ae5317E83D2BBBf37bf` |

### Key Features

#### Token Deployment
- **Wallet Deployment**: Users deploy directly from their connected wallet
- **Backend Deployment**: Platform deploys using Token Deployer key (no user gas needed)
- **Mint Authority Options**: Owner, Anyone, or Specific Address
- **Supply Management**: Initial supply and optional max supply

#### Token Management
- **Dashboard**: View all deployed tokens with balances
- **Token Details**: Complete token information and metadata
- **Minting**: Mint tokens to any address (with permissions)
- **Explorer Integration**: Direct links to Arc Testnet explorer

#### Wallet Integration
- **Auto Network Switch**: Automatically switches to Arc Testnet
- **Network Detection**: Warns if on wrong network
- **Balance Display**: Shows USDC balance with faucet link
- **Event Listeners**: Auto-updates on account/chain changes

### API Routes

#### POST `/api/deploy`
Deploys a new token using the Token Deployer key.

**Request Body:**
```json
{
  "tokenName": "ARC",
  "tokenSymbol": "USDC",
  "decimals": 18,
  "initialSupply": "1000000",
  "maxSupply": "10000000",
  "mintAuthority": "anyone",
  "specificAddress": "",
  "deploymentMode": "token-deployer"
}
```

**Response:**
```json
{
  "success": true,
  "tokenAddress": "0x...",
  "transactionHash": "0x...",
  "blockNumber": 12345,
  "tokenInfo": { ... }
}
```

#### POST `/api/mint`
Mints tokens using the Token Deployer key.

**Request Body:**
```json
{
  "tokenAddress": "0x...",
  "recipientAddress": "0x...",
  "amount": "100"
}
```

**Response:**
```json
{
  "success": true,
  "transactionHash": "0x...",
  "blockNumber": 12345,
  "newTotalSupply": "1000100",
  "recipientBalance": "100"
}
```

### Smart Contract Integration

#### TokenDeployer Contract
- **Address**: `0x3B552805Ab544292a2A13ae5317E83D2BBBf37bf`
- **Function**: `deployTokenSimple(name, symbol, decimals, initialSupply, maxSupply, mintAuthorityType, specificMintAuthority)`
- **Mint Authority Types**: 
  - `0` = OWNER
  - `1` = ANYONE
  - `2` = SPECIFIC

#### Token Contract
- Standard ERC20 with mint functionality
- Functions: `name()`, `symbol()`, `decimals()`, `totalSupply()`, `maxSupply()`, `mintAuthority()`, `balanceOf()`, `mint()`

### Development Commands

```bash
# Development server
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint code
npm run lint
```


### Troubleshooting

**Wallet won't connect:**
- Make sure MetaMask/core wallet is installed
- Check browser console for errors
- Try refreshing the page

**Network switch fails:**
- Manually add Arc Testnet to MetaMask
- Chain ID: 5042002
- RPC: https://rpc.testnet.arc.network

**Deployment fails:**
- Check you have USDC balance (for wallet deployment)
- Verify network is Arc Testnet
- Check console for error messages

**Token not showing on dashboard:**
- Make sure you're connected with the wallet that deployed it
- Try refreshing the page
- Check token address is correct

### Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request



---

**Built for Arc Testnet** | [Explorer](https://testnet.arcscan.app/) | [Faucet](https://faucet.circle.com/)

