# Token Manager

## Deployed Contract

**TokenDeployer:** [`0x3B552805Ab544292a2A13ae5317E83D2BBBf37bf`](https://testnet.arcscan.app/address/0x3B552805Ab544292a2A13ae5317E83D2BBBf37bf)

## Compile

```bash
forge build
```

## Deploy TokenDeployer

```bash
forge create src/token/TokenDeployer.sol:TokenDeployer \
  --rpc-url https://rpc.testnet.arc.network \
  --private-key $PRIVATE_KEY \
  --broadcast
```

## Script Functions

### Deploy Token

```bash
node script/testTokenDeployer.js
```

### Query Deployed Tokens by Address

```bash
node script/testTokenDeployer.js query <deployerAddress>
```

### Get Token Details

```bash
node script/testTokenDeployer.js details <tokenAddress>
```

### Mint Tokens

```bash
node script/testTokenDeployer.js mint <tokenAddress> <recipientAddress> <amount>
```

## Environment Variables

Create `.env` file:

```
PRIVATE_KEY=your_private_key_here
```
