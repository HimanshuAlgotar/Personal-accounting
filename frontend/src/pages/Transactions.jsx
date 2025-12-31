import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import { useSearchParams } from "react-router-dom";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Folder, Trash2, Download, X, Edit2, Search, ArrowRightLeft } from "lucide-react";

const formatCurrency = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount || 0);

export default function Transactions() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [editingTxn, setEditingTxn] = useState(null);
  const [showEditDialog, setShowEditDialog] = useState(false);

  // Filters
  const [filterAccount, setFilterAccount] = useState(searchParams.get("account") || "all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [filterUntagged, setFilterUntagged] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  // Edit form
  const [editForm, setEditForm] = useState({
    date: "",
    description: "",
    amount: 0,
    transaction_type: "expense",
    category_id: "",
    notes: "",
  });

  useEffect(() => {
    fetchData();
  }, [token, filterAccount, filterCategory, filterType, filterUntagged, startDate, endDate]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [txnRes, accountsRes, categoriesRes, flatCatRes] = await Promise.all([
        axios.get(`${API}/transactions`, {
          params: {
            token,
            account_id: filterAccount !== "all" ? filterAccount : undefined,
            category_id: filterCategory !== "all" ? filterCategory : undefined,
            transaction_type: filterType !== "all" ? filterType : undefined,
            untagged: filterUntagged || undefined,
            start_date: startDate ? format(startDate, "yyyy-MM-dd") : undefined,
            end_date: endDate ? format(endDate, "yyyy-MM-dd") : undefined,
          },
        }),
        axios.get(`${API}/accounts?token=${token}`),
        axios.get(`${API}/categories?token=${token}`),
        axios.get(`${API}/categories/flat?token=${token}`)
      ]);
      setTransactions(txnRes.data);
      setAccounts(accountsRes.data);
      setCategories(categoriesRes.data);
      setFlatCategories(flatCatRes.data);
    } catch (err) {
      console.error("Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  const getAccountName = (id) => accounts.find((a) => a.id === id)?.name || "-";
  
  const getCategoryName = (id) => {
    if (!id) return null;
    const cat = flatCategories.find(c => c.id === id);
    if (!cat) return null;
    if (cat.parent_id) {
      const parent = flatCategories.find(c => c.id === cat.parent_id);
      return parent ? `${parent.name} > ${cat.name}` : cat.name;
    }
    return cat.name;
  };

  const handleBulkTag = async (categoryId) => {
    if (selectedIds.length === 0) {
      toast.error("Select transactions first");
      return;
    }
    try {
      await axios.post(`${API}/transactions/bulk-tag?token=${token}`, {
        transaction_ids: selectedIds,
        category_id: categoryId === "none" ? null : categoryId,
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
      category_id: txn.category_id || "",
      notes: txn.notes || "",
    });
    setShowEditDialog(true);
  };

  const handleSaveEdit = async () => {
    try {
      const updateData = { 
        ...editForm,
        category_id: editForm.category_id === "none" || !editForm.category_id ? null : editForm.category_id
      };
      await axios.put(`${API}/transactions/${editingTxn.id}?token=${token}`, updateData);
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

      const response = await axios.get(`${API}/export/transactions?${params}`, { responseType: "blob" });
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

  const toggleSelect = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleSelectAll = () => selectedIds.length === filteredTransactions.length ? setSelectedIds([]) : setSelectedIds(filteredTransactions.map((t) => t.id));

  const clearFilters = () => {
    setFilterAccount("all");
    setFilterCategory("all");
    setFilterType("all");
    setFilterUntagged(false);
    setStartDate(null);
    setEndDate(null);
    setSearchTerm("");
  };

  const filteredTransactions = transactions.filter((txn) =>
    searchTerm === "" || txn.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get parent categories for bulk tagging
  const parentCategories = categories;

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

          <Select value={filterAccount} onValueChange={setFilterAccount}>
            <SelectTrigger className="w-[160px] bg-white" data-testid="filter-account">
              <SelectValue placeholder="All Accounts" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Accounts</SelectItem>
              {accounts.map((a) => (<SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-[160px] bg-white" data-testid="filter-category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {parentCategories.map((c) => (<SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>))}
            </SelectContent>
          </Select>

          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[130px] bg-white" data-testid="filter-type">
              <SelectValue placeholder="All Types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="expense">Expense</SelectItem>
              <SelectItem value="income">Income</SelectItem>
              <SelectItem value="transfer">Transfer</SelectItem>
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" data-testid="start-date-btn">
                <CalendarIcon size={14} className="mr-2" />
                {startDate ? format(startDate, "dd/MM/yy") : "From"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" data-testid="end-date-btn">
                <CalendarIcon size={14} className="mr-2" />
                {endDate ? format(endDate, "dd/MM/yy") : "To"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent>
          </Popover>

          <label className="flex items-center gap-2 text-sm text-gray-600">
            <Checkbox checked={filterUntagged} onCheckedChange={setFilterUntagged} data-testid="filter-untagged" />
            Uncategorized
          </label>

          {(filterAccount !== "all" || filterCategory !== "all" || filterType !== "all" || filterUntagged || startDate || endDate || searchTerm) && (
            <Button variant="ghost" size="sm" onClick={clearFilters} className="text-gray-500" data-testid="clear-filters-btn">
              <X size={14} className="mr-1" />Clear
            </Button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card-surface overflow-hidden" data-testid="transactions-list">
        <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center gap-4">
            <Checkbox checked={selectedIds.length > 0 && selectedIds.length === filteredTransactions.length} onCheckedChange={toggleSelectAll} data-testid="select-all" />
            <span className="text-sm text-gray-600">{selectedIds.length > 0 ? `${selectedIds.length} selected` : `${filteredTransactions.length} transactions`}</span>
          </div>

          {selectedIds.length > 0 && (
            <Select onValueChange={handleBulkTag}>
              <SelectTrigger className="w-[180px] bg-white" data-testid="bulk-tag-btn">
                <Folder size={14} className="mr-2" />
                <SelectValue placeholder="Bulk Categorize" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Remove Category</SelectItem>
                {flatCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.parent_id ? `  └ ${cat.name}` : cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

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
                  <th className="text-left">Account</th>
                  <th className="text-left">Category</th>
                  <th className="w-20"></th>
                </tr>
              </thead>
              <tbody className="table-dense">
                {filteredTransactions.map((txn) => (
                  <tr key={txn.id} className={selectedIds.includes(txn.id) ? "bg-blue-50" : ""} data-testid={`txn-row-${txn.id}`}>
                    <td><Checkbox checked={selectedIds.includes(txn.id)} onCheckedChange={() => toggleSelect(txn.id)} /></td>
                    <td className="font-mono text-sm text-gray-700">{txn.date}</td>
                    <td className="text-sm text-gray-900 max-w-[300px] truncate" title={txn.description}>{txn.description}</td>
                    <td className={`font-mono text-sm text-right font-medium ${txn.transaction_type === "income" ? "text-emerald-600" : txn.transaction_type === "transfer" ? "text-blue-600" : "text-rose-600"}`}>
                      {txn.transaction_type === "income" ? "+" : txn.transaction_type === "transfer" ? "↔" : "-"}{formatCurrency(txn.amount)}
                    </td>
                    <td className="text-sm text-gray-600">{getAccountName(txn.account_id)}</td>
                    <td>
                      {txn.category_id ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
                          <Folder size={12} />
                          {getCategoryName(txn.category_id)}
                        </span>
                      ) : txn.payee_id ? (
                        <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">
                          <ArrowRightLeft size={12} />
                          {getAccountName(txn.payee_id)}
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
          <DialogHeader><DialogTitle>Edit Transaction</DialogTitle></DialogHeader>
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
                  <SelectTrigger className="mt-1 bg-white" data-testid="edit-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Category</Label>
                <Select value={editForm.category_id || "none"} onValueChange={(val) => setEditForm({ ...editForm, category_id: val === "none" ? "" : val })}>
                  <SelectTrigger className="mt-1 bg-white" data-testid="edit-category"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No category</SelectItem>
                    {flatCategories.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.parent_id ? `  └ ${cat.name}` : cat.name}
                      </SelectItem>
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
