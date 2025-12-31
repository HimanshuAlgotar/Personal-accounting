import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
} from "@/components/ui/dialog";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { CalendarIcon, Filter, Tag, Trash2, Download, X } from "lucide-react";

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

  // Filters
  const [filterLedger, setFilterLedger] = useState("all");
  const [filterTag, setFilterTag] = useState("all");
  const [filterUntagged, setFilterUntagged] = useState(false);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

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
    if (selectedIds.length === transactions.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(transactions.map((t) => t.id));
    }
  };

  const clearFilters = () => {
    setFilterLedger("all");
    setFilterTag("all");
    setFilterUntagged(false);
    setStartDate(null);
    setEndDate(null);
  };

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="transactions-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Transactions</h1>
          <p className="text-slate-400 text-sm mt-1">
            View and manage all transactions
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="border-slate-700 text-slate-300"
          onClick={handleExport}
          data-testid="export-btn"
        >
          <Download size={16} className="mr-2" />
          Export Excel
        </Button>
      </div>

      {/* Filters */}
      <div className="card-surface rounded-sm p-4">
        <div className="flex flex-wrap items-center gap-4">
          <Filter size={18} className="text-slate-500" />

          <Select value={filterLedger} onValueChange={setFilterLedger}>
            <SelectTrigger className="w-[180px] bg-slate-950 border-slate-700" data-testid="filter-ledger">
              <SelectValue placeholder="All Ledgers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Ledgers</SelectItem>
              {ledgers.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterTag} onValueChange={setFilterTag}>
            <SelectTrigger className="w-[180px] bg-slate-950 border-slate-700" data-testid="filter-tag">
              <SelectValue placeholder="All Tags" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Tags</SelectItem>
              {TAGS.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-slate-700 text-slate-300" data-testid="start-date-btn">
                <CalendarIcon size={14} className="mr-2" />
                {startDate ? format(startDate, "dd/MM/yyyy") : "Start Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={startDate} onSelect={setStartDate} />
            </PopoverContent>
          </Popover>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline" className="border-slate-700 text-slate-300" data-testid="end-date-btn">
                <CalendarIcon size={14} className="mr-2" />
                {endDate ? format(endDate, "dd/MM/yyyy") : "End Date"}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0">
              <Calendar mode="single" selected={endDate} onSelect={setEndDate} />
            </PopoverContent>
          </Popover>

          <label className="flex items-center gap-2 text-sm text-slate-400">
            <Checkbox
              checked={filterUntagged}
              onCheckedChange={setFilterUntagged}
              data-testid="filter-untagged"
            />
            Untagged only
          </label>

          {(filterLedger !== "all" || filterTag !== "all" || filterUntagged || startDate || endDate) && (
            <Button
              variant="ghost"
              size="sm"
              onClick={clearFilters}
              className="text-slate-400"
              data-testid="clear-filters-btn"
            >
              <X size={14} className="mr-1" />
              Clear
            </Button>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="card-surface rounded-sm overflow-hidden" data-testid="transactions-list">
        {/* Toolbar */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800">
          <div className="flex items-center gap-4">
            <Checkbox
              checked={selectedIds.length > 0 && selectedIds.length === transactions.length}
              onCheckedChange={toggleSelectAll}
              data-testid="select-all"
            />
            <span className="text-sm text-slate-400">
              {selectedIds.length > 0
                ? `${selectedIds.length} selected`
                : `${transactions.length} transactions`}
            </span>
          </div>

          {selectedIds.length > 0 && (
            <Select onValueChange={handleBulkTag}>
              <SelectTrigger className="w-[180px] bg-slate-950 border-slate-700" data-testid="bulk-tag-btn">
                <Tag size={14} className="mr-2" />
                <SelectValue placeholder="Bulk Tag" />
              </SelectTrigger>
              <SelectContent>
                {TAGS.map((tag) => (
                  <SelectItem key={tag.value} value={tag.value}>
                    {tag.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {/* Table Header */}
        <div className="grid grid-cols-[40px_100px_1fr_120px_150px_150px_80px] gap-2 px-4 py-2 bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 font-bold">
          <div></div>
          <div>Date</div>
          <div>Description</div>
          <div className="text-right">Amount</div>
          <div>Ledger</div>
          <div>Tag</div>
          <div></div>
        </div>

        {/* Table Body */}
        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-500">
            No transactions found
          </div>
        ) : (
          <div className="max-h-[600px] overflow-y-auto">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className={`grid grid-cols-[40px_100px_1fr_120px_150px_150px_80px] gap-2 px-4 py-3 border-b border-slate-800/50 items-center hover:bg-slate-900/30 ${
                  selectedIds.includes(txn.id) ? "bg-indigo-900/20" : ""
                }`}
                data-testid={`txn-row-${txn.id}`}
              >
                <Checkbox
                  checked={selectedIds.includes(txn.id)}
                  onCheckedChange={() => toggleSelect(txn.id)}
                />
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
                <span className="text-sm text-slate-400 truncate">
                  {getLedgerName(txn.ledger_id)}
                </span>
                <span>
                  {txn.tag ? (
                    <span
                      className={`tag ${
                        txn.tag.includes("income") || txn.tag.includes("received")
                          ? "tag-income"
                          : txn.tag.includes("expense") || txn.tag.includes("paid")
                          ? "tag-expense"
                          : txn.tag.includes("loan")
                          ? "tag-loan"
                          : "tag-transfer"
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
                    data-testid={`delete-txn-${txn.id}`}
                  >
                    <Trash2 size={14} />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
