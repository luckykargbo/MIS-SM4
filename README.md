# LUSL MIS - Institutional Management System



<img width="1883" height="850" alt="screencapture-localhost-3000-login-2026-06-19-12_00_39 (1)" src="https://github.com/user-attachments/assets/9fbb8363-3c7b-4b81-a55e-ca702100f7a6" />



## 🚀 Setup Instructions

1.  **Database**: Run the [schema.sql](./schema.sql) in your Supabase SQL Editor.
2.  **Dependencies**: Due to network issues, if `npm install` fails, try running:
    ```bash
    npm install --legacy-peer-deps --prefer-offline
    ```
3.  **Launch**:
    ```bash
    npm run dev
    ```

## 🔐 Security Features
- **Admin Blind Spot**: Admins cannot see financial data due to RLS policies.
- **OTP Gateway**: Multi-step login with 15-minute account lockout.
- **Privacy Masking**: All sensitive data is hidden behind an "eye icon" toggle.

## 📁 Source Code
*   **Auth Gateway**: `src/app/login/page.js`
*   **Dashboard Controller**: `src/app/dashboard/page.js`
*   **Masking UI**: `src/components/ui/MaskedData.js`
*   **Admin Panel**: `src/components/Dashboard/AdminPanel.js`
*   **Finance Panel**: `src/components/Dashboard/FinancePanel.js`
