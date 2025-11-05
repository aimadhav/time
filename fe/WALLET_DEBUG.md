# Freighter Wallet Connection Troubleshooting Guide

## ✅ What We've Fixed

The wallet connection now properly uses the **`requestAccess()`** method from guide.txt, which is the correct approach that works.

### Key Changes:
1. **WalletContext**: Now waits up to 2 seconds for Freighter to be injected
2. **Connection Method**: Uses `window.freighterApi.requestAccess()` instead of `isConnected()`
3. **Header**: Has fallback checks for `window.freighterApi` directly
4. **Console Logging**: Added detailed logs to help diagnose issues

---

## 🔍 Debugging Steps

### Step 1: Check If Freighter Is Installed
Open the browser console and run:
```javascript
console.log('Freighter API:', window.freighterApi);
```

**Expected output:** Should show an object with methods like `requestAccess`, `signTransaction`, etc.

**If undefined:** Freighter extension is not installed or not loaded.

---

### Step 2: Check Browser Console Logs
When you click "Connect Wallet", watch the console for these logs:

```
[WalletContext] connect() called
[WalletContext] 🔐 Requesting Freighter access...
[WalletContext] Calling requestAccess()
[WalletContext] Freighter response: {address: "G..."}
[WalletContext] ✅ Connected: G...
```

### If you see `❌ window.freighterApi not found`:
- Freighter extension is not loaded
- Try refreshing the page
- Ensure Freighter is installed and enabled

---

### Step 3: Verify Freighter Installation

1. Go to **freighter.app**
2. Click "Install Extension" for your browser
3. Add the extension to your browser
4. Create or import a wallet
5. **Unlock your wallet** (very important!)
6. Refresh your app

---

## 🔧 Manual Connection Test

Test the connection directly in the browser console:

```javascript
// Check if Freighter is available
if (!window.freighterApi) {
  console.error('Freighter not found!');
} else {
  console.log('Testing Freighter connection...');
  
  // Request access
  window.freighterApi.requestAccess().then(result => {
    if (result.error) {
      console.error('Error:', result.error);
    } else {
      console.log('Connected! Address:', result.address);
    }
  });
}
```

---

## 🚨 Common Issues & Solutions

### Issue 1: "Please install Freighter wallet"
**Cause:** Extension not installed or not loaded

**Solution:**
- Download from https://www.freighter.app/
- Add to your browser
- Refresh the page
- Ensure wallet is unlocked

### Issue 2: requestAccess() hangs or times out
**Cause:** Wallet is locked or network issue

**Solution:**
- Check if Freighter wallet is locked
- Click the extension icon to unlock it
- Try restarting Freighter
- Clear browser cache and try again

### Issue 3: "No address returned from Freighter"
**Cause:** Freighter response is malformed

**Solution:**
- Check browser console for detailed error
- Try with a different wallet account
- Reinstall Freighter extension

---

## 📊 Connection Flow

```
User clicks "Connect Wallet"
        ↓
Check if window.freighterApi exists
        ↓
If not, wait up to 2 seconds for injection
        ↓
Call window.freighterApi.requestAccess()
        ↓
Freighter shows approval dialog
        ↓
User approves/denies
        ↓
If approved → Get address → Save to sessionStorage
        ↓
Update UI with connected address
```

---

## 🔐 Security Notes

- Connection is stored only in `sessionStorage` (cleared on page close)
- Never save private keys in localStorage
- Freighter handles all signing operations securely
- Your private key never leaves the extension

---

## 📱 Testing Checklist

Before deployment, ensure:

- [ ] Freighter is installed and running
- [ ] Wallet is unlocked
- [ ] No browser extensions are blocking content scripts
- [ ] Console shows successful connection logs
- [ ] Address displays correctly in header
- [ ] Can disconnect and reconnect
- [ ] Wallet address persists on page refresh

---

## 🐛 Debug Mode

To enable verbose logging, add this to the console:

```javascript
// Enable all wallet logs
localStorage.setItem('DEBUG_WALLET', 'true');
location.reload();
```

Then check console for detailed connection flow.

---

## 📞 Still Having Issues?

Check these:

1. **Freighter Status:**
   ```javascript
   console.log({
     freighterAvailable: !!window.freighterApi,
     hasRequestAccess: !!window.freighterApi?.requestAccess,
     hasSignTransaction: !!window.freighterApi?.signTransaction
   });
   ```

2. **Network Status:**
   ```javascript
   // Check if TESTNET RPC is reachable
   fetch('https://soroban-testnet.stellar.org').then(r => console.log('RPC OK:', r.status));
   ```

3. **Session Storage:**
   ```javascript
   console.log('Saved address:', sessionStorage.getItem('walletAddress'));
   ```

---

## ✅ Expected Behavior After Fix

1. Page loads → WalletContext checks for Freighter
2. If found → Shows "Connect Wallet" button
3. Click button → Shows Freighter approval dialog
4. Approve → Address displays in header
5. Refresh → Address persists (from sessionStorage)
6. Click disconnect → Address cleared

---

## Code Reference

### WalletContext Connection
```typescript
// Waits up to 2 seconds for Freighter injection
// Then calls requestAccess() with proper error handling
```

### Header Integration
```typescript
// Double-checks for window.freighterApi
// Shows helpful error messages if missing
// Disables button until Freighter is available
```

Both implementations follow the exact patterns from your working `guide.txt`!
