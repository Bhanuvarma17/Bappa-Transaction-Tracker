# Bappa Transaction Tracker

Bappa Transaction Tracker is a lightweight finance and expense management web application designed for Vinayaka Chavithi committees.

Committee leaders can create a public committee profile, set their available budget, record and organize expenses, track remaining funds, and share their committee's finances through a simple public URL.

### Key Features

* 🔐 User registration and login
* 🔑 Secure password recovery via 6-digit email OTP (hashed, 10-minute expiry, single-use, rate-limited)
* 🛡️ Authenticated "Change Password" in committee settings with server-side validation
* 👤 Unique committee profiles
* 💰 Budget/capital tracking
* 🧾 Add, edit, delete and reorder expenses
* 📊 Remaining budget visualization
* 🔗 Shareable public committee profiles
* 📱 Mobile-first public pages
* 🛡️ Server-side ownership and authorization checks
* 💾 Persistent data across logout and browser restarts
* 🚫 Maximum of 90 expenses per committee

### Password Recovery & Email Configuration

The application includes an email OTP verification system for forgotten passwords:

1. Click **"Forgot Password?"** on the Sign In page.
2. Enter the registered committee email address.
3. Receive a 6-digit OTP code (valid for 10 minutes, single-use).
4. Enter the code and set a new, strong password.
5. All prior active sessions are automatically invalidated upon password reset.

#### Configuring Live Email Delivery (SMTP)

To send real verification emails, add your SMTP credentials to `.env`:

```env
SMTP_HOST="smtp.gmail.com"
SMTP_PORT=587
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_SECURE=false
EMAIL_FROM="Bappa Transaction Tracker <noreply@yourdomain.com>"
```

*Note: If no SMTP credentials are configured, the app runs in development mode and safely records simulated email deliveries to `data/dev_mailbox.json` without logging OTP secrets to stdout.*

### Example

A committee can have a public profile such as:

`/SBVMB-Youth`

Visitors can view the committee's profile, budget information and expenses without creating an account.

