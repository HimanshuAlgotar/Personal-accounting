# LedgerOS - Personal Accounting Software

## Original Problem Statement
Personal accounting software for tracking:
- Loan income/expenses with interest (bank loans, personal loans as ledgers)
- HDFC bank statement upload with inline tagging and auto-tagging for repeated transactions
- Other investments (gym, etc.) tracking
- Credit cards and bank OD tracking
- Reports: Assets/Liabilities, Income/Expenses

## Architecture
- **Frontend**: React with Shadcn UI, TailwindCSS, Recharts
- **Backend**: FastAPI (Python)
- **Database**: MongoDB
- **Auth**: Simple password protection (SHA256 hash)

## User Personas
- Finance-heavy individual user who hates clutter
- Needs full control over personal money
- Ledger-based accounting approach
- Works with bank + cash + personal loans

## Core Requirements (Static)
1. ✅ Simple password authentication
2. ✅ Ledger management (bank, cash, loan, investment categories)
3. ✅ HDFC bank statement import (XLS/XLSX)
4. ✅ Transaction tagging with bulk actions
5. ✅ Auto-tagging for repeated transactions (pattern matching)
6. ✅ Personal loans tracking (given/taken with interest)
7. ✅ Cash book management
8. ✅ Balance Sheet report (Assets & Liabilities)
9. ✅ Income/Expense report with charts
10. ✅ Excel export functionality
11. ✅ INR currency formatting

## What's Been Implemented (December 2025)

### Backend APIs
- `/api/auth/*` - Password setup, login, logout, change password
- `/api/ledgers/*` - CRUD for ledgers with type/category filtering
- `/api/transactions/*` - CRUD, bulk tagging, filtering
- `/api/upload/*` - HDFC bank statement parsing, save transactions
- `/api/loans/*` - Loan management with repayments
- `/api/reports/*` - Dashboard, Balance Sheet, Income/Expense
- `/api/export/*` - Excel export for transactions and balance sheet
- `/api/tag-patterns` - Auto-tagging pattern management

### Frontend Pages
1. **Login** - Password setup/unlock with dark theme
2. **Dashboard** - Net worth, balances, metrics, recent transactions
3. **Bank Upload** - Drag & drop XLS upload, inline tagging, bulk actions
4. **Transactions** - Full transaction list with filters (ledger, tag, date, untagged)
5. **Ledgers** - Create/edit ledgers with categories (bank, cash, loans, etc.)
6. **Loans** - Loan tracking with repayment recording
7. **Cash Book** - Manual cash entries with categorization
8. **Reports** - Balance Sheet + Income/Expense with Recharts
9. **Settings** - Password change, data export

### Design
- Dark "Control Room" theme (Slate-950 base)
- Typography: Chivo (headings), Manrope (body), JetBrains Mono (currency)
- Sharp corners, no shadows, border-based hierarchy
- Color coding: Emerald (income/assets), Rose (expense/liabilities), Indigo (primary)

## Prioritized Backlog

### P0 - Done in MVP
- [x] Password auth
- [x] Ledger CRUD
- [x] Bank statement upload (HDFC XLS)
- [x] Transaction tagging
- [x] Auto-tagging patterns
- [x] Loans tracking
- [x] Cash book
- [x] Balance Sheet
- [x] Income/Expense report
- [x] Excel export

### P1 - Next Phase
- [ ] Support for other bank formats (ICICI, SBI, Axis)
- [ ] Credit card statement import
- [ ] Monthly/yearly trend charts
- [ ] Budget planning and alerts
- [ ] Recurring transactions

### P2 - Future
- [ ] Investment portfolio tracking
- [ ] Tax calculation helpers
- [ ] Multi-currency support
- [ ] Data backup/restore
- [ ] Mobile responsive improvements

## Next Tasks
1. Add support for more bank statement formats
2. Implement credit card tracking with due date reminders
3. Add monthly spending trends visualization
4. Create investment portfolio module
5. Add data backup/export to JSON

## Login Credentials
Password: admin123 (user can change in Settings)
