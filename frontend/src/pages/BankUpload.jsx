import { useState, useEffect, useRef } from "react";
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
import { Upload, FileSpreadsheet, Save, Tag, X, CheckCircle2 } from "lucide-react";

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

export default function BankUpload() {
  const { token } = useAuth();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [ledgers, setLedgers] = useState([]);
  const [selectedLedger, setSelectedLedger] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);

  useEffect(() => {
    fetchLedgers();
  }, [token]);

  const fetchLedgers = async () => {
    try {
      const res = await axios.get(`${API}/ledgers?token=${token}`);
      setLedgers(res.data);
      // Auto-select first bank ledger
      const bankLedger = res.data.find((l) => l.category === "bank");
      if (bankLedger) setSelectedLedger(bankLedger.id);
    } catch (err) {
      console.error("Fetch ledgers error:", err);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setFile(droppedFile);
      handleUpload(droppedFile);
    }
  };

  const handleFileSelect = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      setFile(selectedFile);
      handleUpload(selectedFile);
    }
  };

  const handleUpload = async (uploadFile) => {
    if (!uploadFile) return;

    setUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);

    try {
      const res = await axios.post(
        `${API}/upload/bank-statement?ledger_id=${selectedLedger}&token=${token}`,
        formData,
        { headers: { "Content-Type": "multipart/form-data" } }
      );
      setTransactions(res.data.transactions);
      toast.success(`Parsed ${res.data.count} transactions`);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const updateTransaction = (id, field, value) => {
    setTransactions((prev) =>
      prev.map((txn) => (txn.id === id ? { ...txn, [field]: value } : txn))
    );
  };

  const handleBulkTag = (tag) => {
    if (selectedIds.length === 0) {
      toast.error("Select transactions first");
      return;
    }
    setTransactions((prev) =>
      prev.map((txn) =>
        selectedIds.includes(txn.id) ? { ...txn, tag } : txn
      )
    );
    toast.success(`Tagged ${selectedIds.length} transactions`);
    setSelectedIds([]);
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

  const handleSave = async () => {
    if (transactions.length === 0) return;

    setSaving(true);
    try {
      // Add ledger_id to all transactions
      const txnsToSave = transactions.map((txn) => ({
        ...txn,
        ledger_id: selectedLedger,
      }));

      await axios.post(
        `${API}/upload/save-transactions?token=${token}`,
        txnsToSave
      );
      toast.success(`Saved ${transactions.length} transactions`);
      setTransactions([]);
      setFile(null);
    } catch (err) {
      toast.error(err.response?.data?.detail || "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="bank-upload-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Upload Bank Statement</h1>
        <p className="text-slate-400 text-sm mt-1">
          Import HDFC bank statement (XLS/XLSX) and tag transactions
        </p>
      </div>

      {/* Ledger Selection */}
      <div className="card-surface rounded-sm p-4">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <label className="text-sm text-slate-400 mb-1 block">Bank Account</label>
            <Select value={selectedLedger} onValueChange={setSelectedLedger}>
              <SelectTrigger className="bg-slate-950 border-slate-700" data-testid="ledger-select">
                <SelectValue placeholder="Select bank account" />
              </SelectTrigger>
              <SelectContent>
                {ledgers
                  .filter((l) => l.category === "bank")
                  .map((ledger) => (
                    <SelectItem key={ledger.id} value={ledger.id}>
                      {ledger.name}
                    </SelectItem>
                  ))}
                {ledgers.filter((l) => l.category === "bank").length === 0 && (
                  <SelectItem value="none" disabled>
                    No bank accounts. Create one in Ledgers.
                  </SelectItem>
                )}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            size="sm"
            className="border-slate-700 text-slate-300 mt-6"
            onClick={() =>
              (window.location.href = "/ledgers?create=bank")
            }
          >
            + Add Bank
          </Button>
        </div>
      </div>

      {/* Upload Zone */}
      {transactions.length === 0 && (
        <div
          className={`upload-zone ${dragOver ? "drag-over" : ""}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          data-testid="upload-zone"
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".xls,.xlsx"
            onChange={handleFileSelect}
            className="hidden"
            data-testid="file-input"
          />
          {uploading ? (
            <div className="text-slate-400">
              <div className="animate-spin w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full mx-auto mb-4"></div>
              <p>Processing statement...</p>
            </div>
          ) : (
            <>
              <FileSpreadsheet size={48} className="text-slate-600 mx-auto mb-4" strokeWidth={1} />
              <p className="text-slate-300 mb-2">Drop your HDFC bank statement here</p>
              <p className="text-slate-500 text-sm">or click to browse (XLS, XLSX)</p>
            </>
          )}
        </div>
      )}

      {/* Transactions Table */}
      {transactions.length > 0 && (
        <div className="card-surface rounded-sm overflow-hidden" data-testid="transactions-table">
          {/* Toolbar */}
          <div className="flex items-center justify-between p-4 border-b border-slate-800">
            <div className="flex items-center gap-4">
              <Checkbox
                checked={selectedIds.length === transactions.length}
                onCheckedChange={toggleSelectAll}
                data-testid="select-all-checkbox"
              />
              <span className="text-sm text-slate-400">
                {selectedIds.length > 0
                  ? `${selectedIds.length} selected`
                  : `${transactions.length} transactions`}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <Select onValueChange={handleBulkTag}>
                  <SelectTrigger className="w-[180px] bg-slate-950 border-slate-700" data-testid="bulk-tag-select">
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

              <Button
                onClick={handleSave}
                disabled={saving}
                className="btn-primary text-white"
                data-testid="save-transactions-btn"
              >
                <Save size={16} className="mr-2" />
                {saving ? "Saving..." : "Save All"}
              </Button>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => {
                  setTransactions([]);
                  setFile(null);
                }}
                className="text-slate-400 hover:text-slate-300"
                data-testid="clear-btn"
              >
                <X size={18} />
              </Button>
            </div>
          </div>

          {/* Table Header */}
          <div className="grid grid-cols-[40px_100px_1fr_120px_100px_160px] gap-2 px-4 py-2 bg-slate-900/50 text-xs uppercase tracking-wider text-slate-500 font-bold">
            <div></div>
            <div>Date</div>
            <div>Description</div>
            <div className="text-right">Amount</div>
            <div>Type</div>
            <div>Tag</div>
          </div>

          {/* Table Body */}
          <div className="max-h-[500px] overflow-y-auto">
            {transactions.map((txn) => (
              <div
                key={txn.id}
                className={`grid grid-cols-[40px_100px_1fr_120px_100px_160px] gap-2 px-4 py-3 border-b border-slate-800/50 items-center hover:bg-slate-900/30 ${
                  selectedIds.includes(txn.id) ? "bg-indigo-900/20" : ""
                }`}
                data-testid={`transaction-row-${txn.id}`}
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
                  {formatCurrency(txn.amount)}
                </span>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    txn.transaction_type === "credit"
                      ? "bg-emerald-900/30 text-emerald-400"
                      : "bg-rose-900/30 text-rose-400"
                  }`}
                >
                  {txn.transaction_type}
                </span>
                <Select
                  value={txn.tag || ""}
                  onValueChange={(val) => updateTransaction(txn.id, "tag", val)}
                >
                  <SelectTrigger className="h-8 text-xs bg-slate-950 border-slate-700" data-testid={`tag-select-${txn.id}`}>
                    <SelectValue placeholder="Select tag" />
                  </SelectTrigger>
                  <SelectContent>
                    {TAGS.map((tag) => (
                      <SelectItem key={tag.value} value={tag.value}>
                        {tag.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>

          {/* Summary */}
          <div className="flex items-center justify-between p-4 bg-slate-900/30 border-t border-slate-800">
            <div className="flex gap-6 text-sm">
              <div>
                <span className="text-slate-500">Total Credit: </span>
                <span className="font-mono text-emerald-400">
                  {formatCurrency(
                    transactions
                      .filter((t) => t.transaction_type === "credit")
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </span>
              </div>
              <div>
                <span className="text-slate-500">Total Debit: </span>
                <span className="font-mono text-rose-400">
                  {formatCurrency(
                    transactions
                      .filter((t) => t.transaction_type === "debit")
                      .reduce((sum, t) => sum + t.amount, 0)
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <CheckCircle2 size={16} className="text-emerald-400" />
              <span className="text-slate-400">
                {transactions.filter((t) => t.tag).length} of {transactions.length} tagged
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
