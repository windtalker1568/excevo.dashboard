# 📝 Copy-Paste Integration Instructions

## Quick Summary
You have 7 files to integrate into your project. Follow these steps exactly.

---

## Step 1: Create Folders

Open PowerShell/Terminal in your project root:

```powershell
# Navigate to client/src
cd client/src

# Create new folders
mkdir context
mkdir components  
mkdir styles
```

---

## Step 2: Copy Files to Your Project

### File 1: AuthContext.tsx
**Destination:** `client/src/context/AuthContext.tsx`
**Copy the entire content from:** AuthContext.tsx (provided)

### File 2: ProtectedRoute.tsx
**Destination:** `client/src/components/ProtectedRoute.tsx`
**Copy the entire content from:** ProtectedRoute.tsx (provided)

### File 3: Login.tsx
**Destination:** `client/src/pages/Login.tsx`
**Copy the entire content from:** Login.tsx (provided)
⚠️ Make sure this overwrites OR check if pages folder exists first

### File 4: Login.css
**Destination:** `client/src/styles/Login.css`
**Copy the entire content from:** Login.css (provided)

### File 5: sidebar.css
**Destination:** `client/src/styles/sidebar.css`
**Copy the entire content from:** sidebar.css (provided)

---

## Step 3: Update Existing Files

### File 6: App.tsx
**Destination:** `client/src/App.tsx`
**Action:** REPLACE entire file with provided App.tsx

**What changed:**
- Added imports for Login, useAuth, ProtectedRoute
- Added authentication check
- Wrapped routes with ProtectedRoute
- Added user profile section to sidebar
- Added logout functionality

### File 7: main.tsx
**Destination:** `client/src/main.tsx`
**Action:** REPLACE entire file with provided main.tsx

**What changed:**
- Added import for AuthProvider
- Wrapped App with AuthProvider
- Rest stays the same

### File 8: index.css
**Destination:** `client/src/index.css`
**Action:** APPEND (add to bottom)

**What to add:**
Scroll to the bottom and add all content from `sidebar.css` file

---

## Step 4: File Organization Checklist

✅ Verify your folder structure matches this:

```
excevo.dashboard/
├── client/
│   ├── src/
│   │   ├── context/
│   │   │   └── AuthContext.tsx          ✅
│   │   ├── components/
│   │   │   └── ProtectedRoute.tsx       ✅
│   │   ├── pages/
│   │   │   ├── Login.tsx                ✅
│   │   │   ├── Dashboard.tsx
│   │   │   ├── People.tsx
│   │   │   ├── PIPs.tsx
│   │   │   ├── Quality.tsx
│   │   │   ├── Leaderboard.tsx
│   │   │   ├── Export.tsx
│   │   │   └── Settings.tsx
│   │   ├── styles/
│   │   │   ├── Login.css                ✅
│   │   │   └── sidebar.css              ✅
│   │   ├── App.tsx                      ✅ (UPDATED)
│   │   ├── main.tsx                     ✅ (UPDATED)
│   │   ├── index.css                    ✅ (UPDATED - append)
│   │   └── ...other files
│   └── package.json
├── server/
└── README.md
```

---

## Step 5: Verify Everything Works

### Run Development Server
```bash
cd client
npm run dev
```

You should see:
```
VITE v5.4.8  ready in 234 ms

➜  Local:   http://localhost:5173/
➜  press h to show help
```

### Open in Browser
Visit: `http://localhost:5173/`

You should see the **beautiful login page** with:
- ✅ Animated gradient background
- ✅ Excevo Dashboard title
- ✅ Email input field
- ✅ Password input field  
- ✅ Sign In button
- ✅ 4 Demo account buttons
- ✅ Floating particles animation

---

## Step 6: Test Login Flow

### Test 1: Login with Demo Account
1. Click on any demo account button (ET, FH, JL, or SK)
2. Page should redirect to dashboard
3. You should see your name/email in sidebar
4. 🎉 **Success!**

### Test 2: Login with Email/Password
1. Go back to login (click Sign Out button)
2. Enter: `emerson.thomas@excevo.co.uk`
3. Enter password: `password`
4. Click Sign In
5. Dashboard loads
6. 🎉 **Success!**

### Test 3: Try Invalid Email
1. Enter: `invalid@example.com`
2. Enter password: `password`
3. Click Sign In
4. Error message appears: "Invalid email or password"
5. 🎉 **Error handling works!**

### Test 4: Try Wrong Password
1. Enter: `emerson.thomas@excevo.co.uk`
2. Enter password: `wrong`
3. Click Sign In
4. Error message appears: "Invalid email or password"
5. 🎉 **Password validation works!**

### Test 5: Session Persistence
1. Login successfully
2. Refresh page (F5)
3. Dashboard still shows (not redirected to login)
4. User info still visible
5. 🎉 **localStorage persistence works!**

### Test 6: Logout
1. Click "Sign Out" button in sidebar
2. Redirected to login page
3. localStorage cleared
4. 🎉 **Logout works!**

---

## Troubleshooting Guide

### ❌ Problem: "Cannot find module '@/context/AuthContext'"

**Solution:**
- Check file is at: `client/src/context/AuthContext.tsx`
- Check spelling matches exactly
- No extra spaces in filename

### ❌ Problem: Login page not appearing

**Solution:**
```bash
# Clear cache and reinstall
rm -r node_modules
rm package-lock.json
npm install
npm run dev
```

### ❌ Problem: Styles not loading (plain HTML showing)

**Solution:**
- Verify `Login.css` exists at `client/src/styles/Login.css`
- Verify `sidebar.css` content is added to bottom of `index.css`
- Check browser DevTools > Network tab for 404s on CSS files

### ❌ Problem: Can't login with demo account

**Solution:**
- Clear browser localStorage: Press F12 > Application > LocalStorage > Clear All
- Check email spelling in error message (must be exact)
- Verify password is exactly: `password` (lowercase)
- Check console for error messages

### ❌ Problem: After login, still shows login page

**Solution:**
- Verify `main.tsx` has `<AuthProvider>` wrapper
- Check `App.tsx` has `isAuthenticated` check
- Verify `AuthContext.tsx` is in `context/` folder
- Check browser console for errors

### ❌ Problem: TypeScript errors about imports

**Solution:**
```bash
# Install type definitions if missing
npm install --save-dev @types/react @types/react-dom

# Try build to see full errors
npm run build
```

### ❌ Problem: Build fails with TypeScript error

**Solution:**
1. Check file paths in imports are correct
2. Verify all files are TypeScript (.tsx)
3. Run: `npm run build` to see full error
4. Common issue: Wrong import path (use `./` for relative)

---

## File Sizes Reference

```
AuthContext.tsx      ~2.3 KB
ProtectedRoute.tsx   ~0.4 KB
Login.tsx            ~6.5 KB
Login.css            ~11.4 KB
sidebar.css          ~1.7 KB
App.tsx              ~2.9 KB
main.tsx             ~0.4 KB
─────────────────
TOTAL                ~25.6 KB
```

All very lightweight! No impact on build size.

---

## Testing Credentials

Use these to test:

| Email | Password | Name |
|-------|----------|------|
| emerson.thomas@excevo.co.uk | password | Emerson Thomas |
| fabian.hutton@excevo.co.uk | password | Fabian Hutton |
| jaswanth.lal@excevo.co.uk | password | Jaswanth Lal |
| simon.kay@excevo.co.uk | password | Simon Kay |

**Any other email:** Login fails with error ✅

---

## Next Steps After Implementation

Once login is working:

1. **SharePoint Integration** ← We'll do this next
   - Connect to: `https://snagsmartuk.sharepoint.com/sites/Excevo`
   - Fetch Excel file: `Dashboard_Test.xlsx`
   - Display data in dashboard

2. **Data Binding**
   - Connect SharePoint data to charts
   - Add refresh button
   - Display data updates

3. **Production Deployment**
   - Switch to Microsoft Azure AD auth
   - Remove hardcoded passwords
   - Add backend API authentication

---

## Support

If you get stuck:

1. **Check error messages** - Press F12 to open DevTools > Console
2. **Read the error** - Copy exact error message
3. **Check file paths** - Make sure files are in right location
4. **Compare with provided files** - Match line-by-line
5. **Clear cache** - Delete `node_modules`, reinstall, restart dev server

---

## ✅ Implementation Verification

Run this command to verify everything:

```bash
# From project root
cd client/src

# List all new files (should show)
ls -la context/AuthContext.tsx
ls -la components/ProtectedRoute.tsx
ls -la pages/Login.tsx
ls -la styles/Login.css
ls -la styles/sidebar.css
```

If all 5 files show up, you're good! ✅

---

## Final Checklist

- [ ] Created `context/` folder
- [ ] Created `components/` folder
- [ ] Created `styles/` folder
- [ ] Copied AuthContext.tsx to context/
- [ ] Copied ProtectedRoute.tsx to components/
- [ ] Copied Login.tsx to pages/
- [ ] Copied Login.css to styles/
- [ ] Copied sidebar.css to styles/
- [ ] Updated App.tsx (replaced entire file)
- [ ] Updated main.tsx (replaced entire file)
- [ ] Appended sidebar.css content to index.css
- [ ] Ran `npm run dev`
- [ ] Tested login with demo account
- [ ] Tested logout
- [ ] Tested session persistence (refresh page)

**Once all checked ✅ you're done with login!**

---

## Need Help?

Check the error messages in:
1. Browser Console (F12 > Console tab)
2. Terminal where `npm run dev` is running
3. Build output from `npm run build`

These will tell you exactly what's wrong!

**Ready? Let's go! 🚀**
