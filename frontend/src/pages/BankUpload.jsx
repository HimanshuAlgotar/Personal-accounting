import { useState, useEffect, useRef } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Link } from "react-router-dom";
import { Upload, FileSpreadsheet, Save, Tag, X, CheckCircle2, Plus, ChevronRight, Folder, ArrowRightLeft } from "lucide-react";

const formatCurrency = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount || 0);

export default function BankUpload() {
  const { token } = useAuth();
  const fileInputRef = useRef(null);
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [transactions, setTransactions] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedAccount, setSelectedAccount] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [saving, setSaving] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  
  // Category dialog
  const [showCategoryDialog, setShowCategoryDialog] = useState(false);
  const [selectedTxnForTag, setSelectedTxnForTag] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedSubCategory, setSelectedSubCategory] = useState("");
  const [selectedPayee, setSelectedPayee] = useState("");
  const [newCategoryName, setNewCategoryName] = useState("");
  const [showNewCategory, setShowNewCategory] = useState(false);

  useEffect(() => { fetchData(); }, [token]);

  const fetchData = async () => {
    try {
      const [accountsRes, categoriesRes] = await Promise.all([
        axios.get(`${API}/accounts?token=${token}`),
        axios.get(`${API}/categories?token=${token}&type=expense`)
      ]);
      setAccounts(accountsRes.data);
      setCategories(categoriesRes.data);
      const bankAccount = accountsRes.data.find((a) => a.account_type === "bank");
      if (bankAccount) setSelectedAccount(bankAccount.id);
    } catch (err) { console.error("Fetch error:", err); }
  };

  const handleDrop = (e) => { e.preventDefault(); setDragOver(false); const droppedFile = e.dataTransfer.files[0]; if (droppedFile) { setFile(droppedFile); handleUpload(droppedFile); } };
  const handleFileSelect = (e) => { const selectedFile = e.target.files[0]; if (selectedFile) { setFile(selectedFile); handleUpload(selectedFile); } };

  const handleUpload = async (uploadFile) => {
    if (!uploadFile) return;
    setUploading(true);
    const formData = new FormData();
    formData.append("file", uploadFile);
    try {
      const res = await axios.post(`${API}/upload/bank-statement?account_id=${selectedAccount}&token=${token}`, formData, { headers: { "Content-Type": "multipart/form-data" } });
      setTransactions(res.data.transactions);
      toast.success(`Parsed ${res.data.count} transactions`);
    } catch (err) { toast.error(err.response?.data?.detail || "Upload failed"); } finally { setUploading(false); }
  };

  const openTagDialog = (txn) => {
    setSelectedTxnForTag(txn);
    setSelectedCategory(txn.category_id || "");
    setSelectedSubCategory("");
    setSelectedPayee(txn.payee_id || "");
    setShowCategoryDialog(true);
  };

  const applyTag = () => {
    if (!selectedTxnForTag) return;
    
    const categoryId = selectedSubCategory || selectedCategory;
    
    if (selectedIds.length > 0 && selectedIds.includes(selectedTxnForTag.id)) {
      // Bulk update
      setTransactions((prev) => prev.map((txn) => 
        selectedIds.includes(txn.id) 
          ? { ...txn, category_id: categoryId || null, payee_id: selectedPayee || null } 
          : txn
      ));
      toast.success(`Tagged ${selectedIds.length} transactions`);
      setSelectedIds([]);
    } else {
      // Single update
      setTransactions((prev) => prev.map((txn) => 
        txn.id === selectedTxnForTag.id 
          ? { ...txn, category_id: categoryId || null, payee_id: selectedPayee || null } 
          : txn
      ));
      toast.success("Transaction tagged");
    }
    
    setShowCategoryDialog(false);
    setSelectedTxnForTag(null);
    setSelectedCategory("");
    setSelectedSubCategory("");
    setSelectedPayee("");
  };

  const createNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await axios.post(`${API}/categories?token=${token}`, {
        name: newCategoryName,
        parent_id: selectedCategory || null,
        type: "expense"
      });
      toast.success("Category created");
      setNewCategoryName("");
      setShowNewCategory(false);
      fetchData();
      
      // Auto-select the new category
      if (selectedCategory) {
        setSelectedSubCategory(res.data.id);
      } else {
        setSelectedCategory(res.data.id);
      }
    } catch (err) {
      toast.error("Failed to create category");
    }
  };

  const toggleSelect = (id) => setSelectedIds((prev) => prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]);
  const toggleSelectAll = () => selectedIds.length === transactions.length ? setSelectedIds([]) : setSelectedIds(transactions.map((t) => t.id));

  const handleSave = async () => {
    if (transactions.length === 0) return;
    setSaving(true);
    try {
      const txnsToSave = transactions.map((txn) => ({ ...txn, account_id: selectedAccount }));
      await axios.post(`${API}/upload/save-transactions?token=${token}`, txnsToSave);
      toast.success(`Saved ${transactions.length} transactions`);
      setTransactions([]); setFile(null);
    } catch (err) { toast.error(err.response?.data?.detail || "Save failed"); } finally { setSaving(false); }
  };

  const getCategoryName = (categoryId) => {
    if (!categoryId) return null;
    for (const cat of categories) {
      if (cat.id === categoryId) return cat.name;
      if (cat.children) {
        const child = cat.children.find(c => c.id === categoryId);
        if (child) return `${cat.name} > ${child.name}`;
      }
    }
    return null;
  };

  const getPayeeName = (payeeId) => {
    const account = accounts.find(a => a.id === payeeId);
    return account?.name || null;
  };

  const bankAccounts = accounts.filter((a) => a.account_type === "bank");
  const payeeAccounts = accounts.filter((a) => a.account_type === "loan_receivable" || a.account_type === "loan_payable");
  const selectedCategoryData = categories.find(c => c.id === selectedCategory);

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="bank-upload-page">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bank Statement Upload</h1>
          <p className="text-gray-500 text-sm mt-1">Import HDFC bank statement (XLS/XLSX)</p>
        </div>
      </div>

      {/* Bank Account Selection */}
      {bankAccounts.length > 0 ? (
        <div className="card-surface p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1 max-w-xs">
              <label className="text-sm text-gray-600 mb-1 block">Select Bank Account</label>
              <Select value={selectedAccount} onValueChange={setSelectedAccount}>
                <SelectTrigger data-testid="account-select" className="bg-white"><SelectValue placeholder="Select bank account" /></SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((account) => (<SelectItem key={account.id} value={account.id}>{account.name}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <Link to="/accounts?create=bank">
              <Button variant="outline" size="sm" className="mt-6"><Plus size={14} className="mr-1" />Add Bank</Button>
            </Link>
          </div>
        </div>
      ) : (
        <div className="card-surface p-6 text-center">
          <p className="text-gray-600 mb-3">No bank accounts found. Create one first.</p>
          <Link to="/accounts?create=bank"><Button><Plus size={16} className="mr-2" />Create Bank Account</Button></Link>
        </div>
      )}

      {/* Upload Zone */}
      {transactions.length === 0 && bankAccounts.length > 0 && (
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
                <Button variant="outline" size="sm" onClick={() => {
                  const firstSelected = transactions.find(t => t.id === selectedIds[0]);
                  openTagDialog(firstSelected);
                }}>
                  <Tag size={14} className="mr-2" />Bulk Tag ({selectedIds.length})
                </Button>
              )}
              <Button onClick={handleSave} disabled={saving} data-testid="save-transactions-btn"><Save size={16} className="mr-2" />{saving ? "Saving..." : "Save All"}</Button>
              <Button variant="ghost" size="icon" onClick={() => { setTransactions([]); setFile(null); }} data-testid="clear-btn"><X size={18} /></Button>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full">
              <thead className="table-dense sticky top-0 bg-gray-50 z-10">
                <tr>
                  <th className="w-10"></th>
                  <th className="text-left">Date</th>
                  <th className="text-left">Description</th>
                  <th className="text-right">Amount</th>
                  <th className="text-left w-32">Type</th>
                  <th className="text-left w-48">Category / Payee</th>
                </tr>
              </thead>
              <tbody className="table-dense">
                {transactions.map((txn) => (
                  <tr key={txn.id} className={selectedIds.includes(txn.id) ? "bg-blue-50" : ""} data-testid={`transaction-row-${txn.id}`}>
                    <td><Checkbox checked={selectedIds.includes(txn.id)} onCheckedChange={() => toggleSelect(txn.id)} /></td>
                    <td className="font-mono text-sm">{txn.date}</td>
                    <td className="text-sm max-w-[250px] truncate" title={txn.description}>{txn.description}</td>
                    <td className={`font-mono text-sm text-right ${txn.transaction_type === "income" ? "text-emerald-600" : "text-rose-600"}`}>{formatCurrency(txn.amount)}</td>
                    <td><span className={`text-xs px-2 py-1 rounded ${txn.transaction_type === "income" ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{txn.transaction_type}</span></td>
                    <td>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="h-8 text-xs w-full justify-start"
                        onClick={() => openTagDialog(txn)}
                      >
                        {txn.category_id || txn.payee_id ? (
                          <span className="truncate flex items-center gap-1">
                            {txn.payee_id ? <ArrowRightLeft size={12} /> : <Folder size={12} />}
                            {getCategoryName(txn.category_id) || getPayeeName(txn.payee_id)}
                          </span>
                        ) : (
                          <span className="text-gray-400 flex items-center gap-1">
                            <Tag size={12} />
                            Tag...
                          </span>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 border-t border-gray-200">
            <div className="flex gap-6 text-sm">
              <div><span className="text-gray-500">Income: </span><span className="font-mono text-emerald-600">{formatCurrency(transactions.filter((t) => t.transaction_type === "income").reduce((sum, t) => sum + t.amount, 0))}</span></div>
              <div><span className="text-gray-500">Expense: </span><span className="font-mono text-rose-600">{formatCurrency(transactions.filter((t) => t.transaction_type === "expense").reduce((sum, t) => sum + t.amount, 0))}</span></div>
            </div>
            <div className="flex items-center gap-2 text-sm"><CheckCircle2 size={16} className="text-emerald-500" /><span className="text-gray-600">{transactions.filter((t) => t.category_id || t.payee_id).length}/{transactions.length} tagged</span></div>
          </div>
        </div>
      )}

      {/* Category Selection Dialog */}
      <Dialog open={showCategoryDialog} onOpenChange={setShowCategoryDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedIds.length > 1 ? `Tag ${selectedIds.length} Transactions` : "Tag Transaction"}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            {selectedTxnForTag && (
              <div className="p-3 bg-gray-50 rounded-lg text-sm">
                <p className="font-medium truncate">{selectedTxnForTag.description}</p>
                <p className={`font-mono ${selectedTxnForTag.transaction_type === "income" ? "text-emerald-600" : "text-rose-600"}`}>
                  {formatCurrency(selectedTxnForTag.amount)}
                </p>
              </div>
            )}

            {/* Category Selection */}
            <div>
              <label className="text-sm font-medium text-gray-700 mb-2 block">Category</label>
              <Select value={selectedCategory} onValueChange={(val) => { setSelectedCategory(val); setSelectedSubCategory(""); }}>
                <SelectTrigger className="bg-white">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {categories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      <span className="flex items-center gap-2">
                        <Folder size={14} />
                        {cat.name}
                        {cat.children?.length > 0 && <ChevronRight size={14} className="text-gray-400" />}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sub-category Selection */}
            {selectedCategoryData?.children?.length > 0 && (
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">Sub-category (optional)</label>
                <Select value={selectedSubCategory} onValueChange={setSelectedSubCategory}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select sub-category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Use parent category</SelectItem>
                    {selectedCategoryData.children.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Create new category/sub-category */}
            {!showNewCategory ? (
              <Button variant="ghost" size="sm" onClick={() => setShowNewCategory(true)} className="text-blue-600">
                <Plus size={14} className="mr-1" />
                {selectedCategory ? "Add sub-category" : "Add new category"}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input 
                  placeholder={selectedCategory ? "Sub-category name (e.g., Uber)" : "Category name"} 
                  value={newCategoryName} 
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1"
                />
                <Button size="sm" onClick={createNewCategory}>Add</Button>
                <Button size="sm" variant="ghost" onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }}>
                  <X size={14} />
                </Button>
              </div>
            )}

            {/* Transfer to Payee (for transfers) */}
            {payeeAccounts.length > 0 && (
              <div className="pt-4 border-t">
                <label className="text-sm font-medium text-gray-700 mb-2 block flex items-center gap-2">
                  <ArrowRightLeft size={14} />
                  Or mark as Transfer to
                </label>
                <Select value={selectedPayee} onValueChange={(val) => { setSelectedPayee(val); if (val) setSelectedCategory(""); }}>
                  <SelectTrigger className="bg-white">
                    <SelectValue placeholder="Select payee account" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not a transfer</SelectItem>
                    {payeeAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>{acc.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500 mt-1">For loans/transfers to specific people or accounts</p>
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCategoryDialog(false)}>Cancel</Button>
            <Button onClick={applyTag}>Apply Tag</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
