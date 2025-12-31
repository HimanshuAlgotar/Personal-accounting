from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Depends
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from fastapi.responses import StreamingResponse
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone
import pandas as pd
import io
import hashlib
import re
from openpyxl import Workbook
from openpyxl.styles import Font, Alignment, PatternFill, Border, Side

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBasic()

# ================== MODELS ==================

class UserCreate(BaseModel):
    password: str

class LoginRequest(BaseModel):
    password: str

class TokenResponse(BaseModel):
    token: str
    message: str

class LedgerCreate(BaseModel):
    name: str
    type: str  # asset, liability, income, expense
    category: str  # bank, cash, loan_receivable, loan_payable, investment, credit_card, od, personal_expense, etc.
    description: Optional[str] = ""
    opening_balance: float = 0.0
    person_name: Optional[str] = None  # For loan accounts

class Ledger(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    type: str
    category: str
    description: str = ""
    opening_balance: float = 0.0
    current_balance: float = 0.0
    person_name: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class TransactionCreate(BaseModel):
    date: str
    description: str
    amount: float
    transaction_type: str  # debit, credit
    ledger_id: str
    counter_ledger_id: Optional[str] = None
    reference: Optional[str] = ""
    notes: Optional[str] = ""
    source: str = "manual"  # manual, bank_import

class Transaction(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    date: str
    description: str
    amount: float
    transaction_type: str
    ledger_id: str
    counter_ledger_id: Optional[str] = None
    reference: str = ""
    notes: str = ""
    source: str = "manual"
    tag: Optional[str] = None  # personal_expense, loan_given, loan_taken, interest_paid, interest_received, etc.
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BulkTagUpdate(BaseModel):
    transaction_ids: List[str]
    tag: str
    ledger_id: Optional[str] = None

class LoanCreate(BaseModel):
    person_name: str
    loan_type: str  # given, taken
    principal: float
    interest_rate: float = 0.0
    start_date: str
    notes: Optional[str] = ""
    ledger_id: Optional[str] = None

class Loan(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    person_name: str
    loan_type: str
    principal: float
    interest_rate: float = 0.0
    start_date: str
    notes: str = ""
    ledger_id: Optional[str] = None
    total_repaid: float = 0.0
    interest_paid: float = 0.0
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class LoanRepayment(BaseModel):
    loan_id: str
    amount: float
    date: str
    is_interest: bool = False
    notes: Optional[str] = ""

class TagPattern(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pattern: str
    tag: str
    ledger_id: Optional[str] = None
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SettingsUpdate(BaseModel):
    current_password: str
    new_password: str

# ================== AUTH ==================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

def generate_token() -> str:
    return hashlib.sha256(f"{datetime.now(timezone.utc).isoformat()}{uuid.uuid4()}".encode()).hexdigest()

async def get_current_user(token: str = None):
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    session = await db.sessions.find_one({"token": token}, {"_id": 0})
    if not session:
        raise HTTPException(status_code=401, detail="Invalid token")
    return session

@api_router.post("/auth/setup", response_model=TokenResponse)
async def setup_password(data: UserCreate):
    existing = await db.users.find_one({}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Password already set")
    
    user_doc = {
        "id": str(uuid.uuid4()),
        "password_hash": hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    }
    await db.users.insert_one(user_doc)
    
    # Create default ledgers
    default_ledgers = [
        {"name": "Cash", "type": "asset", "category": "cash", "description": "Cash in hand"},
        {"name": "Personal Expenses", "type": "expense", "category": "personal_expense", "description": "Day to day expenses"},
        {"name": "Personal Income", "type": "income", "category": "personal_income", "description": "Salary and other income"},
        {"name": "Interest Income", "type": "income", "category": "interest_income", "description": "Interest received on loans given"},
        {"name": "Interest Expense", "type": "expense", "category": "interest_expense", "description": "Interest paid on loans taken"},
    ]
    
    for ledger in default_ledgers:
        ledger_obj = Ledger(**ledger)
        await db.ledgers.insert_one(ledger_obj.model_dump())
    
    token = generate_token()
    await db.sessions.insert_one({"token": token, "created_at": datetime.now(timezone.utc).isoformat()})
    
    return TokenResponse(token=token, message="Setup complete")

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(data: LoginRequest):
    user = await db.users.find_one({}, {"_id": 0})
    if not user:
        raise HTTPException(status_code=400, detail="Please setup password first")
    
    if user["password_hash"] != hash_password(data.password):
        raise HTTPException(status_code=401, detail="Invalid password")
    
    token = generate_token()
    await db.sessions.insert_one({"token": token, "created_at": datetime.now(timezone.utc).isoformat()})
    
    return TokenResponse(token=token, message="Login successful")

@api_router.get("/auth/check")
async def check_auth():
    user = await db.users.find_one({}, {"_id": 0})
    return {"setup_required": user is None}

@api_router.post("/auth/logout")
async def logout(token: str):
    await db.sessions.delete_one({"token": token})
    return {"message": "Logged out"}

@api_router.post("/auth/change-password")
async def change_password(data: SettingsUpdate, token: str):
    await get_current_user(token)
    user = await db.users.find_one({}, {"_id": 0})
    
    if user["password_hash"] != hash_password(data.current_password):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    
    await db.users.update_one({}, {"$set": {"password_hash": hash_password(data.new_password)}})
    return {"message": "Password changed successfully"}

# ================== LEDGERS ==================

@api_router.post("/ledgers", response_model=Ledger)
async def create_ledger(data: LedgerCreate, token: str):
    await get_current_user(token)
    ledger = Ledger(**data.model_dump(), current_balance=data.opening_balance)
    await db.ledgers.insert_one(ledger.model_dump())
    return ledger

@api_router.get("/ledgers", response_model=List[Ledger])
async def get_ledgers(token: str, type: Optional[str] = None, category: Optional[str] = None):
    await get_current_user(token)
    query = {}
    if type:
        query["type"] = type
    if category:
        query["category"] = category
    ledgers = await db.ledgers.find(query, {"_id": 0}).to_list(1000)
    return ledgers

@api_router.get("/ledgers/{ledger_id}", response_model=Ledger)
async def get_ledger(ledger_id: str, token: str):
    await get_current_user(token)
    ledger = await db.ledgers.find_one({"id": ledger_id}, {"_id": 0})
    if not ledger:
        raise HTTPException(status_code=404, detail="Ledger not found")
    return ledger

@api_router.put("/ledgers/{ledger_id}", response_model=Ledger)
async def update_ledger(ledger_id: str, data: LedgerCreate, token: str):
    await get_current_user(token)
    await db.ledgers.update_one({"id": ledger_id}, {"$set": data.model_dump()})
    ledger = await db.ledgers.find_one({"id": ledger_id}, {"_id": 0})
    return ledger

@api_router.delete("/ledgers/{ledger_id}")
async def delete_ledger(ledger_id: str, token: str):
    await get_current_user(token)
    await db.ledgers.delete_one({"id": ledger_id})
    return {"message": "Ledger deleted"}

# ================== TRANSACTIONS ==================

@api_router.post("/transactions", response_model=Transaction)
async def create_transaction(data: TransactionCreate, token: str):
    await get_current_user(token)
    transaction = Transaction(**data.model_dump())
    await db.transactions.insert_one(transaction.model_dump())
    
    # Update ledger balance
    multiplier = -1 if data.transaction_type == "debit" else 1
    await db.ledgers.update_one(
        {"id": data.ledger_id},
        {"$inc": {"current_balance": data.amount * multiplier}}
    )
    
    # Save pattern for auto-tagging if tag is set
    if transaction.tag:
        pattern = re.sub(r'\d+', '', data.description)[:50]  # Remove numbers, take first 50 chars
        existing = await db.tag_patterns.find_one({"pattern": pattern}, {"_id": 0})
        if not existing:
            tag_pattern = TagPattern(pattern=pattern, tag=transaction.tag, ledger_id=data.ledger_id)
            await db.tag_patterns.insert_one(tag_pattern.model_dump())
    
    return transaction

@api_router.get("/transactions", response_model=List[Transaction])
async def get_transactions(
    token: str,
    ledger_id: Optional[str] = None,
    tag: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    source: Optional[str] = None,
    untagged: Optional[bool] = None,
    limit: int = 500
):
    await get_current_user(token)
    query = {}
    if ledger_id:
        query["ledger_id"] = ledger_id
    if tag:
        query["tag"] = tag
    if source:
        query["source"] = source
    if untagged:
        query["tag"] = None
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("date", -1).to_list(limit)
    return transactions

@api_router.put("/transactions/{transaction_id}", response_model=Transaction)
async def update_transaction(transaction_id: str, data: TransactionCreate, token: str):
    await get_current_user(token)
    await db.transactions.update_one({"id": transaction_id}, {"$set": data.model_dump()})
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    return transaction

@api_router.post("/transactions/bulk-tag")
async def bulk_tag_transactions(data: BulkTagUpdate, token: str):
    await get_current_user(token)
    update_data = {"tag": data.tag}
    if data.ledger_id:
        update_data["ledger_id"] = data.ledger_id
    
    await db.transactions.update_many(
        {"id": {"$in": data.transaction_ids}},
        {"$set": update_data}
    )
    
    # Save patterns for auto-tagging
    transactions = await db.transactions.find({"id": {"$in": data.transaction_ids}}, {"_id": 0}).to_list(100)
    for txn in transactions:
        pattern = re.sub(r'\d+', '', txn["description"])[:50]
        existing = await db.tag_patterns.find_one({"pattern": pattern}, {"_id": 0})
        if not existing:
            tag_pattern = TagPattern(pattern=pattern, tag=data.tag, ledger_id=data.ledger_id)
            await db.tag_patterns.insert_one(tag_pattern.model_dump())
    
    return {"message": f"Tagged {len(data.transaction_ids)} transactions"}

@api_router.delete("/transactions/{transaction_id}")
async def delete_transaction(transaction_id: str, token: str):
    await get_current_user(token)
    transaction = await db.transactions.find_one({"id": transaction_id}, {"_id": 0})
    if transaction:
        # Reverse ledger balance
        multiplier = 1 if transaction["transaction_type"] == "debit" else -1
        await db.ledgers.update_one(
            {"id": transaction["ledger_id"]},
            {"$inc": {"current_balance": transaction["amount"] * multiplier}}
        )
    await db.transactions.delete_one({"id": transaction_id})
    return {"message": "Transaction deleted"}

# ================== BANK STATEMENT UPLOAD ==================

async def apply_auto_tags(transactions: List[Dict]) -> List[Dict]:
    patterns = await db.tag_patterns.find({}, {"_id": 0}).to_list(1000)
    
    for txn in transactions:
        clean_desc = re.sub(r'\d+', '', txn["description"])[:50]
        for pattern in patterns:
            if pattern["pattern"] in clean_desc:
                txn["tag"] = pattern["tag"]
                if pattern.get("ledger_id"):
                    txn["suggested_ledger_id"] = pattern["ledger_id"]
                break
    
    return transactions

@api_router.post("/upload/bank-statement")
async def upload_bank_statement(file: UploadFile = File(...), ledger_id: str = None, token: str = None):
    await get_current_user(token)
    
    content = await file.read()
    
    try:
        # Read HDFC bank statement
        df = pd.read_excel(io.BytesIO(content), header=None)
        
        # Find the header row (contains 'Date', 'Narration', etc.)
        header_row = None
        for idx, row in df.iterrows():
            row_str = ' '.join(str(x) for x in row.values if pd.notna(x))
            if 'Date' in row_str and 'Narration' in row_str:
                header_row = idx
                break
        
        if header_row is None:
            raise HTTPException(status_code=400, detail="Could not find transaction headers in file")
        
        # Re-read with proper header
        df = pd.read_excel(io.BytesIO(content), header=header_row)
        
        # Skip separator rows
        df = df[~df['Date'].astype(str).str.contains(r'\*+', regex=True, na=True)]
        df = df.dropna(subset=['Date'])
        
        transactions = []
        for _, row in df.iterrows():
            try:
                date_val = row.get('Date', '')
                if pd.isna(date_val) or str(date_val).strip() == '':
                    continue
                
                # Parse date (DD/MM/YY format)
                if isinstance(date_val, str):
                    date_parts = date_val.split('/')
                    if len(date_parts) == 3:
                        day, month, year = date_parts
                        if len(year) == 2:
                            year = '20' + year
                        date_str = f"{year}-{month.zfill(2)}-{day.zfill(2)}"
                    else:
                        continue
                else:
                    date_str = pd.to_datetime(date_val).strftime('%Y-%m-%d')
                
                narration = str(row.get('Narration', ''))
                withdrawal = row.get('Withdrawal Amt.', 0)
                deposit = row.get('Deposit Amt.', 0)
                reference = str(row.get('Chq./Ref.No.', ''))
                
                # Clean up values
                withdrawal = float(withdrawal) if pd.notna(withdrawal) else 0
                deposit = float(deposit) if pd.notna(deposit) else 0
                
                if withdrawal > 0:
                    txn = {
                        "id": str(uuid.uuid4()),
                        "date": date_str,
                        "description": narration,
                        "amount": withdrawal,
                        "transaction_type": "debit",
                        "ledger_id": ledger_id or "",
                        "reference": reference,
                        "source": "bank_import",
                        "tag": None,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    transactions.append(txn)
                
                if deposit > 0:
                    txn = {
                        "id": str(uuid.uuid4()),
                        "date": date_str,
                        "description": narration,
                        "amount": deposit,
                        "transaction_type": "credit",
                        "ledger_id": ledger_id or "",
                        "reference": reference,
                        "source": "bank_import",
                        "tag": None,
                        "created_at": datetime.now(timezone.utc).isoformat()
                    }
                    transactions.append(txn)
                    
            except Exception as e:
                logging.error(f"Error parsing row: {e}")
                continue
        
        # Apply auto-tags
        transactions = await apply_auto_tags(transactions)
        
        return {"transactions": transactions, "count": len(transactions)}
        
    except Exception as e:
        logging.error(f"Error parsing file: {e}")
        raise HTTPException(status_code=400, detail=f"Error parsing file: {str(e)}")

@api_router.post("/upload/save-transactions")
async def save_uploaded_transactions(transactions: List[Dict[str, Any]], token: str):
    await get_current_user(token)
    
    if not transactions:
        return {"message": "No transactions to save", "count": 0}
    
    # Insert transactions
    for txn in transactions:
        if "_id" in txn:
            del txn["_id"]
        await db.transactions.insert_one(txn)
        
        # Update ledger balance if ledger_id is set
        if txn.get("ledger_id"):
            multiplier = -1 if txn["transaction_type"] == "debit" else 1
            await db.ledgers.update_one(
                {"id": txn["ledger_id"]},
                {"$inc": {"current_balance": txn["amount"] * multiplier}}
            )
        
        # Save tag pattern
        if txn.get("tag"):
            pattern = re.sub(r'\d+', '', txn["description"])[:50]
            existing = await db.tag_patterns.find_one({"pattern": pattern}, {"_id": 0})
            if not existing:
                tag_pattern = TagPattern(pattern=pattern, tag=txn["tag"], ledger_id=txn.get("ledger_id"))
                await db.tag_patterns.insert_one(tag_pattern.model_dump())
    
    return {"message": f"Saved {len(transactions)} transactions", "count": len(transactions)}

# ================== LOANS ==================

@api_router.post("/loans", response_model=Loan)
async def create_loan(data: LoanCreate, token: str):
    await get_current_user(token)
    
    # Create a ledger for this loan
    ledger_type = "asset" if data.loan_type == "given" else "liability"
    ledger_category = "loan_receivable" if data.loan_type == "given" else "loan_payable"
    
    ledger = Ledger(
        name=f"Loan - {data.person_name}",
        type=ledger_type,
        category=ledger_category,
        description=f"Loan {data.loan_type} to/from {data.person_name}",
        person_name=data.person_name,
        opening_balance=data.principal,
        current_balance=data.principal
    )
    await db.ledgers.insert_one(ledger.model_dump())
    
    loan = Loan(**data.model_dump(), ledger_id=ledger.id)
    await db.loans.insert_one(loan.model_dump())
    return loan

@api_router.get("/loans", response_model=List[Loan])
async def get_loans(token: str, loan_type: Optional[str] = None):
    await get_current_user(token)
    query = {}
    if loan_type:
        query["loan_type"] = loan_type
    loans = await db.loans.find(query, {"_id": 0}).to_list(1000)
    return loans

@api_router.get("/loans/{loan_id}", response_model=Loan)
async def get_loan(loan_id: str, token: str):
    await get_current_user(token)
    loan = await db.loans.find_one({"id": loan_id}, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    return loan

@api_router.post("/loans/repayment")
async def record_repayment(data: LoanRepayment, token: str):
    await get_current_user(token)
    
    loan = await db.loans.find_one({"id": data.loan_id}, {"_id": 0})
    if not loan:
        raise HTTPException(status_code=404, detail="Loan not found")
    
    # Update loan
    update_field = "interest_paid" if data.is_interest else "total_repaid"
    await db.loans.update_one(
        {"id": data.loan_id},
        {"$inc": {update_field: data.amount}}
    )
    
    # Update ledger balance
    if loan.get("ledger_id"):
        multiplier = -1 if loan["loan_type"] == "given" else 1
        await db.ledgers.update_one(
            {"id": loan["ledger_id"]},
            {"$inc": {"current_balance": data.amount * multiplier}}
        )
    
    # Create transaction record
    txn_type = "credit" if loan["loan_type"] == "given" else "debit"
    tag = "interest_received" if data.is_interest and loan["loan_type"] == "given" else \
          "interest_paid" if data.is_interest else \
          "loan_repayment_received" if loan["loan_type"] == "given" else "loan_repayment_made"
    
    transaction = Transaction(
        date=data.date,
        description=f"{'Interest' if data.is_interest else 'Repayment'} - {loan['person_name']}",
        amount=data.amount,
        transaction_type=txn_type,
        ledger_id=loan.get("ledger_id", ""),
        notes=data.notes or "",
        source="loan_transaction",
        tag=tag
    )
    await db.transactions.insert_one(transaction.model_dump())
    
    return {"message": "Repayment recorded"}

@api_router.delete("/loans/{loan_id}")
async def delete_loan(loan_id: str, token: str):
    await get_current_user(token)
    loan = await db.loans.find_one({"id": loan_id}, {"_id": 0})
    if loan and loan.get("ledger_id"):
        await db.ledgers.delete_one({"id": loan["ledger_id"]})
    await db.loans.delete_one({"id": loan_id})
    return {"message": "Loan deleted"}

# ================== REPORTS ==================

@api_router.get("/reports/dashboard")
async def get_dashboard(token: str):
    await get_current_user(token)
    
    # Get all ledgers
    ledgers = await db.ledgers.find({}, {"_id": 0}).to_list(1000)
    
    # Calculate totals
    bank_balance = sum(l["current_balance"] for l in ledgers if l["category"] == "bank")
    cash_balance = sum(l["current_balance"] for l in ledgers if l["category"] == "cash")
    loans_receivable = sum(l["current_balance"] for l in ledgers if l["category"] == "loan_receivable")
    loans_payable = sum(l["current_balance"] for l in ledgers if l["category"] == "loan_payable")
    investments = sum(l["current_balance"] for l in ledgers if l["category"] == "investment")
    credit_cards = sum(l["current_balance"] for l in ledgers if l["category"] == "credit_card")
    od_balance = sum(l["current_balance"] for l in ledgers if l["category"] == "od")
    
    # Calculate net worth
    total_assets = bank_balance + cash_balance + loans_receivable + investments
    total_liabilities = loans_payable + credit_cards + od_balance
    net_worth = total_assets - total_liabilities
    
    # Recent transactions
    recent_transactions = await db.transactions.find({}, {"_id": 0}).sort("date", -1).to_list(10)
    
    # Monthly income/expense for current month
    current_month = datetime.now(timezone.utc).strftime('%Y-%m')
    transactions = await db.transactions.find(
        {"date": {"$regex": f"^{current_month}"}},
        {"_id": 0}
    ).to_list(10000)
    
    monthly_income = sum(t["amount"] for t in transactions if t["transaction_type"] == "credit")
    monthly_expense = sum(t["amount"] for t in transactions if t["transaction_type"] == "debit")
    
    return {
        "bank_balance": bank_balance,
        "cash_balance": cash_balance,
        "loans_receivable": loans_receivable,
        "loans_payable": loans_payable,
        "investments": investments,
        "credit_cards": credit_cards,
        "od_balance": od_balance,
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "net_worth": net_worth,
        "monthly_income": monthly_income,
        "monthly_expense": monthly_expense,
        "recent_transactions": recent_transactions
    }

@api_router.get("/reports/balance-sheet")
async def get_balance_sheet(token: str):
    await get_current_user(token)
    
    ledgers = await db.ledgers.find({}, {"_id": 0}).to_list(1000)
    
    assets = {
        "bank": [l for l in ledgers if l["category"] == "bank"],
        "cash": [l for l in ledgers if l["category"] == "cash"],
        "loans_receivable": [l for l in ledgers if l["category"] == "loan_receivable"],
        "investments": [l for l in ledgers if l["category"] == "investment"],
        "other": [l for l in ledgers if l["type"] == "asset" and l["category"] not in ["bank", "cash", "loan_receivable", "investment"]]
    }
    
    liabilities = {
        "loans_payable": [l for l in ledgers if l["category"] == "loan_payable"],
        "credit_cards": [l for l in ledgers if l["category"] == "credit_card"],
        "od": [l for l in ledgers if l["category"] == "od"],
        "other": [l for l in ledgers if l["type"] == "liability" and l["category"] not in ["loan_payable", "credit_card", "od"]]
    }
    
    total_assets = sum(l["current_balance"] for l in ledgers if l["type"] == "asset")
    total_liabilities = sum(l["current_balance"] for l in ledgers if l["type"] == "liability")
    
    return {
        "assets": assets,
        "liabilities": liabilities,
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "net_worth": total_assets - total_liabilities
    }

@api_router.get("/reports/income-expense")
async def get_income_expense(token: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    await get_current_user(token)
    
    query = {}
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    transactions = await db.transactions.find(query, {"_id": 0}).to_list(10000)
    
    # Group by tag
    income_by_tag = {}
    expense_by_tag = {}
    
    for txn in transactions:
        tag = txn.get("tag") or "Untagged"
        if txn["transaction_type"] == "credit":
            income_by_tag[tag] = income_by_tag.get(tag, 0) + txn["amount"]
        else:
            expense_by_tag[tag] = expense_by_tag.get(tag, 0) + txn["amount"]
    
    total_income = sum(income_by_tag.values())
    total_expense = sum(expense_by_tag.values())
    
    return {
        "income_by_tag": income_by_tag,
        "expense_by_tag": expense_by_tag,
        "total_income": total_income,
        "total_expense": total_expense,
        "net_income": total_income - total_expense
    }

# ================== EXPORT ==================

@api_router.get("/export/transactions")
async def export_transactions(token: str, start_date: Optional[str] = None, end_date: Optional[str] = None):
    await get_current_user(token)
    
    query = {}
    if start_date:
        query["date"] = {"$gte": start_date}
    if end_date:
        if "date" in query:
            query["date"]["$lte"] = end_date
        else:
            query["date"] = {"$lte": end_date}
    
    transactions = await db.transactions.find(query, {"_id": 0}).sort("date", -1).to_list(10000)
    ledgers = await db.ledgers.find({}, {"_id": 0}).to_list(1000)
    ledger_map = {l["id"]: l["name"] for l in ledgers}
    
    # Create Excel workbook
    wb = Workbook()
    ws = wb.active
    ws.title = "Transactions"
    
    # Header style
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    
    # Headers
    headers = ["Date", "Description", "Amount", "Type", "Ledger", "Tag", "Reference"]
    for col, header in enumerate(headers, 1):
        cell = ws.cell(row=1, column=col, value=header)
        cell.font = header_font
        cell.fill = header_fill
        cell.alignment = Alignment(horizontal="center")
    
    # Data
    for row, txn in enumerate(transactions, 2):
        ws.cell(row=row, column=1, value=txn["date"])
        ws.cell(row=row, column=2, value=txn["description"])
        ws.cell(row=row, column=3, value=txn["amount"])
        ws.cell(row=row, column=4, value=txn["transaction_type"])
        ws.cell(row=row, column=5, value=ledger_map.get(txn.get("ledger_id"), ""))
        ws.cell(row=row, column=6, value=txn.get("tag", ""))
        ws.cell(row=row, column=7, value=txn.get("reference", ""))
    
    # Adjust column widths
    ws.column_dimensions['A'].width = 12
    ws.column_dimensions['B'].width = 50
    ws.column_dimensions['C'].width = 15
    ws.column_dimensions['D'].width = 10
    ws.column_dimensions['E'].width = 20
    ws.column_dimensions['F'].width = 20
    ws.column_dimensions['G'].width = 20
    
    # Save to buffer
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=transactions.xlsx"}
    )

@api_router.get("/export/balance-sheet")
async def export_balance_sheet(token: str):
    await get_current_user(token)
    
    ledgers = await db.ledgers.find({}, {"_id": 0}).to_list(1000)
    
    wb = Workbook()
    ws = wb.active
    ws.title = "Balance Sheet"
    
    header_font = Font(bold=True, color="FFFFFF")
    header_fill = PatternFill(start_color="4F46E5", end_color="4F46E5", fill_type="solid")
    total_font = Font(bold=True)
    
    # Assets
    ws.cell(row=1, column=1, value="ASSETS").font = header_font
    ws.cell(row=1, column=1).fill = header_fill
    ws.cell(row=1, column=2, value="Balance").font = header_font
    ws.cell(row=1, column=2).fill = header_fill
    
    row = 2
    total_assets = 0
    for ledger in [l for l in ledgers if l["type"] == "asset"]:
        ws.cell(row=row, column=1, value=ledger["name"])
        ws.cell(row=row, column=2, value=ledger["current_balance"])
        total_assets += ledger["current_balance"]
        row += 1
    
    ws.cell(row=row, column=1, value="TOTAL ASSETS").font = total_font
    ws.cell(row=row, column=2, value=total_assets).font = total_font
    row += 2
    
    # Liabilities
    ws.cell(row=row, column=1, value="LIABILITIES").font = header_font
    ws.cell(row=row, column=1).fill = header_fill
    ws.cell(row=row, column=2, value="Balance").font = header_font
    ws.cell(row=row, column=2).fill = header_fill
    row += 1
    
    total_liabilities = 0
    for ledger in [l for l in ledgers if l["type"] == "liability"]:
        ws.cell(row=row, column=1, value=ledger["name"])
        ws.cell(row=row, column=2, value=ledger["current_balance"])
        total_liabilities += ledger["current_balance"]
        row += 1
    
    ws.cell(row=row, column=1, value="TOTAL LIABILITIES").font = total_font
    ws.cell(row=row, column=2, value=total_liabilities).font = total_font
    row += 2
    
    ws.cell(row=row, column=1, value="NET WORTH").font = Font(bold=True, size=14)
    ws.cell(row=row, column=2, value=total_assets - total_liabilities).font = Font(bold=True, size=14)
    
    ws.column_dimensions['A'].width = 30
    ws.column_dimensions['B'].width = 20
    
    buffer = io.BytesIO()
    wb.save(buffer)
    buffer.seek(0)
    
    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": "attachment; filename=balance_sheet.xlsx"}
    )

# ================== TAG PATTERNS ==================

@api_router.get("/tag-patterns")
async def get_tag_patterns(token: str):
    await get_current_user(token)
    patterns = await db.tag_patterns.find({}, {"_id": 0}).to_list(1000)
    return patterns

@api_router.delete("/tag-patterns/{pattern_id}")
async def delete_tag_pattern(pattern_id: str, token: str):
    await get_current_user(token)
    await db.tag_patterns.delete_one({"id": pattern_id})
    return {"message": "Pattern deleted"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
