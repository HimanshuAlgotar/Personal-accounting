#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import os

class PersonalAccountingAPITester:
    def __init__(self, base_url="https://fintrack-572.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.setup_required = True
        
        # Store created IDs for testing
        self.bank_account_id = None
        self.cash_account_id = None
        self.loan_account_id = None
        self.expense_category_id = None
        self.income_category_id = None
        self.sub_category_id = None
        self.transaction_id = None

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {details}")
            self.failed_tests.append({"test": test_name, "error": details})

    def run_test(self, name, method, endpoint, expected_status, data=None, files=None):
        """Run a single API test"""
        url = f"{self.base_url}/api/{endpoint}"
        headers = {}
        
        if files is None:
            headers['Content-Type'] = 'application/json'
        
        if self.token:
            url += f"?token={self.token}" if "?" not in url else f"&token={self.token}"

        print(f"\n🔍 Testing {name}...")
        print(f"   URL: {url}")
        
        try:
            if method == 'GET':
                response = requests.get(url, headers=headers)
            elif method == 'POST':
                if files:
                    response = requests.post(url, files=files)
                else:
                    response = requests.post(url, json=data, headers=headers)
            elif method == 'PUT':
                response = requests.put(url, json=data, headers=headers)
            elif method == 'DELETE':
                response = requests.delete(url, headers=headers)

            print(f"   Status: {response.status_code}")
            
            success = response.status_code == expected_status
            if success:
                self.log_result(name, True)
                try:
                    return True, response.json()
                except:
                    return True, {}
            else:
                error_msg = f"Expected {expected_status}, got {response.status_code}"
                try:
                    error_detail = response.json().get('detail', '')
                    if error_detail:
                        error_msg += f" - {error_detail}"
                except:
                    pass
                self.log_result(name, False, error_msg)
                return False, {}

        except Exception as e:
            self.log_result(name, False, str(e))
            return False, {}

    def test_auth_check(self):
        """Test if setup is required"""
        print("\n=== AUTHENTICATION TESTS ===")
        success, response = self.run_test(
            "Auth Check",
            "GET",
            "auth/check",
            200
        )
        if success:
            self.setup_required = response.get('setup_required', True)
            print(f"   Setup required: {self.setup_required}")
        return success

    def test_password_setup(self):
        """Test password setup"""
        if not self.setup_required:
            print("⏭️  Skipping setup - already configured")
            return True
            
        success, response = self.run_test(
            "Password Setup",
            "POST",
            "auth/setup",
            200,
            data={"password": "admin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_login(self):
        """Test login"""
        if self.setup_required:
            print("⏭️  Skipping login - setup was required")
            return True
            
        success, response = self.run_test(
            "Login",
            "POST",
            "auth/login",
            200,
            data={"password": "admin123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_categories(self):
        """Test category operations"""
        print("\n=== CATEGORIES TESTS ===")
        
        # Get expense categories (should be hierarchical)
        success, categories = self.run_test(
            "Get Expense Categories (Hierarchical)",
            "GET",
            "categories?type=expense",
            200
        )
        if not success:
            return False
        
        print(f"   Found {len(categories)} parent expense categories")
        
        # Check for hierarchical structure
        has_children = False
        for cat in categories:
            if cat.get('children') and len(cat['children']) > 0:
                has_children = True
                print(f"   Category '{cat['name']}' has {len(cat['children'])} sub-categories")
                break
        
        if not has_children:
            print("   ⚠️  No hierarchical structure found in categories")
        
        # Get flat categories
        success, flat_categories = self.run_test(
            "Get Categories (Flat)",
            "GET",
            "categories/flat?type=expense",
            200
        )
        if not success:
            return False
        
        print(f"   Found {len(flat_categories)} total expense categories (flat)")
        
        # Get income categories
        success, income_categories = self.run_test(
            "Get Income Categories",
            "GET",
            "categories?type=income",
            200
        )
        if not success:
            return False
        
        print(f"   Found {len(income_categories)} income categories")
        
        # Create a new expense category
        success, new_category = self.run_test(
            "Create New Expense Category",
            "POST",
            "categories",
            200,
            data={
                "name": "Test Expense Category",
                "type": "expense",
                "icon": "test",
                "color": "#ff0000"
            }
        )
        if success:
            self.expense_category_id = new_category.get('id')
            print(f"   Created category ID: {self.expense_category_id}")
        
        # Create a sub-category
        if self.expense_category_id:
            success, sub_category = self.run_test(
                "Create Sub-Category",
                "POST",
                "categories",
                200,
                data={
                    "name": "Test Sub-Category",
                    "parent_id": self.expense_category_id,
                    "type": "expense",
                    "icon": "sub-test",
                    "color": "#00ff00"
                }
            )
            if success:
                self.sub_category_id = sub_category.get('id')
                print(f"   Created sub-category ID: {self.sub_category_id}")
        
        return success

    def test_accounts(self):
        """Test account operations"""
        print("\n=== ACCOUNTS TESTS ===")
        
        # Get all accounts
        success, accounts = self.run_test(
            "Get All Accounts",
            "GET",
            "accounts",
            200
        )
        if not success:
            return False
        
        print(f"   Found {len(accounts)} existing accounts")
        
        # Create a bank account
        success, bank_account = self.run_test(
            "Create Bank Account",
            "POST",
            "accounts",
            200,
            data={
                "name": "Test Bank Account",
                "account_type": "bank",
                "opening_balance": 50000.0,
                "description": "Test bank account for API testing"
            }
        )
        if success:
            self.bank_account_id = bank_account.get('id')
            print(f"   Bank account ID: {self.bank_account_id}")
        
        # Create a loan receivable account
        success, loan_account = self.run_test(
            "Create Loan Receivable Account",
            "POST",
            "accounts",
            200,
            data={
                "name": "Loan to John Doe",
                "account_type": "loan_receivable",
                "opening_balance": 10000.0,
                "description": "Loan given to John Doe",
                "person_name": "John Doe"
            }
        )
        if success:
            self.loan_account_id = loan_account.get('id')
            print(f"   Loan account ID: {self.loan_account_id}")
        
        # Get specific account
        if self.bank_account_id:
            success, account_detail = self.run_test(
                "Get Specific Account",
                "GET",
                f"accounts/{self.bank_account_id}",
                200
            )
            if success:
                print(f"   Account balance: ₹{account_detail.get('current_balance', 0):,.2f}")
        
        # Update account
        if self.bank_account_id:
            success, updated_account = self.run_test(
                "Update Account",
                "PUT",
                f"accounts/{self.bank_account_id}",
                200,
                data={
                    "name": "Updated Test Bank Account",
                    "account_type": "bank",
                    "opening_balance": 55000.0,
                    "description": "Updated test bank account"
                }
            )
        
        return success

    def test_transactions(self):
        """Test transaction operations"""
        print("\n=== TRANSACTIONS TESTS ===")
        
        if not self.bank_account_id:
            print("❌ No bank account available for transaction tests")
            return False
        
        # Create an expense transaction
        success, expense_txn = self.run_test(
            "Create Expense Transaction",
            "POST",
            "transactions",
            200,
            data={
                "date": "2024-01-15",
                "description": "Test grocery shopping",
                "amount": 2500.0,
                "account_id": self.bank_account_id,
                "category_id": self.expense_category_id,
                "transaction_type": "expense",
                "reference": "TEST001",
                "notes": "Test expense transaction"
            }
        )
        if success:
            self.transaction_id = expense_txn.get('id')
            print(f"   Expense transaction ID: {self.transaction_id}")
        
        # Create an income transaction
        success, income_txn = self.run_test(
            "Create Income Transaction",
            "POST",
            "transactions",
            200,
            data={
                "date": "2024-01-16",
                "description": "Test salary credit",
                "amount": 75000.0,
                "account_id": self.bank_account_id,
                "transaction_type": "income",
                "reference": "SAL001",
                "notes": "Test income transaction"
            }
        )
        
        # Create a transfer transaction (if we have loan account)
        if self.loan_account_id:
            success, transfer_txn = self.run_test(
                "Create Transfer Transaction",
                "POST",
                "transactions",
                200,
                data={
                    "date": "2024-01-17",
                    "description": "Transfer to loan account",
                    "amount": 5000.0,
                    "account_id": self.bank_account_id,
                    "payee_id": self.loan_account_id,
                    "transaction_type": "transfer",
                    "reference": "TRF001",
                    "notes": "Test transfer transaction"
                }
            )
        
        # Get all transactions
        success, transactions = self.run_test(
            "Get All Transactions",
            "GET",
            "transactions",
            200
        )
        if success:
            print(f"   Found {len(transactions)} transactions")
        
        # Get transactions for specific account
        if self.bank_account_id:
            success, account_transactions = self.run_test(
                "Get Account Transactions",
                "GET",
                f"transactions?account_id={self.bank_account_id}",
                200
            )
            if success:
                print(f"   Found {len(account_transactions)} transactions for bank account")
        
        # Update transaction
        if self.transaction_id and self.sub_category_id:
            success, updated_txn = self.run_test(
                "Update Transaction Category",
                "PUT",
                f"transactions/{self.transaction_id}",
                200,
                data={
                    "category_id": self.sub_category_id,
                    "notes": "Updated transaction with sub-category"
                }
            )
        
        return success

    def test_reports(self):
        """Test report endpoints"""
        print("\n=== REPORTS TESTS ===")
        
        # Dashboard report
        success, dashboard = self.run_test(
            "Get Dashboard Report",
            "GET",
            "reports/dashboard",
            200
        )
        if not success:
            return False
        
        print(f"   Net worth: ₹{dashboard.get('net_worth', 0):,.2f}")
        print(f"   Bank balance: ₹{dashboard.get('bank_balance', 0):,.2f}")
        print(f"   Cash balance: ₹{dashboard.get('cash_balance', 0):,.2f}")
        print(f"   Loans receivable: ₹{dashboard.get('loans_receivable', 0):,.2f}")
        print(f"   Monthly income: ₹{dashboard.get('monthly_income', 0):,.2f}")
        print(f"   Monthly expense: ₹{dashboard.get('monthly_expense', 0):,.2f}")
        
        recent_transactions = dashboard.get('recent_transactions', [])
        print(f"   Recent transactions: {len(recent_transactions)}")
        
        # Income-Expense report
        success, income_expense = self.run_test(
            "Get Income-Expense Report",
            "GET",
            "reports/income-expense",
            200
        )
        if not success:
            return False
        
        income_by_category = income_expense.get('income_by_category', {})
        expense_by_category = income_expense.get('expense_by_category', {})
        
        print(f"   Income categories: {len(income_by_category)}")
        print(f"   Expense categories: {len(expense_by_category)}")
        print(f"   Total income: ₹{income_expense.get('total_income', 0):,.2f}")
        print(f"   Total expense: ₹{income_expense.get('total_expense', 0):,.2f}")
        print(f"   Net income: ₹{income_expense.get('net_income', 0):,.2f}")
        
        # Check for hierarchical category display
        hierarchical_found = False
        for cat_name in expense_by_category.keys():
            if ' > ' in cat_name:
                hierarchical_found = True
                print(f"   Found hierarchical category: {cat_name}")
                break
        
        if not hierarchical_found:
            print("   ⚠️  No hierarchical categories found in expense report")
        
        # Balance sheet report
        success, balance_sheet = self.run_test(
            "Get Balance Sheet Report",
            "GET",
            "reports/balance-sheet",
            200
        )
        if success:
            print(f"   Total assets: ₹{balance_sheet.get('total_assets', 0):,.2f}")
            print(f"   Total liabilities: ₹{balance_sheet.get('total_liabilities', 0):,.2f}")
        
        return success

    def test_loans(self):
        """Test loan operations"""
        print("\n=== LOANS TESTS ===")
        
        # Create a loan
        success, loan = self.run_test(
            "Create Loan",
            "POST",
            "loans",
            200,
            data={
                "person_name": "Jane Smith",
                "loan_type": "given",
                "principal": 25000.0,
                "interest_rate": 10.0,
                "start_date": "2024-01-01",
                "notes": "Test loan for API testing"
            }
        )
        if not success:
            return False
        
        loan_id = loan.get('id')
        print(f"   Loan ID: {loan_id}")
        
        # Get all loans
        success, loans = self.run_test(
            "Get All Loans",
            "GET",
            "loans",
            200
        )
        if success:
            print(f"   Found {len(loans)} loans")
        
        # Calculate loan interest
        if loan_id:
            success, interest_calc = self.run_test(
                "Calculate Loan Interest",
                "GET",
                f"loans/{loan_id}/interest?as_of_date=2024-01-31",
                200
            )
            if success:
                print(f"   Accrued interest: ₹{interest_calc.get('accrued_interest', 0):,.2f}")
                print(f"   Total due: ₹{interest_calc.get('total_due', 0):,.2f}")
        
        return success

    def test_exports(self):
        """Test export endpoints"""
        print("\n=== EXPORT TESTS ===")
        
        # Test transaction export
        url = f"{self.base_url}/api/export/transactions?token={self.token}"
        try:
            response = requests.get(url)
            success = response.status_code == 200
            self.log_result("Export Transactions", success, 
                          f"Status: {response.status_code}" if not success else "")
            
            if success:
                print(f"   Export size: {len(response.content)} bytes")
                # Check if it's actually an Excel file
                if response.headers.get('content-type') == 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':
                    print("   ✅ Correct Excel content type")
                else:
                    print(f"   ⚠️  Unexpected content type: {response.headers.get('content-type')}")
        except Exception as e:
            self.log_result("Export Transactions", False, str(e))
            success = False
        
        return success

    def test_settings(self):
        """Test settings/password change"""
        print("\n=== SETTINGS TESTS ===")
        
        # Test password change
        success, _ = self.run_test(
            "Change Password",
            "POST",
            "auth/change-password",
            200,
            data={
                "current_password": "admin123",
                "new_password": "newtest123"
            }
        )
        
        if success:
            # Test login with new password
            success2, response = self.run_test(
                "Login with New Password",
                "POST",
                "auth/login",
                200,
                data={"password": "newtest123"}
            )
            
            if success2 and 'token' in response:
                self.token = response['token']
                print(f"   New token received: {self.token[:20]}...")
                
                # Change password back to original
                success3, _ = self.run_test(
                    "Restore Original Password",
                    "POST",
                    "auth/change-password",
                    200,
                    data={
                        "current_password": "newtest123",
                        "new_password": "admin123"
                    }
                )
                return success3
        
        return success

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting Personal Accounting API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test sequence
        tests = [
            self.test_auth_check,
            self.test_password_setup,
            self.test_login,
            self.test_categories,
            self.test_accounts,
            self.test_transactions,
            self.test_reports,
            self.test_loans,
            self.test_exports,
            self.test_settings,
        ]
        
        for test in tests:
            try:
                if not test():
                    print(f"\n⚠️  Test {test.__name__} failed, continuing...")
            except Exception as e:
                print(f"\n💥 Test {test.__name__} crashed: {e}")
                self.log_result(test.__name__, False, str(e))
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print("\n🔍 FAILED TESTS:")
            for failure in self.failed_tests:
                print(f"   • {failure['test']}: {failure['error']}")
        
        success_rate = (self.tests_passed / self.tests_run * 100) if self.tests_run > 0 else 0
        print(f"\n📈 Success rate: {success_rate:.1f}%")
        
        return {
            "total_tests": self.tests_run,
            "passed_tests": self.tests_passed,
            "failed_tests": self.failed_tests,
            "success_rate": success_rate
        }

def main():
    """Main function"""
    tester = PersonalAccountingAPITester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if results["success_rate"] >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())