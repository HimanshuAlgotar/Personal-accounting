import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { ArrowRightLeft, TrendingDown, TrendingUp, Check, Folder, Plus, X, Handshake } from "lucide-react";

const formatCurrency = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount || 0);

export default function AddEntry() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [flatCategories, setFlatCategories] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("expense");

  // Expense/Income form
  const [entryData, setEntryData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    account_id: "",
    amount: "",
    description: "",
    category_id: "",
    sub_category_id: "",
    linked_loan_id: "",
    notes: "",
  });

  // Transfer form
  const [transferData, setTransferData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    from_account_id: "",
    to_account_id: "",
    amount: "",
    description: "",
    notes: "",
  });

  // New category
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  useEffect(() => { fetchData(); }, [token]);

  const fetchData = async () => {
    try {
      const [accountsRes, categoriesRes, flatCatRes] = await Promise.all([
        axios.get(`${API}/accounts?token=${token}`),
        axios.get(`${API}/categories?token=${token}`),
        axios.get(`${API}/categories/flat?token=${token}`)
      ]);
      setAccounts(accountsRes.data);
      setCategories(categoriesRes.data);
      setFlatCategories(flatCatRes.data);
      
      // Set default account
      const defaultAccount = accountsRes.data.find(a => a.account_type === "bank" || a.account_type === "cash");
      if (defaultAccount) {
        setEntryData(prev => ({ ...prev, account_id: defaultAccount.id }));
        setTransferData(prev => ({ ...prev, from_account_id: defaultAccount.id }));
      }
    } catch (err) { console.error("Fetch error:", err); }
  };

  const handleEntrySubmit = async (e) => {
    e.preventDefault();
    if (!entryData.account_id) { toast.error("Please select an account"); return; }
    
    setLoading(true);
    try {
      const categoryId = entryData.sub_category_id || entryData.category_id;
      
      await axios.post(`${API}/transactions?token=${token}`, {
        date: entryData.date,
        description: entryData.description,
        amount: parseFloat(entryData.amount) || 0,
        account_id: entryData.account_id,
        category_id: categoryId || null,
        linked_loan_id: entryData.linked_loan_id || null,
        transaction_type: activeTab,
        notes: entryData.notes,
      });
      
      toast.success(`${activeTab === "income" ? "Income" : "Expense"} recorded`);
      setEntryData({
        date: format(new Date(), "yyyy-MM-dd"),
        account_id: entryData.account_id,
        amount: "",
        description: "",
        category_id: "",
        sub_category_id: "",
        linked_loan_id: "",
        notes: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to record entry");
    } finally {
      setLoading(false);
    }
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferData.from_account_id || !transferData.to_account_id) {
      toast.error("Please select both accounts"); return;
    }
    if (transferData.from_account_id === transferData.to_account_id) {
      toast.error("Cannot transfer to same account"); return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/transactions?token=${token}`, {
        date: transferData.date,
        description: transferData.description,
        amount: parseFloat(transferData.amount) || 0,
        account_id: transferData.from_account_id,
        payee_id: transferData.to_account_id,
        transaction_type: "transfer",
        notes: transferData.notes,
      });
      
      toast.success("Transfer recorded");
      setTransferData({
        date: format(new Date(), "yyyy-MM-dd"),
        from_account_id: transferData.from_account_id,
        to_account_id: "",
        amount: "",
        description: "",
        notes: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to record transfer");
    } finally {
      setLoading(false);
    }
  };

  const createNewCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await axios.post(`${API}/categories?token=${token}`, {
        name: newCategoryName,
        parent_id: entryData.category_id || null,
        type: activeTab === "income" ? "income" : "expense"
      });
      toast.success("Category created");
      setNewCategoryName("");
      setShowNewCategory(false);
      fetchData();
      
      if (entryData.category_id) {
        setEntryData(prev => ({ ...prev, sub_category_id: res.data.id }));
      } else {
        setEntryData(prev => ({ ...prev, category_id: res.data.id }));
      }
    } catch (err) {
      toast.error("Failed to create category");
    }
  };

  const getAccountBalance = (id) => {
    const account = accounts.find((a) => a.id === id);
    return account ? formatCurrency(account.current_balance) : "";
  };

  const expenseCategories = categories.filter(c => c.type === "expense");
  const incomeCategories = categories.filter(c => c.type === "income");
  const currentCategories = activeTab === "income" ? incomeCategories : expenseCategories;
  const selectedCategoryData = currentCategories.find(c => c.id === entryData.category_id);

  const assetAccounts = accounts.filter(a => ["bank", "cash", "investment"].includes(a.account_type));
  const loanAccounts = accounts.filter(a => ["loan_receivable", "loan_payable"].includes(a.account_type));
  const allAccounts = accounts;

  // Check if Interest category is selected
  const isInterestCategory = selectedCategoryData?.name === "Interest Paid" || selectedCategoryData?.name === "Interest Received";

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn" data-testid="add-entry-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Entry</h1>
        <p className="text-gray-500 text-sm mt-1">Record income, expenses, or transfers</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-3 w-full">
          <TabsTrigger value="expense" className="flex items-center gap-2">
            <TrendingDown size={16} />
            Expense
          </TabsTrigger>
          <TabsTrigger value="income" className="flex items-center gap-2">
            <TrendingUp size={16} />
            Income
          </TabsTrigger>
          <TabsTrigger value="transfer" className="flex items-center gap-2">
            <ArrowRightLeft size={16} />
            Transfer
          </TabsTrigger>
        </TabsList>

        {/* Expense Tab */}
        <TabsContent value="expense">
          <form onSubmit={handleEntrySubmit} className="card-surface p-6 space-y-5">
            <p className="text-sm text-gray-600 mb-4">Record an expense entry</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={entryData.date} onChange={(e) => setEntryData({ ...entryData, date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Account</Label>
                <Select value={entryData.account_id} onValueChange={(val) => setEntryData({ ...entryData, account_id: val })}>
                  <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {assetAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {entryData.account_id && (
                  <p className="text-xs text-gray-500 mt-1">Balance: {getAccountBalance(entryData.account_id)}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Amount (₹)</Label>
              <Input 
                type="number" 
                step="0.01" 
                min="0" 
                value={entryData.amount} 
                onChange={(e) => setEntryData({ ...entryData, amount: e.target.value })} 
                className="mt-1 font-mono text-lg" 
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input 
                value={entryData.description} 
                onChange={(e) => setEntryData({ ...entryData, description: e.target.value })} 
                className="mt-1" 
                placeholder="e.g., Groceries, Uber ride"
                required
              />
            </div>

            {/* Category Selection */}
            <div>
              <Label className="flex items-center gap-2"><Folder size={14} /> Category</Label>
              <Select value={entryData.category_id} onValueChange={(val) => setEntryData({ ...entryData, category_id: val, sub_category_id: "", linked_loan_id: "" })}>
                <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {expenseCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Sub-category Selection */}
            {selectedCategoryData?.children?.length > 0 && (
              <div>
                <Label>Sub-category (optional)</Label>
                <Select value={entryData.sub_category_id} onValueChange={(val) => setEntryData({ ...entryData, sub_category_id: val })}>
                  <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select sub-category" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Use parent category</SelectItem>
                    {selectedCategoryData.children.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>{sub.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Link to Loan - Show for Interest Paid */}
            {isInterestCategory && loanAccounts.length > 0 && (
              <div className="p-3 bg-amber-50 rounded-lg border border-amber-200">
                <Label className="flex items-center gap-2 text-amber-800"><Handshake size={14} /> Link Interest to Loan</Label>
                <Select value={entryData.linked_loan_id} onValueChange={(val) => setEntryData({ ...entryData, linked_loan_id: val })}>
                  <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select loan account" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific loan</SelectItem>
                    {loanAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} {acc.person_name ? `(${acc.person_name})` : ""} - {formatCurrency(acc.current_balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-amber-700 mt-1">Track which loan this interest payment belongs to</p>
              </div>
            )}

            {/* Create new category */}
            {!showNewCategory ? (
              <Button type="button" variant="ghost" size="sm" onClick={() => setShowNewCategory(true)} className="text-blue-600">
                <Plus size={14} className="mr-1" />
                {entryData.category_id ? "Add sub-category" : "Add new category"}
              </Button>
            ) : (
              <div className="flex gap-2">
                <Input 
                  placeholder={entryData.category_id ? "Sub-category name" : "Category name"} 
                  value={newCategoryName} 
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  className="flex-1"
                />
                <Button type="button" size="sm" onClick={createNewCategory}>Add</Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => { setShowNewCategory(false); setNewCategoryName(""); }}>
                  <X size={14} />
                </Button>
              </div>
            )}

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea 
                value={entryData.notes} 
                onChange={(e) => setEntryData({ ...entryData, notes: e.target.value })} 
                className="mt-1 h-20" 
                placeholder="Any additional notes"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <Check size={16} className="mr-2" />
              {loading ? "Processing..." : "Record Expense"}
            </Button>
          </form>
        </TabsContent>

        {/* Income Tab */}
        <TabsContent value="income">
          <form onSubmit={handleEntrySubmit} className="card-surface p-6 space-y-5">
            <p className="text-sm text-gray-600 mb-4">Record an income entry</p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={entryData.date} onChange={(e) => setEntryData({ ...entryData, date: e.target.value })} className="mt-1" />
              </div>
              <div>
                <Label>Account</Label>
                <Select value={entryData.account_id} onValueChange={(val) => setEntryData({ ...entryData, account_id: val })}>
                  <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select account" /></SelectTrigger>
                  <SelectContent>
                    {assetAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {entryData.account_id && (
                  <p className="text-xs text-gray-500 mt-1">Balance: {getAccountBalance(entryData.account_id)}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Amount (₹)</Label>
              <Input 
                type="number" 
                step="0.01" 
                min="0" 
                value={entryData.amount} 
                onChange={(e) => setEntryData({ ...entryData, amount: e.target.value })} 
                className="mt-1 font-mono text-lg" 
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input 
                value={entryData.description} 
                onChange={(e) => setEntryData({ ...entryData, description: e.target.value })} 
                className="mt-1" 
                placeholder="e.g., Salary, Freelance payment"
                required
              />
            </div>

            {/* Category Selection */}
            <div>
              <Label className="flex items-center gap-2"><Folder size={14} /> Category</Label>
              <Select value={entryData.category_id} onValueChange={(val) => setEntryData({ ...entryData, category_id: val, sub_category_id: "", linked_loan_id: "" })}>
                <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No category</SelectItem>
                  {incomeCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Link to Loan - Show for Interest Received */}
            {selectedCategoryData?.name === "Interest Received" && loanAccounts.length > 0 && (
              <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-200">
                <Label className="flex items-center gap-2 text-emerald-800"><Handshake size={14} /> Link Interest to Loan</Label>
                <Select value={entryData.linked_loan_id} onValueChange={(val) => setEntryData({ ...entryData, linked_loan_id: val })}>
                  <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select loan account" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No specific loan</SelectItem>
                    {loanAccounts.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id}>
                        {acc.name} {acc.person_name ? `(${acc.person_name})` : ""} - {formatCurrency(acc.current_balance)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-emerald-700 mt-1">Track which loan this interest payment is from</p>
              </div>
            )}

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea 
                value={entryData.notes} 
                onChange={(e) => setEntryData({ ...entryData, notes: e.target.value })} 
                className="mt-1 h-20" 
                placeholder="Any additional notes"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <Check size={16} className="mr-2" />
              {loading ? "Processing..." : "Record Income"}
            </Button>
          </form>
        </TabsContent>

        {/* Transfer Tab */}
        <TabsContent value="transfer">
          <form onSubmit={handleTransferSubmit} className="card-surface p-6 space-y-5">
            <p className="text-sm text-gray-600 mb-4">
              Transfer money between accounts (bank to loan, bank to bank, etc.)
            </p>
            
            <div>
              <Label>Date</Label>
              <Input type="date" value={transferData.date} onChange={(e) => setTransferData({ ...transferData, date: e.target.value })} className="mt-1" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Account</Label>
                <Select value={transferData.from_account_id} onValueChange={(val) => setTransferData({ ...transferData, from_account_id: val })}>
                  <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {allAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {transferData.from_account_id && (
                  <p className="text-xs text-gray-500 mt-1">Balance: {getAccountBalance(transferData.from_account_id)}</p>
                )}
              </div>

              <div>
                <Label>To Account</Label>
                <Select value={transferData.to_account_id} onValueChange={(val) => setTransferData({ ...transferData, to_account_id: val })}>
                  <SelectTrigger className="mt-1 bg-white"><SelectValue placeholder="Select destination" /></SelectTrigger>
                  <SelectContent>
                    {allAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {transferData.to_account_id && (
                  <p className="text-xs text-gray-500 mt-1">Balance: {getAccountBalance(transferData.to_account_id)}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Amount (₹)</Label>
              <Input 
                type="number" 
                step="0.01" 
                min="0" 
                value={transferData.amount} 
                onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })} 
                className="mt-1 font-mono text-lg" 
                placeholder="0.00"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Input 
                value={transferData.description} 
                onChange={(e) => setTransferData({ ...transferData, description: e.target.value })} 
                className="mt-1" 
                placeholder="e.g., Loan payment to Akash"
                required
              />
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea 
                value={transferData.notes} 
                onChange={(e) => setTransferData({ ...transferData, notes: e.target.value })} 
                className="mt-1 h-20" 
                placeholder="Any additional notes"
              />
            </div>

            <Button type="submit" className="w-full" disabled={loading}>
              <Check size={16} className="mr-2" />
              {loading ? "Processing..." : "Record Transfer"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
