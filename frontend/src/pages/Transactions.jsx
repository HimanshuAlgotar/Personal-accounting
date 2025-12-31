import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Filter, Tag, Trash2, Download, X, Edit2, Search } from "lucide-react";

const TAGS = [
  { value: "personal_expense", label: "Personal Expense" },
  { value: "personal_income", label: "Personal Income" },
  { value: "loan_given", label: "Loan Given" },
  { value: "loan_taken", label: "Loan Taken" },
  { value: "interest_paid", label: "Interest Paid" },
  { value: "interest_received", label: "Interest Received" },
  { value: "asset_purchase", label: "Asset Purchase" },
  { value: "liability_repayment", label: "Liability Repayment" },
  { value: "transfer", label: "Transfer (Internal)" },
  { value: "investment", label: "Investment" },
];

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export default function Transactions() {
  const { token } = useAuth();
  const [transactions, setTransactions] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTxn, setEditingTxn] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Filters
  const [filterLedger, setFilterLedger] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [filterUntagged, setFilterUntagged] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Edit form
  const [editForm, setEditForm] = useState({
    date: "",
    description: "",
    amount: 0,
    transaction_type: "debit",
    tag: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [token, filterLedger, filterTag, filterUntagged, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txnRes, ledgerRes] = await Promise.all([
        axios.get(`${API}/transactions`, {
          params: {
            token,
            ledger_id: filterLedger !== "all" ? filterLedger : undefined,
            tag: filterTag !== "all" ? filterTag : undefined,
            untagged: filterUntagged || undefined,
            start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
            end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
          },
        }),
        axios.get(`${API}/ledgers?token=${token}`),
      ]);
      setTransactions(txnRes.data);
      setLedgers(ledgerRes.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getLedgerName = (id) => {
    const ledger = ledgers.find((l) => l.id === id);
    return ledger?.name || "-";
  };

  const handleBulkTag = async (tag) => {
    if (selectedIds.length === 0) {
      toast.error("Select transactions first");
      return;
    }
    try {
      await axios.post(`${API}/transactions/bulk-tag?token=${token}`, {
        transaction_ids: selectedIds,
        tag,
      });
      toast.success(`Tagged ${selectedIds.length} transactions`);
      setSelectedIds([]);
      fetchData();
    } catch (err) {
      toast.error("Failed to tag transactions");
    }
  };

  const handleEdit = (txn) => {
    setEditingTxn(txn);
    setEditForm({
      date: txn.date,
      description: txn.description,
      amount: txn.amount,
      transaction_type: txn.transaction_type,
      tag: txn.tag || "",
      notes: txn.notes || "",
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    try {
      await axios.put(`${API}/transactions/${editingTxn.id}?token=${token}`, editForm);
      toast.success("Transaction updated");
      setShowEditDialog(false);
      setEditingTxn(null);
      fetchData();
    } catch (err) {
      toast.error("Failed to update transaction");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this transaction?")) return;
    try {
      await axios.delete(`${API}/transactions/${id}?token=${token}`);
      toast.success("Transaction deleted");
      fetchData();
    } catch (err) {
      toast.error("Failed to delete transaction");
    }
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({ token });
      if (startDate) params.append("start_date", format(startDate, "yyyy-MM-dd"));
      if (endDate) params.append("end_date", format(endDate, "yyyy-MM-dd"));

      const response = await axios.get(`${API}/export/transactions?${params}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "transactions.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export downloaded");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  const toggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredTransactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredTransactions.map((t) => t.id));
    }
  };

  const clearFilters = () => {
    setFilterLedger("all");
    setFilterTag("all");
    setFilterUntagged(false);
    setStartDate(null);
    setEndDate(null);
    setSearchTerm("");
  };

  // Filter by search term
  const filteredTransactions = transactions.filter((txn) =>
    searchTerm === "" || txn.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="transactions-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-gray-500 text-sm mt-1">View and manage all transactions</p>
        </div>
        <Button variant="outline" size="sm" onClick={handleExport} data-testid="export-btn">
          <Download size={16} className="mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Search & Filters */}
      <div className="card-surface p-4">
        <div className="flex flex-wrap items-center gap-4">
          <div className="search-box flex-1 min-w-[200px] max-w-[300px]">
            <Search size={16} className="text-gray-400" />
            <Input
              placeholder="Search transactions..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 shadow-none focus-visible:ring-0"
              data-testid="search-input"
            />
          </div>

          <Select value={filterLedger} onValueChange={setFilterLedger}>
            <SelectTrigger className="w-[160px]" data-testid="filter-ledger">
              <SelectValue placeholder="All Ledgers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ledgers</SelectItem>
              {ledgers.map((l) => (
                <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[160px]" data-testid="filter-tag">
              <SelectValue placeholder="All Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {TAGS.map((t) => (
                <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" data-testid="start-date-btn">
                <CalendarIcon size={14} className="mr-2" />
                {startDate ? format(startDate, "dd/MM/yy") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" data-testid="end-date-btn">
                <CalendarIcon size={14} className="mr-2" />
                {endDate ? format(endDate, "dd/MM/yy") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
            </PopoverContent>
          </Popover>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <Checkbox checked={filterUntagged} onCheckedChange={setFilterUntagged} data-testid="filter-untagged" />
            Untagged only
          </label>

          {(filterLedger !== "all" || filterTag !== "all" || filterUntagged || startDate || endDate || searchTerm) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500" data-testid="clear-filters-btn">
              <X size={14} className="mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card-surface overflow-hidden" data-testid="transactions-list">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={selectedIds.length > 0 && selectedIds.length === filteredTransactions.length}
              onCheckedChange={toggleSelectAll}
              data-testid="select-all"
            />
            <span className="text-sm text-gray-600">
              {selectedIds.length > 0 ? `${selectedIds.length} selected` : `${filteredTransactions.length} transactions`}
            </span>
          </div>

          {selectedIds.length > 0 && (
            <Select onValueChange={handleBulkTag}>
              <SelectTrigger className="w-[160px]" data-testid="bulk-tag-btn">
                <Tag size={14} className="mr-2" />
                <SelectValue placeholder="Bulk Tag" />
              </SelectTrigger>
              <SelectContent>
                {TAGS.map((tag) => (
                  <SelectItem key={tag.value} value={tag.value}>{tag.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table */}
        {loading ? (
          <div className="p-8 text-center text-gray-500">Loading...</div>
        ) : filteredTransactions.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No transactions found</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="table-dense">
                <tr>
                  <th className="w-10"></th>
                  <th className="text-left">Date</th>
                  <th className="text-left">Description</th>
                  <th className="text-right">Amount</th>
                  <th className="text-left">Ledger</th>
                  <th className="text-left">Tag</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="table-dense">
                {filteredTransactions.map((txn) => (
                  <tr key={txn.id} className={selectedIds.includes(txn.id) ? "bg-blue-50" : ""} data-testid={`txn-row-${txn.id}`}>
                    <td>
                      <Checkbox checked={selectedIds.includes(txn.id)} onCheckedChange={() => toggleSelect(txn.id)} />
                    </td>
                    <td className="font-mono text-sm text-gray-700">{txn.date}</td>
                    <td className="text-sm text-gray-900 max-w-[300px] truncate" title={txn.description}>{txn.description}</td>
                    <td className={`font-mono text-sm text-right font-medium ${txn.transaction_type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>
                      {txn.transaction_type === "credit" ? "+" : "-"}{formatCurrency(txn.amount)}
                    </td>
                    <td className="text-sm text-gray-600">{getLedgerName(txn.ledger_id)}</td>
                    <td>
                      {txn.tag ? (
                        <span className={`tag ${
                          txn.tag.includes("income") || txn.tag.includes("received") ? "tag-income" :
                          txn.tag.includes("expense") || txn.tag.includes("paid") ? "tag-expense" :
                          txn.tag.includes("loan") ? "tag-loan" : "tag-transfer"
                        }`}>
                          {txn.tag.replace(/_/g, " ")}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(txn)} data-testid={`edit-txn-${txn.id}`}>
                          <Edit2 size={14} className="text-gray-500" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(txn.id)} data-testid={`delete-txn-${txn.id}`}>
                          <Trash2 size={14} className="text-gray-500 hover:text-rose-600" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Dialog */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Transaction</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={editForm.date} onChange={(e) => setEditForm({ ...editForm, date: e.target.value })} className="mt-1" data-testid="edit-date" />
              </div>
              <div>
                <Label>Amount (₹)</Label>
                <Input type="number" step="0.01" value={editForm.amount} onChange={(e) => setEditForm({ ...editForm, amount: parseFloat(e.target.value) || 0 })} className="mt-1 font-mono" data-testid="edit-amount" />
              </div>
            </div>
            <div>
              <Label>Description</Label>
              <Input value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} className="mt-1" data-testid="edit-description" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Type</Label>
                <Select value={editForm.transaction_type} onValueChange={(val) => setEditForm({ ...editForm, transaction_type: val })}>
                  <SelectTrigger className="mt-1" data-testid="edit-type">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">Debit (Expense)</SelectItem>
                    <SelectItem value="credit">Credit (Income)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Tag</Label>
                <Select value={editForm.tag} onValueChange={(val) => setEditForm({ ...editForm, tag: val })}>
                  <SelectTrigger className="mt-1" data-testid="edit-tag">
                    <SelectValue placeholder="Select tag" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">No tag</SelectItem>
                    {TAGS.map((tag) => (
                      <SelectItem key={tag.value} value={tag.value}>{tag.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowEditDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveEdit} data-testid="save-edit-btn">Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
