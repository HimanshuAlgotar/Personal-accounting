import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus, Edit2, Trash2, Folder, ChevronRight, TrendingDown, TrendingUp } from "lucide-react";

const formatCurrency = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount || 0);

export default function Categories() {
  const { token } = useAuth();
  const [expenseCategories, setExpenseCategories] = useState([]);
  const [incomeCategories, setIncomeCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [activeTab, setActiveTab] = useState("expense");
  const [categoryStats, setCategoryStats] = useState({});

  const [formData, setFormData] = useState({
    name: "",
    parent_id: "",
    type: "expense",
  });

  useEffect(() => {
    fetchCategories();
    fetchCategoryStats();
  }, [token]);

  const fetchCategories = async () => {
    try {
      const [expenseRes, incomeRes] = await Promise.all([
        axios.get(`${API}/categories?token=${token}&type=expense`),
        axios.get(`${API}/categories?token=${token}&type=income`)
      ]);
      setExpenseCategories(expenseRes.data);
      setIncomeCategories(incomeRes.data);
    } catch (err) {
      console.error("Fetch categories error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchCategoryStats = async () => {
    try {
      const res = await axios.get(`${API}/reports/income-expense?token=${token}`);
      setCategoryStats({
        expense: res.data.expense_by_category || {},
        income: res.data.income_by_category || {}
      });
    } catch (err) {
      console.error("Fetch stats error:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const data = {
        ...formData,
        parent_id: formData.parent_id === "none" ? null : formData.parent_id || null,
        type: activeTab
      };
      
      if (editingCategory) {
        await axios.put(`${API}/categories/${editingCategory.id}?token=${token}`, data);
        toast.success("Category updated");
      } else {
        await axios.post(`${API}/categories?token=${token}`, data);
        toast.success("Category created");
      }
      setShowDialog(false);
      setEditingCategory(null);
      resetForm();
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save category");
    }
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      parent_id: category.parent_id || "",
      type: category.type,
    });
    setShowDialog(true);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this category? Sub-categories will also be deleted.")) return;
    try {
      await axios.delete(`${API}/categories/${id}?token=${token}`);
      toast.success("Category deleted");
      fetchCategories();
    } catch (err) {
      toast.error("Failed to delete category");
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      parent_id: "",
      type: "expense",
    });
  };

  const getCategoryTotal = (category, type) => {
    const stats = categoryStats[type] || {};
    let total = stats[category.name] || 0;
    // Add children totals
    if (category.children) {
      category.children.forEach(child => {
        total += stats[`${category.name} > ${child.name}`] || 0;
      });
    }
    return total;
  };

  const categories = activeTab === "expense" ? expenseCategories : incomeCategories;
  const parentCategories = categories.filter(c => !c.parent_id);

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="categories-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Categories</h1>
          <p className="text-gray-500 text-sm mt-1">Organize your income and expenses</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingCategory(null); setShowDialog(true); }} data-testid="create-category-btn">
          <Plus size={16} className="mr-2" />
          New Category
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-2 w-64">
          <TabsTrigger value="expense" className="flex items-center gap-2">
            <TrendingDown size={14} />
            Expenses
          </TabsTrigger>
          <TabsTrigger value="income" className="flex items-center gap-2">
            <TrendingUp size={14} />
            Income
          </TabsTrigger>
        </TabsList>

        <TabsContent value="expense" className="mt-6">
          <CategoryList 
            categories={expenseCategories} 
            type="expense"
            onEdit={handleEdit}
            onDelete={handleDelete}
            getCategoryTotal={(cat) => getCategoryTotal(cat, "expense")}
          />
        </TabsContent>

        <TabsContent value="income" className="mt-6">
          <CategoryList 
            categories={incomeCategories} 
            type="income"
            onEdit={handleEdit}
            onDelete={handleDelete}
            getCategoryTotal={(cat) => getCategoryTotal(cat, "income")}
          />
        </TabsContent>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingCategory ? "Edit Category" : "New Category"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Category Name</Label>
              <Input 
                value={formData.name} 
                onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
                className="mt-1" 
                placeholder="e.g., Food & Dining, Uber" 
                required 
                data-testid="category-name-input" 
              />
            </div>

            <div>
              <Label>Parent Category (optional)</Label>
              <Select value={formData.parent_id || "none"} onValueChange={(val) => setFormData({ ...formData, parent_id: val === "none" ? "" : val })}>
                <SelectTrigger className="mt-1 bg-white" data-testid="parent-category-select">
                  <SelectValue placeholder="No parent (top-level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No parent (top-level)</SelectItem>
                  {parentCategories.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500 mt-1">
                Select a parent to create a sub-category (e.g., Personal &gt; Uber)
              </p>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" data-testid="save-category-btn">{editingCategory ? "Update" : "Create"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function CategoryList({ categories, type, onEdit, onDelete, getCategoryTotal }) {
  if (categories.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <Folder size={40} className="mx-auto mb-4 text-gray-300" />
        <p>No {type} categories yet</p>
      </div>
    );
  }

  const formatCurrency = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(amount || 0);

  return (
    <div className="space-y-3">
      {categories.map((category) => (
        <div key={category.id} className="card-surface overflow-hidden">
          {/* Parent Category */}
          <div className="p-4 flex items-center justify-between group hover:bg-gray-50">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-md flex items-center justify-center ${type === "expense" ? "bg-rose-50" : "bg-emerald-50"}`}>
                <Folder size={20} className={type === "expense" ? "text-rose-600" : "text-emerald-600"} strokeWidth={1.5} />
              </div>
              <div>
                <h3 className="font-medium text-gray-900">{category.name}</h3>
                {category.children?.length > 0 && (
                  <p className="text-xs text-gray-500">{category.children.length} sub-categories</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={`font-mono text-sm ${type === "expense" ? "text-rose-600" : "text-emerald-600"}`}>
                {formatCurrency(getCategoryTotal(category))}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(category)}>
                  <Edit2 size={14} className="text-gray-500" />
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDelete(category.id)}>
                  <Trash2 size={14} className="text-gray-500 hover:text-rose-600" />
                </Button>
              </div>
            </div>
          </div>

          {/* Sub-categories */}
          {category.children?.length > 0 && (
            <div className="border-t border-gray-100 bg-gray-50/50">
              {category.children.map((child) => (
                <div key={child.id} className="px-4 py-3 flex items-center justify-between group hover:bg-gray-100 ml-8 border-b border-gray-100 last:border-0">
                  <div className="flex items-center gap-2">
                    <ChevronRight size={14} className="text-gray-400" />
                    <span className="text-sm text-gray-700">{child.name}</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(child)}>
                        <Edit2 size={12} className="text-gray-500" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onDelete(child.id)}>
                        <Trash2 size={12} className="text-gray-500 hover:text-rose-600" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
