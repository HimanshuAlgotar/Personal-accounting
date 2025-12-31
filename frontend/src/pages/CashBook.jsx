import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { format } from "date-fns";
import { Plus, Wallet, ArrowUpRight, ArrowDownRight, Trash2, Edit2 } from "lucide-react";

const CASH_TAGS = [
  { value: "cash_expense", label: "Cash Expense" },
  { value: "cash_income", label: "Cash Income" },
  { value: "cash_loan_given", label: "Cash Loan Given" },
  { value: "cash_loan_taken", label: "Cash Loan Taken" },
  { value: "bank_withdrawal", label: "Bank Withdrawal" },
  { value: "bank_deposit", label: "Bank Deposit" },
];

const formatCurrency = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount || 0);

export default function CashBook() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [cashLedger, setCashLedger] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingTxn, setEditingTxn] = useState(null);

  const [formData, setFormData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    description: "",
    amount: 0,
    transaction_type: "debit",
    tag: "cash_expense",
    notes: "",
  });

  useEffect(() => { fetchData(); }, [token]);

  const fetchData = async () => {
    try {
      const ledgerRes = await axios.get(`${API}/ledgers?token=${token}&category=cash`);
      let cash = ledgerRes.data[0];
      if (!cash) {
        const createRes = await axios.post(`${API}/ledgers?token=${token}`, { name: "Cash", type: "asset", category: "cash", description: "Cash in hand", opening_balance: 0 });
        cash = createRes.data;
      }
      setCashLedger(cash);
      const txnRes = await axios.get(`${API}/transactions?token=${token}&ledger_id=${cash.id}`);
      setTransactions(txnRes.data);
    } catch (err) { console.error("Fetch error:", err); } finally { setLoading(false); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!cashLedger) { toast.error("Cash ledger not found"); return; }
    try {
      if (editingTxn) {
        await axios.put(`${API}/transactions/${editingTxn.id}?token=${token}`, formData);
        toast.success("Entry updated");
      } else {
        await axios.post(`${API}/transactions?token=${token}`, { ...formData, ledger_id: cashLedger.id, source: "manual" });
        toast.success("Cash entry added");
      }
      setShowDialog(false); setEditingTxn(null); resetForm(); fetchData();
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to save entry"); }
  };

  const handleEdit = (txn) => {
    setEditingTxn(txn);
    setFormData({ date: txn.date, description: txn.description, amount: txn.amount, transaction_type: txn.transaction_type, tag: txn.tag || "cash_expense", notes: txn.notes || "" });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this entry?")) return;
    try { await axios.delete(`${API}/transactions/${id}?token=${token}`); toast.success("Entry deleted"); fetchData(); } catch (err) { toast.error("Failed to delete entry"); }
  };

  const resetForm = () => setFormData({ date: format(new Date(), "yyyy-MM-dd"), description: "", amount: 0, transaction_type: "debit", tag: "cash_expense", notes: "" });

  const totalIncome = transactions.filter((t) => t.transaction_type === "credit").reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.transaction_type === "debit").reduce((sum, t) => sum + t.amount, 0);

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="cash-book-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cash Book</h1>
          <p className="text-gray-500 text-sm mt-1">Track your cash transactions</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingTxn(null); setShowDialog(true); }} data-testid="add-cash-entry-btn">
          <Plus size={16} className="mr-2" /> Add Entry
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="metric-card" data-testid="cash-balance-card">
          <div className="flex items-center gap-2 mb-2"><Wallet size={18} className="text-blue-600" strokeWidth={1.5} /><p className="metric-label mb-0">Cash Balance</p></div>
          <p className={`metric-value ${cashLedger?.current_balance >= 0 ? "text-emerald-600" : "text-rose-600"}`} data-testid="cash-balance">{formatCurrency(cashLedger?.current_balance)}</p>
        </div>
        <div className="metric-card" data-testid="cash-income-card">
          <div className="flex items-center gap-2 mb-2"><ArrowUpRight size={18} className="text-emerald-600" strokeWidth={1.5} /><p className="metric-label mb-0">Total Cash In</p></div>
          <p className="metric-value text-emerald-600" data-testid="total-cash-in">{formatCurrency(totalIncome)}</p>
        </div>
        <div className="metric-card" data-testid="cash-expense-card">
          <div className="flex items-center gap-2 mb-2"><ArrowDownRight size={18} className="text-rose-600" strokeWidth={1.5} /><p className="metric-label mb-0">Total Cash Out</p></div>
          <p className="metric-value text-rose-600" data-testid="total-cash-out">{formatCurrency(totalExpense)}</p>
        </div>
      </div>

      <div className="card-surface overflow-hidden" data-testid="cash-transactions-list">
        <div className="p-4 border-b border-gray-200 bg-gray-50"><span className="text-sm text-gray-600">{transactions.length} entries</span></div>
        {loading ? (<div className="p-8 text-center text-gray-500">Loading...</div>) : transactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500"><p>No cash entries yet</p><Button variant="link" className="text-blue-600 mt-2" onClick={() => setShowDialog(true)}>Add your first entry</Button></div>
        ) : (
          <table className="w-full">
            <thead className="table-dense"><tr><th className="text-left">Date</th><th className="text-left">Description</th><th className="text-right">Amount</th><th className="text-left">Tag</th><th className="w-20"></th></tr></thead>
            <tbody className="table-dense">
              {transactions.map((txn) => (
                <tr key={txn.id} data-testid={`cash-entry-${txn.id}`}>
                  <td className="font-mono text-sm text-gray-700">{txn.date}</td>
                  <td className="text-sm text-gray-900">{txn.description}</td>
                  <td className={`font-mono text-sm text-right font-medium ${txn.transaction_type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>{txn.transaction_type === "credit" ? "+" : "-"}{formatCurrency(txn.amount)}</td>
                  <td>{txn.tag ? <span className={`tag ${txn.tag.includes("income") || txn.tag.includes("taken") ? "tag-income" : "tag-expense"}`}>{txn.tag.replace(/_/g, " ")}</span> : <span className="text-xs text-gray-400">—</span>}</td>
                  <td><div className="flex gap-1"><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(txn)} data-testid={`edit-cash-${txn.id}`}><Edit2 size={14} className="text-gray-500" /></Button><Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(txn.id)} data-testid={`delete-cash-${txn.id}`}><Trash2 size={14} className="text-gray-500 hover:text-rose-600" /></Button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingTxn ? "Edit Cash Entry" : "Add Cash Entry"}</DialogTitle></DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Date</Label><Input type="date" value={formData.date} onChange={(e) => setFormData({ ...formData, date: e.target.value })} className="mt-1" required data-testid="cash-date-input" /></div>
            <div><Label>Description</Label><Input value={formData.description} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="mt-1" placeholder="What was this for?" required data-testid="cash-description-input" /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label>Amount (₹)</Label><Input type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })} className="mt-1 font-mono" required data-testid="cash-amount-input" /></div>
              <div><Label>Type</Label><Select value={formData.transaction_type} onValueChange={(val) => setFormData({ ...formData, transaction_type: val })}><SelectTrigger className="mt-1" data-testid="cash-type-select"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="debit">Cash Out (Expense)</SelectItem><SelectItem value="credit">Cash In (Income)</SelectItem></SelectContent></Select></div>
            </div>
            <div><Label>Category</Label><Select value={formData.tag} onValueChange={(val) => setFormData({ ...formData, tag: val })}><SelectTrigger className="mt-1" data-testid="cash-tag-select"><SelectValue /></SelectTrigger><SelectContent>{CASH_TAGS.map((tag) => (<SelectItem key={tag.value} value={tag.value}>{tag.label}</SelectItem>))}</SelectContent></Select></div>
            <DialogFooter><Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button><Button type="submit" data-testid="save-cash-btn">{editingTxn ? "Update" : "Add Entry"}</Button></DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
