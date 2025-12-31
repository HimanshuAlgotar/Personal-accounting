#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime
import os

class LedgerOSAPITester:
    def __init__(self, base_url="https://cashflow-manager-66.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []
        self.setup_required = True

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
            data={"password": "test123"}
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
            data={"password": "test123"}
        )
        if success and 'token' in response:
            self.token = response['token']
            print(f"   Token received: {self.token[:20]}...")
            return True
        return False

    def test_ledgers(self):
        """Test ledger operations"""
        print("\n=== LEDGER TESTS ===")
        
        # Get ledgers
        success, ledgers = self.run_test(
            "Get Ledgers",
            "GET",
            "ledgers",
            200
        )
        if not success:
            return False
        
        print(f"   Found {len(ledgers)} default ledgers")
        
        # Create a bank ledger
        success, bank_ledger = self.run_test(
            "Create Bank Ledger",
            "POST",
            "ledgers",
            200,
            data={
                "name": "Test Bank Account",
                "type": "asset",
                "category": "bank",
                "description": "Test bank account",
                "opening_balance": 10000.0
            }
        )
        if not success:
            return False
        
        self.bank_ledger_id = bank_ledger.get('id')
        print(f"   Bank ledger ID: {self.bank_ledger_id}")
        
        # Get specific ledger
        success, _ = self.run_test(
            "Get Specific Ledger",
            "GET",
            f"ledgers/{self.bank_ledger_id}",
            200
        )
        
        return success

    def test_transactions(self):
        """Test transaction operations"""
        print("\n=== TRANSACTION TESTS ===")
        
        if not hasattr(self, 'bank_ledger_id'):
            print("❌ No bank ledger available for transaction tests")
            return False
        
        # Create a transaction
        success, transaction = self.run_test(
            "Create Transaction",
            "POST",
            "transactions",
            200,
            data={
                "date": "2024-01-15",
                "description": "Test transaction",
                "amount": 500.0,
                "transaction_type": "debit",
                "ledger_id": self.bank_ledger_id,
                "tag": "personal_expense",
                "notes": "Test transaction"
            }
        )
        if not success:
            return False
        
        self.transaction_id = transaction.get('id')
        print(f"   Transaction ID: {self.transaction_id}")
        
        # Get transactions
        success, transactions = self.run_test(
            "Get Transactions",
            "GET",
            "transactions",
            200
        )
        if not success:
            return False
        
        print(f"   Found {len(transactions)} transactions")
        
        # Test bulk tagging
        success, _ = self.run_test(
            "Bulk Tag Transactions",
            "POST",
            "transactions/bulk-tag",
            200,
            data={
                "transaction_ids": [self.transaction_id],
                "tag": "test_tag"
            }
        )
        
        return success

    def test_loans(self):
        """Test loan operations"""
        print("\n=== LOAN TESTS ===")
        
        # Create a loan
        success, loan = self.run_test(
            "Create Loan",
            "POST",
            "loans",
            200,
            data={
                "person_name": "John Doe",
                "loan_type": "given",
                "principal": 5000.0,
                "interest_rate": 12.0,
                "start_date": "2024-01-01",
                "notes": "Test loan"
            }
        )
        if not success:
            return False
        
        self.loan_id = loan.get('id')
        print(f"   Loan ID: {self.loan_id}")
        
        # Get loans
        success, loans = self.run_test(
            "Get Loans",
            "GET",
            "loans",
            200
        )
        if not success:
            return False
        
        print(f"   Found {len(loans)} loans")
        
        # Record repayment
        success, _ = self.run_test(
            "Record Loan Repayment",
            "POST",
            "loans/repayment",
            200,
            data={
                "loan_id": self.loan_id,
                "amount": 1000.0,
                "date": "2024-01-15",
                "is_interest": False,
                "notes": "Test repayment"
            }
        )
        
        return success

    def test_bank_upload(self):
        """Test bank statement upload"""
        print("\n=== BANK UPLOAD TESTS ===")
        
        if not hasattr(self, 'bank_ledger_id'):
            print("❌ No bank ledger available for upload tests")
            return False
        
        # Check if sample file exists
        sample_file = "/app/hdfc_sample.xls"
        if not os.path.exists(sample_file):
            print("⏭️  Skipping upload test - no sample file")
            return True
        
        try:
            with open(sample_file, 'rb') as f:
                files = {'file': ('hdfc_sample.xls', f, 'application/vnd.ms-excel')}
                success, response = self.run_test(
                    "Upload Bank Statement",
                    "POST",
                    f"upload/bank-statement?ledger_id={self.bank_ledger_id}",
                    200,
                    files=files
                )
                
                if success:
                    transactions = response.get('transactions', [])
                    print(f"   Parsed {len(transactions)} transactions")
                    
                    if transactions:
                        # Test saving transactions
                        success, _ = self.run_test(
                            "Save Uploaded Transactions",
                            "POST",
                            "upload/save-transactions",
                            200,
                            data=transactions[:5]  # Save first 5 transactions
                        )
                        return success
                
                return success
        except Exception as e:
            self.log_result("Upload Bank Statement", False, str(e))
            return False

    def test_reports(self):
        """Test report endpoints"""
        print("\n=== REPORT TESTS ===")
        
        # Dashboard
        success, dashboard = self.run_test(
            "Get Dashboard",
            "GET",
            "reports/dashboard",
            200
        )
        if not success:
            return False
        
        print(f"   Net worth: ₹{dashboard.get('net_worth', 0):,.2f}")
        
        # Balance sheet
        success, balance_sheet = self.run_test(
            "Get Balance Sheet",
            "GET",
            "reports/balance-sheet",
            200
        )
        if not success:
            return False
        
        print(f"   Total assets: ₹{balance_sheet.get('total_assets', 0):,.2f}")
        
        # Income/Expense
        success, income_expense = self.run_test(
            "Get Income/Expense Report",
            "GET",
            "reports/income-expense",
            200
        )
        
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
        except Exception as e:
            self.log_result("Export Transactions", False, str(e))
            success = False
        
        # Test balance sheet export
        url = f"{self.base_url}/api/export/balance-sheet?token={self.token}"
        try:
            response = requests.get(url)
            success2 = response.status_code == 200
            self.log_result("Export Balance Sheet", success2,
                          f"Status: {response.status_code}" if not success2 else "")
            
            if success2:
                print(f"   Export size: {len(response.content)} bytes")
        except Exception as e:
            self.log_result("Export Balance Sheet", False, str(e))
            success2 = False
        
        return success and success2

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
                "current_password": "test123",
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
        
        return success

    def run_all_tests(self):
        """Run all tests"""
        print("🚀 Starting LedgerOS API Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 50)
        
        # Test sequence
        tests = [
            self.test_auth_check,
            self.test_password_setup,
            self.test_login,
            self.test_ledgers,
            self.test_transactions,
            self.test_loans,
            self.test_bank_upload,
            self.test_reports,
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
        print("\n" + "=" * 50)
        print("📊 TEST SUMMARY")
        print("=" * 50)
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
    tester = LedgerOSAPITester()
    results = tester.run_all_tests()
    
    # Return appropriate exit code
    return 0 if results["success_rate"] >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())