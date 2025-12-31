import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import { useSearchParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Plus, Edit2, Trash2, Banknote, Wallet, CreditCard, TrendingUp, TrendingDown, Building2, ChevronRight } from "lucide-react";

const ACCOUNT_TYPES = [
  { value: "bank", label: "Bank Account", icon: Banknote, color: "text-blue-600", bg: "bg-blue-50" },
  { value: "cash", label: "Cash", icon: Wallet, color: "text-emerald-600", bg: "bg-emerald-50" },
  { value: "credit_card", label: "Credit Card", icon: CreditCard, color: "text-rose-600", bg: "bg-rose-50" },
  { value: "investment", label: "Investment", icon: Building2, color: "text-purple-600", bg: "bg-purple-50" },
  { value: "loan_receivable", label: "Loan Receivable", icon: TrendingUp, color: "text-amber-600", bg: "bg-amber-50" },
  { value: "loan_payable", label: "Loan Payable", icon: TrendingDown, color: "text-red-600", bg: "bg-red-50" },
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export default function Accounts() {
  const { token } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingAccount, setEditingAccount] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [selectedAccount, setSelectedAccount] = useState(null);
  const [showAccountSheet, setShowAccountSheet] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    account_type: "bank",
    description: "",
    opening_balance: 0,
    person_name: "",
  });

  useEffect(() => {
    fetchAccounts();
  }, [token]);

  useEffect(() => {
    const createParam = searchParams.get("create");
    if (createParam) {
      setFormData((prev) => ({ ...prev, account_type: createParam }));
      setShowDialog(true);
    }
  }, [searchParams]);

  const fetchAccounts = async () => {
    try {
      const res = await axios.get(`${API}/accounts?token=${token}`);
      setAccounts(res.data);
    } catch (err) {
      console.error("Fetch accounts error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchAccountTransactions = async (accountId) => {
    try {
      const res = await axios.get(`${API}/transactions?token=${token}&account_id=${accountId}&limit=100`);
      setTransactions(res.data);
    } catch (err) {
      console.error("Fetch transactions error:", err);
    }
  };

  const handleAccountClick = async (account) => {
    setSelectedAccount(account);
    setShowAccountSheet(true);
    await fetchAccountTransactions(account.id);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingAccount) {
        await axios.put(`${API}/accounts/${editingAccount.id}?token=${token}`, formData);
        toast.success("Account updated");
      } else {
        await axios.post(`${API}/accounts?token=${token}`, formData);
        toast.success("Account created");
      }
      setShowDialog(false);
      setEditingAccount(null);
      resetForm();
      fetchAccounts();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save account");
    }
  };

  const handleEdit = (e, account) => {
    e.stopPropagation();
    setEditingAccount(account);
    setFormData({
      name: account.name,
      account_type: account.account_type,
      description: account.description,
      opening_balance: account.opening_balance,
      person_name: account.person_name || "",
    });
    setShowDialog(true);
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    if (!confirm("Delete this account? This cannot be undone.")) return;
    try {
      await axios.delete(`${API}/accounts/${id}?token=${token}`);
      toast.success("Account deleted");
      fetchAccounts();
    } catch (err) {
      toast.error("Failed to delete account");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      account_type: "bank",
      description: "",
      opening_balance: 0,
      person_name: "",
    });
  };

  const getAccountConfig = (type) => ACCOUNT_TYPES.find((t) => t.value === type) || ACCOUNT_TYPES[0];
  
  const filteredAccounts = filterType === "all" ? accounts : accounts.filter((a) => a.account_type === filterType);
  
  const groupedAccounts = filteredAccounts.reduce((acc, account) => {
    const type = account.account_type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(account);
    return acc;
  }, {});

  // Calculate totals
  const totals = {
    assets: accounts.filter(a => ["bank", "cash", "investment", "loan_receivable"].includes(a.account_type)).reduce((sum, a) => sum + a.current_balance, 0),
    liabilities: accounts.filter(a => ["credit_card", "loan_payable"].includes(a.account_type)).reduce((sum, a) => sum + a.current_balance, 0),
  };

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="accounts-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Accounts</h1>
          <p className="text-gray-500 text-sm mt-1">Manage your bank accounts, cash, and other assets</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingAccount(null); setShowDialog(true); }} data-testid="create-account-btn">
          <Plus size={16} className="mr-2" />
          New Account
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-2 gap-4">
        <div className="card-surface p-4">
          <p className="text-sm text-gray-500">Total Assets</p>
          <p className="text-2xl font-mono font-bold text-emerald-600">{formatCurrency(totals.assets)}</p>
        </div>
        <div className="card-surface p-4">
          <p className="text-sm text-gray-500">Total Liabilities</p>
          <p className="text-2xl font-mono font-bold text-rose-600">{formatCurrency(totals.liabilities)}</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button variant={filterType === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterType("all")} data-testid="filter-all">
          All
        </Button>
        {ACCOUNT_TYPES.map((type) => (
          <Button
            key={type.value}
            variant={filterType === type.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType(type.value)}
            data-testid={`filter-${type.value}`}
          >
            {type.label}
          </Button>
        ))}
      </div>

      {/* Accounts Grid */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedAccounts).map(([type, typeAccounts]) => {
            const typeConfig = getAccountConfig(type);
            const Icon = typeConfig.icon;
            return (
              <div key={type} className="space-y-3">
                <h2 className={`text-sm font-semibold uppercase tracking-wider ${typeConfig.color}`}>
                  {typeConfig.label} ({typeAccounts.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeAccounts.map((account) => (
                    <div
                      key={account.id}
                      className="card-surface p-4 cursor-pointer hover:shadow-md transition-shadow group"
                      onClick={() => handleAccountClick(account)}
                      data-testid={`account-card-${account.id}`}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-md flex items-center justify-center ${typeConfig.bg}`}>
                            <Icon size={20} className={typeConfig.color} strokeWidth={1.5} />
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{account.name}</h3>
                            {account.person_name && <p className="text-xs text-gray-500">{account.person_name}</p>}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleEdit(e, account)} data-testid={`edit-account-${account.id}`}>
                            <Edit2 size={14} className="text-gray-500" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => handleDelete(e, account.id)} data-testid={`delete-account-${account.id}`}>
                            <Trash2 size={14} className="text-gray-500 hover:text-rose-600" />
                          </Button>
                        </div>
                        <ChevronRight size={18} className="text-gray-400 group-hover:text-blue-600 transition-colors ml-2" />
                      </div>
                      <div className="mt-4 pt-3 border-t border-gray-100">
                        <p className="text-xs text-gray-500">Current Balance</p>
                        <p className={`font-mono text-lg font-medium ${account.current_balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                          {formatCurrency(account.current_balance)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}

          {Object.keys(groupedAccounts).length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <p>No accounts found</p>
              <Button variant="link" className="text-blue-600 mt-2" onClick={() => setShowDialog(true)}>
                Create your first account
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAccount ? "Edit Account" : "New Account"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Account Name</Label>
              <Input value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} className="mt-1" placeholder="e.g., HDFC Savings" required data-testid="account-name-input" />
            </div>

            <div>
              <Label>Account Type</Label>
              <Select value={formData.account_type} onValueChange={(val) => setFormData({ ...formData, account_type: val })}>
                <SelectTrigger className="mt-1 bg-white" data-testid="account-type-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Opening Balance (₹)</Label>
              <Input 
                type="text" 
                inputMode="decimal"
                value={formData.opening_balance} 
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === '' || val === '-') {
                    setFormData({ ...formData, opening_balance: val });
                  } else {
                    const num = parseFloat(val);
                    if (!isNaN(num)) {
                      setFormData({ ...formData, opening_balance: num });
                    }
                  }
                }} 
                className="mt-1 font-mono" 
                data-testid="account-balance-input" 
                placeholder="Enter current balance" 
              />
              <p className="text-xs text-gray-500 mt-1">Enter negative value for credit card dues</p>
            </div>

            {(formData.account_type === "loan_receivable" || formData.account_type === "loan_payable") && (
              <div>
                <Label>Person Name</Label>
                <Input value={formData.person_name} onChange={(e) => setFormData({ ...formData, person_name: e.target.value })} className="mt-1" placeholder="e.g., Akash, Rahul" data-testid="account-person-input" />
              </div>
            )}

            <div>
              <Label>Description (Optional)</Label>
              <Textarea value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="mt-1 h-20" placeholder="Notes about this account" data-testid="account-description-input" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" data-testid="save-account-btn">{editingAccount ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Account Detail Sheet */}
      <Sheet open={showAccountSheet} onOpenChange={setShowAccountSheet}>
        <SheetContent className="w-full sm:max-w-xl">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              <span>{selectedAccount?.name}</span>
              <span className={`font-mono text-lg ${selectedAccount?.current_balance >= 0 ? "text-emerald-600" : "text-rose-600"}`}>
                {formatCurrency(selectedAccount?.current_balance)}
              </span>
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Transactions</h3>
              <Button variant="outline" size="sm" onClick={() => { setShowAccountSheet(false); navigate(`/transactions?account=${selectedAccount?.id}`); }}>
                View All
              </Button>
            </div>
            {transactions.length > 0 ? (
              <div className="space-y-2 max-h-[60vh] overflow-y-auto">
                {transactions.map((txn) => (
                  <div key={txn.id} className="flex items-center justify-between py-3 border-b border-gray-100">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900 truncate">{txn.description}</p>
                      <p className="text-xs text-gray-500 font-mono">{txn.date}</p>
                    </div>
                    <p className={`font-mono text-sm font-medium ${txn.transaction_type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                      {txn.transaction_type === "income" ? "+" : "-"}{formatCurrency(txn.amount)}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-center py-8">No transactions in this account</p>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}
