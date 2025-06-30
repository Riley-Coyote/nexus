# Resonance Field Testing Guide

## Overview

This guide helps you test and verify that the resonance functionality in NEXUS is working correctly. The resonance field should show all posts that a user has resonated with.

## 🧪 Automatic Test Setup

When you log into the app, the system automatically:

1. **Initializes test resonances** - Adds 3 test entries to your resonance list
2. **Loads resonated entries** - Displays them in the resonance field
3. **Provides debugging tools** - Available in browser console

## 🔍 Testing Steps

### 1. Basic Functionality Test

1. **Open the app** in your browser at `http://localhost:3000`
2. **Log in** with any demo account:
   - Username: `oracle` / Password: `nexus123`
   - Username: `curator` / Password: `nexus123`
   - Username: `dreamer` / Password: `nexus123`
3. **Check console logs** - Should see:
   ```
   🧪 Initialized 3 test resonances for user: Oracle (user_xxx)
   🔍 Loading resonated entries for user: user_xxx
   ✅ Loaded 3 resonated entries: [...entry IDs...]
   ```
4. **Navigate to Resonance Field** - Click the "◇" button in header
5. **Verify entries appear** - Should see 3 resonated posts

### 2. Manual Resonance Test

1. **Go to Logbook or Dreams section**
2. **Click "Resonate ◊" on any entry**
3. **Check console** - Should see resonance operation logs
4. **Go to Resonance Field** - Entry should appear there
5. **Click "Resonate ◊" again** - Entry should disappear

### 3. Browser Console Testing

Open browser DevTools (F12) and run these commands:

```javascript
// Check current user's resonances
debugResonance.getUserResonances('current_user_id')

// Manually add a resonance for testing
debugResonance.addResonance('current_user_id', 'logbook_001')

// Refresh the resonance field
debugResonance.refreshResonatedEntries()

// Access full dataService for advanced testing
window.nexusDataService.debugGetUserResonances('current_user_id')
```

## 🐛 Debug Features

### Development Mode Features

In development mode, you'll see:

1. **Debug Test Button** - Purple "🐛 Test" button in resonance field header
2. **Console Debugging** - Detailed logs of all resonance operations
3. **Global Debug Objects**:
   - `window.nexusDataService` - Full data service access
   - `window.debugResonance` - Resonance-specific debug tools

### Console Commands

```javascript
// Get all available debug methods
console.log(Object.keys(window.debugResonance))

// Check if user has specific resonance
window.nexusDataService.hasUserResonated('user_id', 'entry_id')

// Get all resonated entries for a user
window.nexusDataService.getResonatedEntries('user_id')

// Check dataService configuration
window.nexusDataService.getThreadingConfig()
```

## 📊 Expected Behavior

### Successful Resonance Flow

```
User clicks "Resonate ◊" 
→ dataService.resonateWithEntry(entryId) called
→ userResonances Map updated
→ refreshResonatedEntries() called
→ getResonatedEntries() fetches updated list
→ ResonanceField displays new entry
→ Console shows: "✅ Loaded X resonated entries"
```

### Resonance Field Display

- **Shows resonated posts** in chronological order (newest first)
- **Entry count** displayed in header
- **Last updated time** shown
- **Refresh button** to manually reload
- **Empty state** with helpful message if no resonances

## 🚨 Troubleshooting

### No Entries in Resonance Field

**Possible causes:**
1. User not logged in
2. No test resonances initialized
3. Console errors in data loading

**Solutions:**
```javascript
// Check if user is logged in
console.log(window.nexusDataService.authState)

// Manually initialize test resonances
window.nexusDataService.initializeUserResonances('current_user_id')

// Force refresh resonance field
debugResonance.refreshResonatedEntries()
```

### Resonance Button Not Working

**Check console for errors:**
```javascript
// Test resonance functionality directly
window.nexusDataService.resonateWithEntry('logbook_001')
  .then(result => console.log('Resonance result:', result))
  .catch(error => console.error('Resonance error:', error))
```

### Performance Issues

**Monitor threading performance:**
```javascript
// Check threading configuration
console.log(window.nexusDataService.getThreadingConfig())

// Switch threading mode for testing
window.nexusDataService.setThreadingMode('adaptive')
window.nexusDataService.setThreadingMode('dfs')
window.nexusDataService.setThreadingMode('bfs')
```

## ✅ Success Criteria

The resonance field is working correctly when:

1. ✅ **Test resonances initialize** on user login
2. ✅ **Resonance field shows entries** immediately after login
3. ✅ **New resonances appear** when user clicks resonate button
4. ✅ **Unresonating removes entries** from the field
5. ✅ **Real-time updates** work without page refresh
6. ✅ **Console logs show** detailed operation tracking
7. ✅ **Debug tools respond** correctly in browser console

## 🔧 Advanced Testing

### Load Testing

```javascript
// Test with many resonances
const entries = ['logbook_001', 'logbook_002', 'dream_001', 'dream_002']
const userId = 'test_user'

entries.forEach(entryId => {
  debugResonance.addResonance(userId, entryId)
})

debugResonance.refreshResonatedEntries()
```

### Data Persistence Testing

```javascript
// Test data persistence across page refreshes
debugResonance.addResonance('user_id', 'test_entry')
// Refresh page and check if resonance persists
debugResonance.getUserResonances('user_id')
```

### Error Handling Testing

```javascript
// Test with invalid data
debugResonance.addResonance('', 'invalid_entry')
debugResonance.addResonance('user_id', '')
```

## 📈 Performance Monitoring

### Check Operation Times

```javascript
// Monitor refresh performance
console.time('resonance-refresh')
debugResonance.refreshResonatedEntries()
  .then(() => console.timeEnd('resonance-refresh'))
```

### Memory Usage

```javascript
// Check how many resonances are cached
const allResonances = window.nexusDataService.userResonances
console.log('Cached resonances:', allResonances.size)
```

## 🎯 Testing Checklist

- [ ] User can log in successfully
- [ ] Test resonances initialize automatically
- [ ] Resonance field shows initial entries
- [ ] User can resonate with new entries
- [ ] New resonances appear in field immediately
- [ ] User can unresonater entries
- [ ] Unresonated entries disappear from field
- [ ] Manual refresh button works
- [ ] Console shows detailed logs
- [ ] Debug tools respond correctly
- [ ] Performance is acceptable (< 500ms operations)
- [ ] No console errors during normal operation

The resonance field should now work perfectly with real-time updates and comprehensive debugging support! 