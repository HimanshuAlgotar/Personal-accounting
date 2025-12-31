import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import { useSearchParams } from "react-router-dom";
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
import { Plus, Edit2, Trash2, Banknote, Wallet, CreditCard, TrendingUp, TrendingDown, Building2 } from "lucide-react";

const LEDGER_TYPES = [
  { value: "asset", label: "Asset", icon: TrendingUp, color: "text-emerald-400" },
  { value: "liability", label: "Liability", icon: TrendingDown, color: "text-rose-400" },
  { value: "income", label: "Income", icon: TrendingUp, color: "text-indigo-400" },
  { value: "expense", label: "Expense", icon: TrendingDown, color: "text-amber-400" },
];

const CATEGORIES = {
  asset: [
    { value: "bank", label: "Bank Account", icon: Banknote },
    { value: "cash", label: "Cash", icon: Wallet },
    { value: "loan_receivable", label: "Loan Receivable", icon: TrendingUp },
    { value: "investment", label: "Investment", icon: Building2 },
    { value: "other_asset", label: "Other Asset", icon: TrendingUp },
  ],
  liability: [
    { value: "loan_payable", label: "Loan Payable", icon: TrendingDown },
    { value: "credit_card", label: "Credit Card", icon: CreditCard },
    { value: "od", label: "Bank Overdraft", icon: Banknote },
    { value: "other_liability", label: "Other Liability", icon: TrendingDown },
  ],
  income: [
    { value: "personal_income", label: "Personal Income", icon: TrendingUp },
    { value: "interest_income", label: "Interest Income", icon: TrendingUp },
    { value: "investment_income", label: "Investment Income", icon: TrendingUp },
    { value: "other_income", label: "Other Income", icon: TrendingUp },
  ],
  expense: [
    { value: "personal_expense", label: "Personal Expense", icon: TrendingDown },
    { value: "interest_expense", label: "Interest Expense", icon: TrendingDown },
    { value: "other_expense", label: "Other Expense", icon: TrendingDown },
  ],
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export default function Ledgers() {
  const { token } = useAuth();
  const [searchParams] = useSearchParams();
  const [ledgers, setLedgers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingLedger, setEditingLedger] = useState(null);
  const [filterType, setFilterType] = useState("all");

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    type: "asset",
    category: "bank",
    description: "",
    opening_balance: 0,
    person_name: "",
  });

  useEffect(() => {
    fetchLedgers();
    // Check if we need to open create dialog
    const createParam = searchParams.get("create");
    if (createParam) {
      setFormData((prev) => ({
        ...prev,
        category: createParam,
        type: createParam === "bank" ? "asset" : prev.type,
      }));
      setShowDialog(true);
    }
  }, [token, searchParams]);

  const fetchLedgers = async () => {
    try {
      const res = await axios.get(`${API}/ledgers?token=${token}`);
      setLedgers(res.data);
    } catch (err) {
      console.error("Fetch ledgers error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLedger) {
        await axios.put(`${API}/ledgers/${editingLedger.id}?token=${token}`, formData);
        toast.success("Ledger updated");
      } else {
        await axios.post(`${API}/ledgers?token=${token}`, formData);
        toast.success("Ledger created");
      }
      setShowDialog(false);
      setEditingLedger(null);
      resetForm();
      fetchLedgers();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save ledger");
    }
  };

  const handleEdit = (ledger) => {
    setEditingLedger(ledger);
    setFormData({
      name: ledger.name,
      type: ledger.type,
      category: ledger.category,
      description: ledger.description,
      opening_balance: ledger.opening_balance,
      person_name: ledger.person_name || "",
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this ledger? This cannot be undone.")) return;
    try {
      await axios.delete(`${API}/ledgers/${id}?token=${token}`);
      toast.success("Ledger deleted");
      fetchLedgers();
    } catch (err) {
      toast.error("Failed to delete ledger");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      type: "asset",
      category: "bank",
      description: "",
      opening_balance: 0,
      person_name: "",
    });
  };

  const getCategoryIcon = (category) => {
    for (const cats of Object.values(CATEGORIES)) {
      const found = cats.find((c) => c.value === category);
      if (found) return found.icon;
    }
    return Banknote;
  };

  const filteredLedgers = filterType === "all"
    ? ledgers
    : ledgers.filter((l) => l.type === filterType);

  const groupedLedgers = filteredLedgers.reduce((acc, ledger) => {
    const type = ledger.type;
    if (!acc[type]) acc[type] = [];
    acc[type].push(ledger);
    return acc;
  }, {});

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="ledgers-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Ledgers</h1>
          <p className="text-slate-400 text-sm mt-1">
            Manage your accounts and categories
          </p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setEditingLedger(null);
            setShowDialog(true);
          }}
          className="btn-primary text-white"
          data-testid="create-ledger-btn"
        >
          <Plus size={16} className="mr-2" />
          New Ledger
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filterType === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterType("all")}
          className={filterType === "all" ? "btn-primary text-white" : "border-slate-700 text-slate-300"}
          data-testid="filter-all"
        >
          All
        </Button>
        {LEDGER_TYPES.map((type) => (
          <Button
            key={type.value}
            variant={filterType === type.value ? "default" : "outline"}
            size="sm"
            onClick={() => setFilterType(type.value)}
            className={filterType === type.value ? "btn-primary text-white" : "border-slate-700 text-slate-300"}
            data-testid={`filter-${type.value}`}
          >
            {type.label}
          </Button>
        ))}
      </div>

      {/* Ledgers by Type */}
      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading...</div>
      ) : (
        <div className="space-y-6">
          {Object.entries(groupedLedgers).map(([type, typeLedgers]) => {
            const typeConfig = LEDGER_TYPES.find((t) => t.value === type);
            return (
              <div key={type} className="space-y-3">
                <h2 className={`text-sm font-bold uppercase tracking-wider ${typeConfig?.color || "text-slate-400"}`}>
                  {typeConfig?.label || type} ({typeLedgers.length})
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {typeLedgers.map((ledger) => {
                    const Icon = getCategoryIcon(ledger.category);
                    return (
                      <div
                        key={ledger.id}
                        className="card-surface rounded-sm p-4 hover:border-slate-700 transition-colors"
                        data-testid={`ledger-card-${ledger.id}`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-sm flex items-center justify-center ${
                              type === "asset" ? "bg-emerald-900/30" :
                              type === "liability" ? "bg-rose-900/30" :
                              type === "income" ? "bg-indigo-900/30" :
                              "bg-amber-900/30"
                            }`}>
                              <Icon size={20} className={typeConfig?.color || "text-slate-400"} strokeWidth={1.5} />
                            </div>
                            <div>
                              <h3 className="font-medium text-white">{ledger.name}</h3>
                              <p className="text-xs text-slate-500">{ledger.category.replace(/_/g, " ")}</p>
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-slate-300"
                              onClick={() => handleEdit(ledger)}
                              data-testid={`edit-ledger-${ledger.id}`}
                            >
                              <Edit2 size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-rose-400"
                              onClick={() => handleDelete(ledger.id)}
                              data-testid={`delete-ledger-${ledger.id}`}
                            >
                              <Trash2 size={14} />
                            </Button>
                          </div>
                        </div>
                        <div className="mt-4">
                          <p className="text-xs text-slate-500">Current Balance</p>
                          <p className={`font-mono text-lg ${
                            ledger.current_balance >= 0 ? "text-emerald-400" : "text-rose-400"
                          }`}>
                            {formatCurrency(ledger.current_balance)}
                          </p>
                        </div>
                        {ledger.description && (
                          <p className="text-xs text-slate-500 mt-2 truncate">{ledger.description}</p>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {Object.keys(groupedLedgers).length === 0 && (
            <div className="text-center py-12 text-slate-500">
              <p>No ledgers found</p>
              <Button
                variant="link"
                className="text-indigo-400 mt-2"
                onClick={() => setShowDialog(true)}
              >
                Create your first ledger
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              {editingLedger ? "Edit Ledger" : "New Ledger"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-slate-300">Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="bg-slate-950 border-slate-700 mt-1"
                placeholder="e.g., HDFC Savings"
                required
                data-testid="ledger-name-input"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(val) =>
                    setFormData({
                      ...formData,
                      type: val,
                      category: CATEGORIES[val][0].value,
                    })
                  }
                >
                  <SelectTrigger className="bg-slate-950 border-slate-700 mt-1" data-testid="ledger-type-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LEDGER_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-slate-300">Category</Label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="bg-slate-950 border-slate-700 mt-1" data-testid="ledger-category-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES[formData.type]?.map((c) => (
                      <SelectItem key={c.value} value={c.value}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Opening Balance (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={formData.opening_balance}
                onChange={(e) =>
                  setFormData({ ...formData, opening_balance: parseFloat(e.target.value) || 0 })
                }
                className="bg-slate-950 border-slate-700 mt-1 font-mono"
                data-testid="ledger-balance-input"
              />
            </div>

            {(formData.category === "loan_receivable" || formData.category === "loan_payable") && (
              <div>
                <Label className="text-slate-300">Person Name</Label>
                <Input
                  value={formData.person_name}
                  onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                  className="bg-slate-950 border-slate-700 mt-1"
                  placeholder="Name of the person"
                  data-testid="ledger-person-input"
                />
              </div>
            )}

            <div>
              <Label className="text-slate-300">Description (Optional)</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="bg-slate-950 border-slate-700 mt-1 h-20"
                placeholder="Notes about this ledger"
                data-testid="ledger-description-input"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="border-slate-700 text-slate-300">
                Cancel
              </Button>
              <Button type="submit" className="btn-primary text-white" data-testid="save-ledger-btn">
                {editingLedger ? "Update" : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
