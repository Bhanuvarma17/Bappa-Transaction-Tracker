# Bappa Transaction Tracker

Bappa Transaction Tracker is a lightweight finance and expense management web application designed for Vinayaka Chavithi committees.

Committee leaders can create a public committee profile, set their available budget, record and organize expenses, track remaining funds, and share their committee's finances through a simple public URL.

### Key Features

* 🔐 User registration and login (Email or Committee Username)
* 🛡️ Authenticated "Change Password" in committee settings with PBKDF2 hashing and session invalidation
* 👤 Unique committee profiles with custom usernames (e.g. `/SBVMB-Youth`)
* 💰 Budget/capital tracking
* 🧾 Add, edit, delete and reorder expenses
* 📊 Remaining budget visualization
* 🔗 Shareable public committee profiles
* 📱 Mobile-first public pages
* 🛡️ Server-side ownership and authorization checks
* 💾 Persistent data across logout and browser restarts
* 🚫 Maximum of 90 expenses per committee

### Password Management

The application features authenticated password management for committee leaders:

1. Log into your committee dashboard with your email/username and password.
2. Open **"Edit Committee Profile"** or account settings.
3. In the **"Change Password"** section:
   - Provide your current active password.
   - Enter your new secure password (minimum 8 characters, containing letters and numbers).
   - Confirm the new password.
4. Upon successful password change, passwords are encrypted with PBKDF2 with unique cryptographic salts, and all other active sessions are automatically invalidated for security.

### Example

A committee can have a public profile such as:

`/SBVMB-Youth`

Visitors can view the committee's profile, budget information and expenses without creating an account.

