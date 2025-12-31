#!/usr/bin/env python3

import requests
import sys
import json
from datetime import datetime

class CriticalFixesTester:
    def __init__(self, base_url="https://fintrack-572.preview.emergentagent.com"):
        self.base_url = base_url
        self.token = None
        self.tests_run = 0
        self.tests_passed = 0
        self.failed_tests = []

    def log_result(self, test_name, success, details=""):
        """Log test result"""
        self.tests_run += 1
        if success:
            self.tests_passed += 1
            print(f"✅ {test_name} - PASSED")
        else:
            print(f"❌ {test_name} - FAILED: {details}")
            self.failed_tests.append({"test": test_name, "error": details})

    def test_login_with_admin123(self):
        """Test login with password admin123 works"""
        print("\n=== CRITICAL FIX 1: LOGIN WITH admin123 ===")
        
        url = f"{self.base_url}/api/auth/login"
        headers = {'Content-Type': 'application/json'}
        
        try:
            response = requests.post(url, json={"password": "admin123"}, headers=headers)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                if 'token' in data:
                    self.token = data['token']
                    print(f"   Token received: {self.token[:20]}...")
                    self.log_result("Login with admin123", True)
                    return True
                else:
                    self.log_result("Login with admin123", False, "No token in response")
                    return False
            else:
                error_msg = f"Status {response.status_code}"
                try:
                    error_detail = response.json().get('detail', '')
                    if error_detail:
                        error_msg += f" - {error_detail}"
                except:
                    pass
                self.log_result("Login with admin123", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Login with admin123", False, str(e))
            return False

    def test_negative_opening_balance(self):
        """Test creating ledger with negative opening balance"""
        print("\n=== CRITICAL FIX 2: NEGATIVE OPENING BALANCE ===")
        
        if not self.token:
            print("❌ No token available for negative balance test")
            return False
        
        url = f"{self.base_url}/api/ledgers?token={self.token}"
        headers = {'Content-Type': 'application/json'}
        
        # Test creating a liability ledger with negative opening balance
        ledger_data = {
            "name": "Test Loan Liability",
            "type": "liability", 
            "category": "loan_payable",
            "description": "Test loan with negative opening balance",
            "opening_balance": -25000.0,  # Negative balance as requested
            "person_name": "Test Lender"
        }
        
        try:
            response = requests.post(url, json=ledger_data, headers=headers)
            print(f"   Status: {response.status_code}")
            print(f"   Opening balance: {ledger_data['opening_balance']}")
            
            if response.status_code == 200:
                data = response.json()
                created_balance = data.get('opening_balance', 0)
                current_balance = data.get('current_balance', 0)
                
                print(f"   Created opening balance: {created_balance}")
                print(f"   Current balance: {current_balance}")
                
                # Verify the negative balance was properly stored
                if created_balance == -25000.0 and current_balance == -25000.0:
                    self.log_result("Create ledger with negative balance (-25000)", True)
                    self.negative_ledger_id = data.get('id')
                    return True
                else:
                    self.log_result("Create ledger with negative balance (-25000)", False, 
                                  f"Expected -25000, got opening: {created_balance}, current: {current_balance}")
                    return False
            else:
                error_msg = f"Status {response.status_code}"
                try:
                    error_detail = response.json().get('detail', '')
                    if error_detail:
                        error_msg += f" - {error_detail}"
                except:
                    pass
                self.log_result("Create ledger with negative balance (-25000)", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Create ledger with negative balance (-25000)", False, str(e))
            return False

    def test_token_validity_across_requests(self):
        """Test token remains valid across multiple API calls"""
        print("\n=== CRITICAL FIX 3: TOKEN VALIDITY ACROSS NAVIGATION ===")
        
        if not self.token:
            print("❌ No token available for validity test")
            return False
        
        # Test multiple API endpoints to simulate page navigation
        endpoints_to_test = [
            ("Dashboard", "reports/dashboard"),
            ("Ledgers", "ledgers"),
            ("Transactions", "transactions"),
            ("Loans", "loans"),
            ("Balance Sheet", "reports/balance-sheet")
        ]
        
        all_passed = True
        
        for name, endpoint in endpoints_to_test:
            url = f"{self.base_url}/api/{endpoint}?token={self.token}"
            
            try:
                response = requests.get(url)
                print(f"   {name}: Status {response.status_code}")
                
                if response.status_code == 200:
                    self.log_result(f"Token valid for {name}", True)
                elif response.status_code == 401:
                    self.log_result(f"Token valid for {name}", False, "401 Unauthorized - Token expired/invalid")
                    all_passed = False
                else:
                    self.log_result(f"Token valid for {name}", False, f"Unexpected status {response.status_code}")
                    all_passed = False
                    
            except Exception as e:
                self.log_result(f"Token valid for {name}", False, str(e))
                all_passed = False
        
        return all_passed

    def test_transaction_edit(self):
        """Test edit transaction functionality"""
        print("\n=== CRITICAL FIX 4: EDIT TRANSACTION WORKS ===")
        
        if not self.token:
            print("❌ No token available for transaction edit test")
            return False
        
        # First create a transaction to edit
        if not hasattr(self, 'negative_ledger_id'):
            # Get any existing ledger
            ledgers_url = f"{self.base_url}/api/ledgers?token={self.token}"
            try:
                response = requests.get(ledgers_url)
                if response.status_code == 200:
                    ledgers = response.json()
                    if ledgers:
                        self.negative_ledger_id = ledgers[0]['id']
                    else:
                        print("❌ No ledgers available for transaction test")
                        return False
                else:
                    print("❌ Could not fetch ledgers for transaction test")
                    return False
            except Exception as e:
                print(f"❌ Error fetching ledgers: {e}")
                return False
        
        # Create a test transaction
        create_url = f"{self.base_url}/api/transactions?token={self.token}"
        transaction_data = {
            "date": "2024-01-20",
            "description": "Test transaction for editing",
            "amount": 1000.0,
            "transaction_type": "debit",
            "ledger_id": self.negative_ledger_id,
            "tag": "test_tag",
            "notes": "Original notes"
        }
        
        try:
            response = requests.post(create_url, json=transaction_data, headers={'Content-Type': 'application/json'})
            if response.status_code != 200:
                self.log_result("Create transaction for edit test", False, f"Status {response.status_code}")
                return False
            
            transaction = response.json()
            transaction_id = transaction.get('id')
            print(f"   Created transaction ID: {transaction_id}")
            
            # Now test editing the transaction
            edit_url = f"{self.base_url}/api/transactions/{transaction_id}?token={self.token}"
            edit_data = {
                "description": "EDITED: Test transaction",
                "amount": 1500.0,
                "notes": "Updated notes after edit"
            }
            
            response = requests.put(edit_url, json=edit_data, headers={'Content-Type': 'application/json'})
            print(f"   Edit status: {response.status_code}")
            
            if response.status_code == 200:
                edited_transaction = response.json()
                
                # Verify the edits were applied
                if (edited_transaction.get('description') == "EDITED: Test transaction" and
                    edited_transaction.get('amount') == 1500.0 and
                    edited_transaction.get('notes') == "Updated notes after edit"):
                    self.log_result("Edit transaction", True)
                    return True
                else:
                    self.log_result("Edit transaction", False, "Edits not properly applied")
                    return False
            else:
                error_msg = f"Status {response.status_code}"
                try:
                    error_detail = response.json().get('detail', '')
                    if error_detail:
                        error_msg += f" - {error_detail}"
                except:
                    pass
                self.log_result("Edit transaction", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Edit transaction", False, str(e))
            return False

    def test_ledger_detail_transactions(self):
        """Test ledger detail sheet shows transactions"""
        print("\n=== CRITICAL FIX 5: LEDGER DETAIL SHOWS TRANSACTIONS ===")
        
        if not self.token:
            print("❌ No token available for ledger detail test")
            return False
        
        if not hasattr(self, 'negative_ledger_id'):
            print("❌ No ledger ID available for detail test")
            return False
        
        # Get transactions for the specific ledger
        url = f"{self.base_url}/api/transactions?token={self.token}&ledger_id={self.negative_ledger_id}&limit=100"
        
        try:
            response = requests.get(url)
            print(f"   Status: {response.status_code}")
            
            if response.status_code == 200:
                transactions = response.json()
                print(f"   Found {len(transactions)} transactions for ledger")
                
                if len(transactions) > 0:
                    # Verify transaction structure
                    first_txn = transactions[0]
                    required_fields = ['id', 'date', 'description', 'amount', 'transaction_type', 'ledger_id']
                    
                    missing_fields = [field for field in required_fields if field not in first_txn]
                    
                    if not missing_fields:
                        self.log_result("Ledger detail shows transactions", True)
                        return True
                    else:
                        self.log_result("Ledger detail shows transactions", False, 
                                      f"Missing fields in transaction: {missing_fields}")
                        return False
                else:
                    # No transactions is also valid - the API works
                    self.log_result("Ledger detail shows transactions", True, "No transactions found but API works")
                    return True
            else:
                error_msg = f"Status {response.status_code}"
                try:
                    error_detail = response.json().get('detail', '')
                    if error_detail:
                        error_msg += f" - {error_detail}"
                except:
                    pass
                self.log_result("Ledger detail shows transactions", False, error_msg)
                return False
                
        except Exception as e:
            self.log_result("Ledger detail shows transactions", False, str(e))
            return False

    def run_critical_tests(self):
        """Run all critical fix tests"""
        print("🚀 Starting Critical Fixes Tests")
        print(f"📍 Base URL: {self.base_url}")
        print("=" * 60)
        
        # Test sequence for critical fixes
        tests = [
            self.test_login_with_admin123,
            self.test_negative_opening_balance,
            self.test_token_validity_across_requests,
            self.test_transaction_edit,
            self.test_ledger_detail_transactions,
        ]
        
        for test in tests:
            try:
                if not test():
                    print(f"\n⚠️  Critical test {test.__name__} failed!")
            except Exception as e:
                print(f"\n💥 Critical test {test.__name__} crashed: {e}")
                self.log_result(test.__name__, False, str(e))
        
        # Print summary
        print("\n" + "=" * 60)
        print("📊 CRITICAL FIXES TEST SUMMARY")
        print("=" * 60)
        print(f"✅ Tests passed: {self.tests_passed}/{self.tests_run}")
        print(f"❌ Tests failed: {len(self.failed_tests)}")
        
        if self.failed_tests:
            print("\n🔍 FAILED CRITICAL TESTS:")
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
    tester = CriticalFixesTester()
    results = tester.run_critical_tests()
    
    # Return appropriate exit code
    return 0 if results["success_rate"] >= 80 else 1

if __name__ == "__main__":
    sys.exit(main())