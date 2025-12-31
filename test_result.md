# Test Plan for Personal Accounting App - Architectural Rebuild

## Application Context
This is a personal accounting software with:
- Hierarchical categories (Personal > Uber, Food > Restaurants etc.)
- Accounts (Bank, Cash, Loans Receivable/Payable)
- Double-entry transactions with proper linking
- Bank statement upload with tagging

## Credentials
- Password: admin123

## Features to Test

### 1. Dashboard
- Check net worth displays correctly
- Recent transactions shown
- All metrics (Bank Balance, Cash, Loans) display

### 2. Accounts Page
- Create new bank account
- Create loan receivable account with person name
- Edit account
- Delete account
- View account transactions on click

### 3. Categories Page  
- View expense categories (should have Personal, Food & Dining, etc.)
- View income categories
- Create new parent category
- Create sub-category under existing parent
- Edit category
- Delete category

### 4. Add Entry Page
- Record expense with category
- Record expense with sub-category
- Record income
- Record transfer between accounts (Bank → Loan)
- Create new category inline

### 5. Bank Upload Page
- Select bank account from dropdown
- Upload would require actual file - SKIP
- Check UI is clean (no black dropdowns)

### 6. Transactions Page
- View all transactions
- Filter by account
- Filter by category
- Search transactions
- Edit transaction
- Delete transaction
- Bulk tag transactions

### 7. Settings Page
- Change password
- Export transactions
- Reset all data dialog shows

## URL
Use http://localhost:3000 for testing

## Known Issues
None currently - fresh rebuild
