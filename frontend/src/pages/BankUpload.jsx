import { useState, useEffect, useRef } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Link } from "react-router-dom";
import { Upload, FileSpreadsheet, Save, Tag, X, CheckCircle2, Plus } from "lucide-react";

const TAGS = [
  { value: "personal_expense", label: "Personal Expense" },
  { value: "personal_income", label: "Personal Income" },
  { value: "loan_given", label: "Loan Given" },
  { value: "loan_taken", label: "Loan Taken" },
  { value: "interest_paid", label: "Interest Paid" },
  { value: "interest_received", label: "Interest Received" },
  { value: "transfer", label: "Transfer" },
  { value: "investment", label: "Investment" },
  { value: "salary", label: "Salary" },
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
];

const formatCurrency = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount || 0);

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

  useEffect(() => { fetchLedgers(); }, [token]);

  const fetchLedgers = async () => {
    try {
      const res = await axios.get(`${API}/ledgers?token=${token}`);
      setLedgers(res.data);
      const bankLedger = res.data.find((l) => l.category === "bank");
      if (bankLedger) setSelectedLedger(bankLedger.id);
    } catch (err) { console.error("Fetch ledgers error:", err); }
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const droppedFile = e.dataTransfer.files[0]; if (droppedFile) { setFile(droppedFile); handleUpload(droppedFile); } };
  const handleFileSelect = (e) => { const selectedFile = e.target.files[0]; if (selectedFile) { setFile(selectedFile); handleUpload(selectedFile); } };

  const handleUpload = async (uploadFile) => {
    if (!uploadFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);
    try {
      const res = await axios.post(`${API}/upload/bank-statement?ledger_id=${selectedLedger}&token=${token}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setTransactions(res.data.transactions);
      toast.success(`Parsed ${res.data.count} transactions`);
    } catch (err) { toast.error(err.response?.data?.detail || "Upload failed"); } finally { setUploading(false); }
  };

  const updateTransaction = (id, field, value) => setTransactions((prev) => prev.map((txn) => (txn.id === id ? { ...txn, [field]: value } : txn)));
  
  const handleBulkTag = (tag) => {
    if (selectedIds.length === 0) { toast.error("Select transactions first"); return; }
    setTransactions((prev) => prev.map((txn) => selectedIds.includes(txn.id) ? { ...txn, tag } : txn));
    toast.success(`Tagged ${selectedIds.length} transactions`);
    setSelectedIds([]);
  };

  const toggleSelect = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleSelectAll = () => selectedIds.length === transactions.length ? setSelectedIds([]) : setSelectedIds(transactions.map((t) => t.id));

  const handleSave = async () => {
    if (transactions.length === 0) return;
    setSaving(true);
    try {
      const txnsToSave = transactions.map((txn) => ({ ...txn, ledger_id: selectedLedger }));
      await axios.post(`${API}/upload/save-transactions?token=${token}`, txnsToSave);
      toast.success(`Saved ${transactions.length} transactions`);
      setTransactions([]); setFile(null);
    } catch (err) { toast.error(err.response?.data?.detail || "Save failed"); } finally { setSaving(false); }
  };

  const bankLedgers = ledgers.filter((l) => l.category === "bank");

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="bank-upload-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Statement Upload</h1>
          <p className="text-gray-500 text-sm mt-1">Import HDFC bank statement (XLS/XLSX)</p>
        </div>
      </div>

      {/* Bank Account Selection */}
      {bankLedgers.length > 0 ? (
        <div className="card-surface p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <label className="text-sm text-gray-600 mb-1 block">Select Bank Account</label>
              <Select value={selectedLedger} onValueChange={setSelectedLedger}>
                <SelectTrigger data-testid="ledger-select"><SelectValue placeholder="Select bank account" /></SelectTrigger>
                <SelectContent>
                  {bankLedgers.map((ledger) => (<SelectItem key={ledger.id} value={ledger.id}>{ledger.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Link to="/ledgers?create=bank">
              <Button variant="outline" size="sm" className="mt-6"><Plus size={14} className="mr-1" />Add Bank</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="card-surface p-6 text-center">
          <p className="text-gray-600 mb-3">No bank accounts found. Create one first.</p>
          <Link to="/ledgers?create=bank"><Button><Plus size={16} className="mr-2" />Create Bank Account</Button></Link>
        </div>
      )}

      {/* Upload Zone */}
      {transactions.length === 0 && bankLedgers.length > 0 && (
        <div
          className={`upload-zone ${dragOver ? "drag-over" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          data-testid="upload-zone"
        >
          <input ref={fileInputRef} type="file" accept=".xls,.xlsx" onChange={handleFileSelect} className="hidden" data-testid="file-input" />
          {uploading ? (
            <div className="text-gray-500"><div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full mx-auto mb-4"></div><p>Processing...</p></div>
          ) : (
            <>
              <FileSpreadsheet size={40} className="text-gray-400 mx-auto mb-3" strokeWidth={1.5} />
              <p className="text-gray-700 font-medium">Drop your HDFC bank statement here</p>
              <p className="text-gray-500 text-sm mt-1">or click to browse (XLS, XLSX)</p>
            </>
          )}
        </div>
      )}

      {/* Transactions Table */}
      {transactions.length > 0 && (
        <div className="card-surface overflow-hidden" data-testid="transactions-table">
          <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center gap-4">
              <Checkbox checked={selectedIds.length === transactions.length} onCheckedChange={toggleSelectAll} data-testid="select-all-checkbox" />
              <span className="text-sm text-gray-600">{selectedIds.length > 0 ? `${selectedIds.length} selected` : `${transactions.length} transactions`}</span>
            </div>
            <div className="flex items-center gap-2">
              {selectedIds.length > 0 && (
                <Select onValueChange={handleBulkTag}>
                  <SelectTrigger className="w-[150px]" data-testid="bulk-tag-select"><Tag size={14} className="mr-2" /><SelectValue placeholder="Bulk Tag" /></SelectTrigger>
                  <SelectContent>{TAGS.map((tag) => (<SelectItem key={tag.value} value={tag.value}>{tag.label}</SelectItem>))}</SelectContent>
                </Select>
              )}
              <Button onClick={handleSave} disabled={saving} data-testid="save-transactions-btn"><Save size={16} className="mr-2" />{saving ? "Saving..." : "Save All"}</Button>
              <Button variant="ghost" size="icon" onClick={() => { setTransactions([]); setFile(null); }} data-testid="clear-btn"><X size={18} /></Button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full">
              <thead className="table-dense sticky top-0 bg-gray-50">
                <tr><th className="w-10"></th><th className="text-left">Date</th><th className="text-left">Description</th><th className="text-right">Amount</th><th className="text-left w-32">Type</th><th className="text-left w-40">Tag</th></tr>
              </thead>
              <tbody className="table-dense">
                {transactions.map((txn) => (
                  <tr key={txn.id} className={selectedIds.includes(txn.id) ? "bg-blue-50" : ""} data-testid={`transaction-row-${txn.id}`}>
                    <td><Checkbox checked={selectedIds.includes(txn.id)} onCheckedChange={() => toggleSelect(txn.id)} /></td>
                    <td className="font-mono text-sm">{txn.date}</td>
                    <td className="text-sm max-w-[250px] truncate" title={txn.description}>{txn.description}</td>
                    <td className={`font-mono text-sm text-right ${txn.transaction_type === "credit" ? "text-emerald-600" : "text-rose-600"}`}>{formatCurrency(txn.amount)}</td>
                    <td><span className={`text-xs px-2 py-1 rounded ${txn.transaction_type === "credit" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{txn.transaction_type}</span></td>
                    <td>
                      <Select value={txn.tag || "untagged"} onValueChange={(val) => updateTransaction(txn.id, "tag", val === "untagged" ? null : val)}>
                        <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Tag" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="untagged">No tag</SelectItem>
                          {TAGS.map((tag) => (<SelectItem key={tag.value} value={tag.value}>{tag.label}</SelectItem>))}
                        </SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex gap-6 text-sm">
              <div><span className="text-gray-500">Credit: </span><span className="font-mono text-emerald-600">{formatCurrency(transactions.filter((t) => t.transaction_type === "credit").reduce((sum, t) => sum + t.amount, 0))}</span></div>
              <div><span className="text-gray-500">Debit: </span><span className="font-mono text-rose-600">{formatCurrency(transactions.filter((t) => t.transaction_type === "debit").reduce((sum, t) => sum + t.amount, 0))}</span></div>
            </div>
            <div className="flex items-center gap-2 text-sm"><CheckCircle2 size={16} className="text-emerald-500" /><span className="text-gray-600">{transactions.filter((t) => t.tag).length}/{transactions.length} tagged</span></div>
          </div>
        </div>
      )}
    </div>
  );
}
