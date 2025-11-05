# Freighter Wallet Connection - Debug Checklist

## 🔍 Step 1: Verify Freighter Extension

### Browser Console Commands:
Open http://localhost:8080/ in your browser, then press F12 and run these in the console:

```javascript
// 1. Check if Freighter is injected
console.log('Freighter exists:', !!window.freighterApi);

// 2. Check what methods are available
console.log('Freighter methods:', window.freighterApi ? Object.keys(window.freighterApi) : 'NOT FOUND');

// 3. Check timing - run this IMMEDIATELY when page loads
console.log('Document state:', document.readyState);
console.log('Freighter at load:', !!window.freighterApi);
```

### Expected Results:
✅ `Freighter exists: true`
✅ `Freighter methods: ["isConnected", "getPublicKey", "requestAccess", "signTransaction", ...]`

❌ If you see `false` or `NOT FOUND`, the problem is:
- Freighter extension is not installed
- Freighter extension is disabled
- Wrong browser profile
- Extension hasn't injected yet

---

## 🔍 Step 2: Check Extension Status

### In Chrome/Brave:
1. Go to `chrome://extensions/`
2. Find "Freighter"
3. Make sure:
   - ✅ Toggle is ON (blue)
   - ✅ "Allow in Incognito" is checked if using incognito
   - ✅ Click "Details" → Ensure it has permissions

### Quick Test:
Click the Freighter extension icon in your browser toolbar. Does it open?
- ✅ YES = Extension is working
- ❌ NO = Extension is broken, try reinstalling

---

## 🔍 Step 3: Check Console Logs

### What to look for in browser console:

**ON PAGE LOAD** - You should see:
```
✅ [WalletContext] Freighter detected!
[Header] State update: {isFreighterAvailable: true, ...}
```

**WHEN YOU CLICK "Connect Wallet"** - You should see:
```
[Header] State update: {isConnecting: true, ...}
[WalletContext] Requesting access...
[WalletContext] Access granted: GXXXX...
```

### If you DON'T see "Freighter detected":

Run this diagnostic script in console:
```javascript
// Diagnostic: Check injection timing
let checks = 0;
const interval = setInterval(() => {
  checks++;
  console.log(`Check ${checks}: window.freighterApi =`, !!window.freighterApi);
  if (window.freighterApi || checks > 10) {
    clearInterval(interval);
    console.log('Final result:', window.freighterApi ? 'FOUND' : 'NOT FOUND');
  }
}, 500);
```

---

## 🔍 Step 4: Check React Context

### In browser console, run:
```javascript
// Check if WalletContext is providing data
// This will show React internal state
$r // If you select a component in React DevTools
```

### Or add temporary debug log:
1. Look for this in your console output
2. The state should show:
   - `isFreighterAvailable: true`
   - `isConnected: false` (before connecting)
   - `isConnecting: false` (when idle)

---

## 🔍 Step 5: Common Issues & Solutions

### Issue: "window.freighterApi is undefined"

**Root Causes:**
1. **Timing Issue** - Freighter injects after React loads
   - Solution: Our code waits for 'load' event ✅
   
2. **Extension Not Injecting**
   - Try: Disable and re-enable Freighter extension
   - Try: Close all browser tabs and restart browser
   - Try: Reinstall Freighter from https://www.freighter.app/

3. **Content Security Policy Blocking**
   - Check browser console for CSP errors
   - Check Network tab for blocked scripts

4. **Wrong localhost port**
   - Freighter may have allowlist for certain ports
   - Try: http://localhost:3000 instead of 8080

### Issue: "Freighter detected but connect fails"

**Root Causes:**
1. **User denies permission** - Check Freighter popup
2. **Network mismatch** - We're using TESTNET
3. **Freighter not set up** - User needs to create/import wallet in Freighter first

---

## 🔍 Step 6: Nuclear Options (If nothing works)

### Option A: Test with Different Browser
1. Install fresh Chrome/Brave
2. Install Freighter extension
3. Test on http://localhost:8080/

### Option B: Test Freighter Directly
Create a simple HTML file and test:

```html
<!DOCTYPE html>
<html>
<head><title>Freighter Test</title></head>
<body>
  <button onclick="test()">Test Freighter</button>
  <div id="result"></div>
  <script>
    async function test() {
      const result = document.getElementById('result');
      
      if (!window.freighterApi) {
        result.innerHTML = '❌ Freighter NOT found';
        return;
      }
      
      result.innerHTML = '✅ Freighter found! Requesting access...';
      
      try {
        const publicKey = await window.freighterApi.requestAccess();
        result.innerHTML = '✅ Connected! Public Key: ' + publicKey;
      } catch (err) {
        result.innerHTML = '❌ Error: ' + err.message;
      }
    }
    
    // Check on load
    window.addEventListener('load', () => {
      console.log('Freighter available:', !!window.freighterApi);
    });
  </script>
</body>
</html>
```

Save this as `test-freighter.html` and open it in browser.

### Option C: Check Freighter Version
1. Go to `chrome://extensions/`
2. Find Freighter
3. Note the version number
4. Should be v5.0+ for Soroban support

---

## 📋 Report Back With:

Please copy and paste your findings:

1. **Freighter exists?** (true/false from Step 1)
2. **Extension enabled?** (yes/no from Step 2)
3. **Console logs** (copy all logs from Step 3)
4. **When does it fail?** (page load / button click / after popup)
5. **Any errors in console?** (red errors)
6. **Freighter popup opens?** (yes/no when clicking connect)

---

## 🎯 Most Likely Issues (Based on Your Symptoms):

Given that you said "did not work", here's my analysis:

### Hypothesis 1: Extension Not Injecting (80% probability)
- **Symptom**: Console shows "Freighter detected: false"
- **Cause**: Extension disabled, wrong browser, or CSP blocking
- **Fix**: Check Step 2

### Hypothesis 2: Timing Race Condition (15% probability)
- **Symptom**: Sometimes works, sometimes doesn't
- **Cause**: Freighter injects slower than React renders
- **Fix**: Already implemented in our useEffect ✅

### Hypothesis 3: User Interaction Needed (5% probability)
- **Symptom**: Detected but can't connect
- **Cause**: User hasn't set up Freighter wallet yet
- **Fix**: User needs to create wallet in Freighter extension

---

## 🚀 Next Steps:

1. Open http://localhost:8080/
2. Open Console (F12)
3. Run the diagnostic commands from Step 1
4. Tell me EXACTLY what you see
5. Include screenshots if possible

**The key question: Does `console.log(window.freighterApi)` show an object or undefined?**
