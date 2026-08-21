# 🎨 Authentication & Login Page Integration Guide

## Overview
A stunning login page with simple email/password authentication for your Excevo Dashboard.

**Allowed Users:**
- emerson.thomas@excevo.co.uk
- fabian.hutton@excevo.co.uk
- jaswanth.lal@excevo.co.uk
- simon.kay@excevo.co.uk

**Default Password:** `password`

---

## 📁 File Structure

Place the files in your project as follows:

```
client/src/
├── context/
│   └── AuthContext.tsx          [NEW] - Authentication state management
├── components/
│   └── ProtectedRoute.tsx        [NEW] - Route protection wrapper
├── pages/
│   └── Login.tsx                 [NEW] - Login page component
├── styles/
│   ├── Login.css                 [NEW] - Login page styling
│   └── sidebar.css               [NEW] - Sidebar user profile styling
├── App.tsx                       [UPDATED] - Add auth routing
├── main.tsx                      [UPDATED] - Add AuthProvider
└── index.css                     [EXISTING] - Add sidebar CSS content to bottom
```

---

## 🚀 Installation Steps

### Step 1: Create Directories
```bash
cd client/src
mkdir -p context components styles
```

### Step 2: Add Files

Copy these files to your project:

1. **client/src/context/AuthContext.tsx**
   - Manages authentication state
   - Stores user info in localStorage
   - Validates email/password combinations

2. **client/src/components/ProtectedRoute.tsx**
   - Wraps protected pages
   - Redirects unauthenticated users to login

3. **client/src/pages/Login.tsx**
   - Beautiful login UI
   - Demo account shortcuts
   - Password visibility toggle
   - Error handling with animations

4. **client/src/styles/Login.css**
   - Animated gradients and blobs
   - Smooth transitions
   - Responsive design

5. **client/src/styles/sidebar.css**
   - User profile display in sidebar
   - Logout button styling

### Step 3: Update Existing Files

#### client/src/App.tsx
Replace with the provided App.tsx that:
- Checks authentication status
- Shows login page if not authenticated
- Wraps dashboard routes with ProtectedRoute
- Adds user profile and logout button to sidebar

#### client/src/main.tsx
Replace with the provided main.tsx that wraps the app with:
```jsx
<AuthProvider>
  <App />
</AuthProvider>
```

#### client/src/index.css
Add the sidebar CSS content from `sidebar.css` to the bottom of your existing index.css

### Step 4: Import Styles in Components

Update your page components to import styles:
```tsx
import './styles/Login.css';
```

---

## 🎯 Features

### Login Page
✨ **Beautiful UI**
- Animated gradient background with floating blobs
- Glassmorphism card design
- Smooth animations and transitions
- Floating particles effect

🔐 **Authentication**
- Email validation (must be from allowed list)
- Password input with visibility toggle
- Error messages with shake animation
- Loading state with spinner

🎪 **Demo Accounts**
- Quick login buttons for each user
- Shows name and email preview
- One-click login functionality

📱 **Responsive**
- Works on desktop, tablet, and mobile
- Adaptive gradients for smaller screens

### Protected Routes
- Automatically redirects unauthenticated users to login
- Persistent login using localStorage
- Session persists on page reload

### Sidebar Enhancement
- Shows logged-in user info
- Avatar with initials
- Email display
- Sign Out button

---

## 🔧 Usage

### For Users
1. Open the dashboard
2. See the beautiful login page
3. Enter email and password (or click demo account)
4. After login, user info appears in sidebar
5. Click "Sign Out" to logout

### For Developers
```tsx
// Get auth state in any component
import { useAuth } from './context/AuthContext';

function MyComponent() {
  const { user, isAuthenticated, login, logout } = useAuth();
  
  // Use these functions...
}
```

---

## 🎨 Customization

### Change Colors
Edit `Login.css` color variables:
```css
.login-header h1 {
  background: linear-gradient(135deg, #60a5fa, #a78bfa);
}
```

### Modify Allowed Users
Edit `AuthContext.tsx`:
```tsx
const VALID_USERS = [
  'emerson.thomas@excevo.co.uk',
  'fabian.hutton@excevo.co.uk',
  'jaswanth.lal@excevo.co.uk',
  'simon.kay@excevo.co.uk',
  // Add more emails here
];
```

### Change Password
Edit `AuthContext.tsx`:
```tsx
const VALID_PASSWORD = 'your-new-password';
```

---

## 🔮 Next Steps: SharePoint Integration

Once authentication is working, we'll add:
1. SharePoint data fetching in backend
2. API endpoint to retrieve Excel files
3. Dashboard data sync from SharePoint
4. Automatic refresh mechanisms

---

## 📝 Notes

- Password is stored in frontend code (for development only)
- For production, integrate with Microsoft Azure AD
- User sessions persist in browser localStorage
- Passwords should never be hardcoded in production
- Consider adding refresh token mechanism for real auth

---

## 🐛 Troubleshooting

**Login not working?**
- Check email is in VALID_USERS list
- Verify password is exactly "password"
- Check browser console for errors

**Styles not loading?**
- Ensure CSS files are imported in components
- Check file paths are correct
- Verify node_modules has all dependencies

**User info not persisting?**
- Check localStorage is enabled
- Verify AuthProvider wraps entire app
- Check browser console for errors

---

**Need help?** Check your console for detailed error messages or increase logging in AuthContext.tsx
