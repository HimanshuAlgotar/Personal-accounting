import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import { Plus, Wallet, ArrowUpRight, ArrowDownRight, Trash2 } from "lucide-react";

const CASH_TAGS = [
  { value: "cash_expense", label: "Cash Expense" },
  { value: "cash_income", label: "Cash Income" },
  { value: "cash_loan_given", label: "Cash Loan Given" },
  { value: "cash_loan_taken", label: "Cash Loan Taken" },
  { value: "bank_withdrawal", label: "Bank Withdrawal" },
  { value: "bank_deposit", label: "Bank Deposit" },
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export default function CashBook() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [cashLedger, setCashLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);

  // Form state
  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    amount: 0,
    transaction_type: "debit",
    tag: "cash_expense",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      // Get all ledgers and find cash ledger
      const ledgerRes = await axios.get(`${API}/ledgers?token=${token}&category=cash`);
      let cash = ledgerRes.data[0];

      // If no cash ledger exists, create one
      if (!cash) {
        const createRes = await axios.post(`${API}/ledgers?token=${token}`, {
          name: "Cash",
          type: "asset",
          category: "cash",
          description: "Cash in hand",
          opening_balance: 0,
        });
        cash = createRes.data;
      }
      setCashLedger(cash);

      // Get cash transactions
      const txnRes = await axios.get(`${API}/transactions?token=${token}&ledger_id=${cash.id}`);
      setTransactions(txnRes.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cashLedger) {
      toast.error("Cash ledger not found");
      return;
    }

    try {
      await axios.post(`${API}/transactions?token=${token}`, {
        ...formData,
        ledger_id: cashLedger.id,
        source: "manual",
      });
      toast.success("Cash entry added");
      setShowDialog(false);
      resetForm();
      fetchData();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to add entry");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this entry?")) return;
    try {
      await axios.delete(`${API}/transactions/${id}?token=${token}`);
      toast.success("Entry deleted");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete entry");
    }
  };

  const resetForm = () => {
    setFormData({
      date: format(new Date(), "yyyy-MM-dd"),
      description: "",
      amount: 0,
      transaction_type: "debit",
      tag: "cash_expense",
      notes: "",
    });
  };

  const totalIncome = transactions
    .filter((t) => t.transaction_type === "credit")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = transactions
    .filter((t) => t.transaction_type === "debit")
    .reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="cash-book-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Cash Book</h1>
          <p className="text-slate-400 text-sm mt-1">Track your cash transactions</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
          className="btn-primary text-white"
          data-testid="add-cash-entry-btn"
        >
          <Plus size={16} className="mr-2" />
          Add Entry
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metric-card" data-testid="cash-balance-card">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={18} className="text-indigo-400" strokeWidth={1.5} />
            <p className="metric-label mb-0">Cash Balance</p>
          </div>
          <p className={`metric-value ${cashLedger?.current_balance >= 0 ? "text-emerald-400" : "text-rose-400"}`} data-testid="cash-balance">
            {formatCurrency(cashLedger?.current_balance)}
          </p>
        </div>

        <div className="metric-card" data-testid="cash-income-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight size={18} className="text-emerald-400" strokeWidth={1.5} />
            <p className="metric-label mb-0">Total Cash In</p>
          </div>
          <p className="metric-value text-emerald-400" data-testid="total-cash-in">
            {formatCurrency(totalIncome)}
          </p>
        </div>

        <div className="metric-card" data-testid="cash-expense-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight size={18} className="text-rose-400" strokeWidth={1.5} />
            <p className="metric-label mb-0">Total Cash Out</p>
          </div>
          <p className="metric-value text-rose-400" data-testid="total-cash-out">
            {formatCurrency(totalExpense)}
          </p>
        </div>
      </div>

      {/* Transactions List */}
      <div className="card-surface rounded-sm overflow-hidden" data-testid="cash-transactions-list">
        <div className="p-4 border-b border-slate-800">
          <span className="text-sm text-slate-400">{transactions.length} entries</span>
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[100px_1fr_120px_150px_80px] gap-2 px-4 py-2 bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 font-bold">
          <div>Date</div>
          <div>Description</div>
          <div className="text-right">Amount</div>
          <div>Tag</div>
          <div></div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            <p>No cash entries yet</p>
            <Button
              variant="link"
              className="text-indigo-400 mt-2"
              onClick={() => setShowDialog(true)}
            >
              Add your first entry
            </Button>
          </div>
        ) : (
          <div className="max-h-[500px] overflow-y-auto">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className="grid grid-cols-[100px_1fr_120px_150px_80px] gap-2 px-4 py-3 border-b border-slate-800/50 items-center hover:bg-slate-900/30"
                data-testid={`cash-entry-${txn.id}`}
              >
                <span className="font-mono text-sm text-slate-300">{txn.date}</span>
                <span className="text-sm text-slate-200 truncate" title={txn.description}>
                  {txn.description}
                </span>
                <span
                  className={`font-mono text-sm text-right ${
                    txn.transaction_type === "credit" ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  {txn.transaction_type === "credit" ? "+" : "-"}
                  {formatCurrency(txn.amount)}
                </span>
                <span>
                  {txn.tag ? (
                    <span
                      className={`tag ${
                        txn.tag.includes("income") || txn.tag.includes("taken")
                          ? "tag-income"
                          : "tag-expense"
                      }`}
                    >
                      {txn.tag.replace(/_/g, " ")}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-600">—</span>
                  )}
                </span>
                <div className="flex justify-end">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-500 hover:text-rose-400"
                    onClick={() => handleDelete(txn.id)}
                    data-testid={`delete-cash-${txn.id}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Entry Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">Add Cash Entry</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-slate-300">Date</Label>
              <Input
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                className="bg-slate-950 border-slate-700 mt-1"
                required
                data-testid="cash-date-input"
              />
            </div>

            <div>
              <Label className="text-slate-300">Description</Label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-950 border-slate-700 mt-1"
                placeholder="What was this for?"
                required
                data-testid="cash-description-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })
                  }
                  className="bg-slate-950 border-slate-700 mt-1 font-mono"
                  required
                  data-testid="cash-amount-input"
                />
              </div>

              <div>
                <Label className="text-slate-300">Type</Label>
                <Select
                  value={formData.transaction_type}
                  onValueChange={(val) => setFormData({ ...formData, transaction_type: val })}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-700 mt-1" data-testid="cash-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Cash Out (Expense)</SelectItem>
                    <SelectItem value="credit">Cash In (Income)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Category</Label>
              <Select
                value={formData.tag}
                onValueChange={(val) => setFormData({ ...formData, tag: val })}
              >
                <SelectTrigger className="bg-slate-950 border-slate-700 mt-1" data-testid="cash-tag-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CASH_TAGS.map((tag) => (
                    <SelectItem key={tag.value} value={tag.value}>
                      {tag.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-slate-950 border-slate-700 mt-1 h-20"
                placeholder="Any additional notes"
                data-testid="cash-notes-input"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="border-slate-700 text-slate-300">
                Cancel
              </Button>
              <Button type="submit" className="btn-primary text-white" data-testid="save-cash-btn">
                Add Entry
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
