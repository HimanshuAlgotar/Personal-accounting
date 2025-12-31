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

### Iteration 2 Updates
- ✅ **Light Theme**: Clean professional light theme throughout
- ✅ **Transaction Edit**: Edit button on each transaction row with modal
- ✅ **Ledger Detail View**: Click any ledger to see transactions in side panel
- ✅ **Interest Calculation**: Auto-calculates accrued interest (simple/compound)
- ✅ **Search**: Search box in transactions page
- ✅ **Edit Cash Entries**: Edit functionality in Cash Book

### Backend APIs
- `/api/auth/*` - Password setup, login, logout, change password
- `/api/ledgers/*` - CRUD for ledgers with type/category filtering
- `/api/transactions/*` - CRUD, bulk tagging, filtering, edit
- `/api/upload/*` - HDFC bank statement parsing, save transactions
- `/api/loans/*` - Loan management with repayments + interest calculation
- `/api/loans/{id}/interest` - Calculate accrued interest (simple/compound)
- `/api/reports/*` - Dashboard, Balance Sheet, Income/Expense
- `/api/export/*` - Excel export for transactions and balance sheet

### Frontend Pages
1. **Login** - Password setup/unlock with light theme
2. **Dashboard** - Net worth, balances, metrics, recent transactions
3. **Bank Upload** - Drag & drop XLS upload, inline tagging, bulk actions
4. **Transactions** - Full list with search, filters, edit/delete per row
5. **Ledgers** - Create/edit ledgers, click to see transactions in side panel
6. **Loans** - Loan tracking with auto-calculated interest display
7. **Cash Book** - Manual cash entries with edit/delete
8. **Reports** - Balance Sheet + Income/Expense with Recharts
9. **Settings** - Password change, data export

### Design
- Light "Clean Professional" theme
- Typography: Manrope (headings/body), JetBrains Mono (currency)
- Color coding: Emerald (income/assets), Rose (expense/liabilities), Blue (primary)
- Cards with subtle shadows on hover
- Side panel for ledger detail view

## Prioritized Backlog

### P0 - Done in MVP
- [x] Password auth
- [x] Ledger CRUD
- [x] Bank statement upload (HDFC XLS)
- [x] Transaction tagging + edit
- [x] Auto-tagging patterns
- [x] Loans tracking with interest calc
- [x] Cash book with edit
- [x] Balance Sheet
- [x] Income/Expense report
- [x] Excel export
- [x] Light theme
- [x] Ledger detail view with transactions

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

## Login Credentials
Password: admin123 (user can change in Settings)
