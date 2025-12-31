import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { format } from "date-fns";
import { CalendarIcon, Download, TrendingUp, TrendingDown, PieChart, BarChart3 } from "lucide-react";
import { PieChart as RePieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const formatCurrency = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 0 }).format(amount || 0);
const COLORS = ["#3b82f6", "#22c55e", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16"];

export default function Reports() {
  const { token } = useAuth();
  const [balanceSheet, setBalanceSheet] = useState(null);
  const [incomeExpense, setIncomeExpense] = useState(null);
  const [loading, setLoading] = useState(true);
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  useEffect(() => { fetchReports(); }, [token, startDate, endDate]);

  const fetchReports = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ token });
      if (startDate) params.append("start_date", format(startDate, "yyyy-MM-dd"));
      if (endDate) params.append("end_date", format(endDate, "yyyy-MM-dd"));
      const [bsRes, ieRes] = await Promise.all([
        axios.get(`${API}/reports/balance-sheet?token=${token}`),
        axios.get(`${API}/reports/income-expense?${params}`),
      ]);
      setBalanceSheet(bsRes.data);
      setIncomeExpense(ieRes.data);
    } catch (err) { console.error("Fetch reports error:", err); } finally { setLoading(false); }
  };

  const handleExport = async (type) => {
    try {
      const params = new URLSearchParams({ token });
      if (startDate) params.append("start_date", format(startDate, "yyyy-MM-dd"));
      if (endDate) params.append("end_date", format(endDate, "yyyy-MM-dd"));
      const endpoint = type === "balance-sheet" ? "balance-sheet" : "transactions";
      const response = await axios.get(`${API}/export/${endpoint}?${params}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${endpoint}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export downloaded");
    } catch (err) { toast.error("Export failed"); }
  };

  const incomeChartData = incomeExpense ? Object.entries(incomeExpense.income_by_tag).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })) : [];
  const expenseChartData = incomeExpense ? Object.entries(incomeExpense.expense_by_tag).map(([name, value]) => ({ name: name.replace(/_/g, " "), value })) : [];
  const comparisonData = incomeExpense ? [{ name: "Income", amount: incomeExpense.total_income }, { name: "Expense", amount: incomeExpense.total_expense }] : [];

  if (loading) return <div className="flex items-center justify-center h-64"><div className="text-gray-500">Loading reports...</div></div>;

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="reports-page">
      <div className="flex items-center justify-between">
        <div><h1 className="text-2xl font-bold text-gray-900">Reports</h1><p className="text-gray-500 text-sm mt-1">Financial statements and analysis</p></div>
      </div>

      <div className="card-surface p-4">
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-sm text-gray-600">Date Range:</span>
          <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" data-testid="report-start-date"><CalendarIcon size={14} className="mr-2" />{startDate ? format(startDate, "dd/MM/yy") : "From"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={startDate} onSelect={setStartDate} /></PopoverContent></Popover>
          <Popover><PopoverTrigger asChild><Button variant="outline" size="sm" data-testid="report-end-date"><CalendarIcon size={14} className="mr-2" />{endDate ? format(endDate, "dd/MM/yy") : "To"}</Button></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={endDate} onSelect={setEndDate} /></PopoverContent></Popover>
          {(startDate || endDate) && <Button variant="ghost" size="sm" onClick={() => { setStartDate(null); setEndDate(null); }} className="text-gray-500">Clear</Button>}
        </div>
      </div>

      <Tabs defaultValue="balance-sheet" className="space-y-6">
        <TabsList><TabsTrigger value="balance-sheet" data-testid="tab-balance-sheet">Balance Sheet</TabsTrigger><TabsTrigger value="income-expense" data-testid="tab-income-expense">Income & Expense</TabsTrigger></TabsList>

        <TabsContent value="balance-sheet" className="space-y-6">
          <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => handleExport("balance-sheet")} data-testid="export-balance-sheet"><Download size={14} className="mr-2" />Export Excel</Button></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="metric-card" data-testid="bs-total-assets"><div className="flex items-center gap-2 mb-2"><TrendingUp size={18} className="text-emerald-600" strokeWidth={1.5} /><p className="metric-label mb-0">Total Assets</p></div><p className="metric-value text-emerald-600">{formatCurrency(balanceSheet?.total_assets)}</p></div>
            <div className="metric-card" data-testid="bs-total-liabilities"><div className="flex items-center gap-2 mb-2"><TrendingDown size={18} className="text-rose-600" strokeWidth={1.5} /><p className="metric-label mb-0">Total Liabilities</p></div><p className="metric-value text-rose-600">{formatCurrency(balanceSheet?.total_liabilities)}</p></div>
            <div className="metric-card" data-testid="bs-net-worth"><p className="metric-label">Net Worth</p><p className={`metric-value ${balanceSheet?.net_worth >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatCurrency(balanceSheet?.net_worth)}</p></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-surface p-6" data-testid="assets-section">
              <h2 className="text-lg font-semibold text-emerald-600 mb-4 flex items-center gap-2"><TrendingUp size={20} strokeWidth={1.5} />Assets</h2>
              {Object.entries(balanceSheet?.assets || {}).map(([category, items]) => items.length === 0 ? null : (
                <div key={category} className="mb-4"><h3 className="text-sm text-gray-500 uppercase tracking-wider mb-2">{category.replace(/_/g, " ")}</h3>{items.map((item) => (<div key={item.id} className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-700">{item.name}</span><span className="font-mono text-emerald-600">{formatCurrency(item.current_balance)}</span></div>))}</div>
              ))}
              <div className="flex justify-between pt-4 border-t border-gray-200"><span className="font-semibold text-gray-900">Total Assets</span><span className="font-mono font-semibold text-emerald-600">{formatCurrency(balanceSheet?.total_assets)}</span></div>
            </div>
            <div className="card-surface p-6" data-testid="liabilities-section">
              <h2 className="text-lg font-semibold text-rose-600 mb-4 flex items-center gap-2"><TrendingDown size={20} strokeWidth={1.5} />Liabilities</h2>
              {Object.entries(balanceSheet?.liabilities || {}).map(([category, items]) => items.length === 0 ? null : (
                <div key={category} className="mb-4"><h3 className="text-sm text-gray-500 uppercase tracking-wider mb-2">{category.replace(/_/g, " ")}</h3>{items.map((item) => (<div key={item.id} className="flex justify-between py-2 border-b border-gray-100"><span className="text-gray-700">{item.name}</span><span className="font-mono text-rose-600">{formatCurrency(item.current_balance)}</span></div>))}</div>
              ))}
              <div className="flex justify-between pt-4 border-t border-gray-200"><span className="font-semibold text-gray-900">Total Liabilities</span><span className="font-mono font-semibold text-rose-600">{formatCurrency(balanceSheet?.total_liabilities)}</span></div>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="income-expense" className="space-y-6">
          <div className="flex justify-end"><Button variant="outline" size="sm" onClick={() => handleExport("transactions")} data-testid="export-income-expense"><Download size={14} className="mr-2" />Export Excel</Button></div>
          <div className="grid grid-cols-3 gap-4">
            <div className="metric-card" data-testid="ie-total-income"><div className="flex items-center gap-2 mb-2"><TrendingUp size={18} className="text-emerald-600" strokeWidth={1.5} /><p className="metric-label mb-0">Total Income</p></div><p className="metric-value text-emerald-600">{formatCurrency(incomeExpense?.total_income)}</p></div>
            <div className="metric-card" data-testid="ie-total-expense"><div className="flex items-center gap-2 mb-2"><TrendingDown size={18} className="text-rose-600" strokeWidth={1.5} /><p className="metric-label mb-0">Total Expense</p></div><p className="metric-value text-rose-600">{formatCurrency(incomeExpense?.total_expense)}</p></div>
            <div className="metric-card" data-testid="ie-net-income"><p className="metric-label">Net Income</p><p className={`metric-value ${incomeExpense?.net_income >= 0 ? "text-emerald-600" : "text-rose-600"}`}>{formatCurrency(incomeExpense?.net_income)}</p></div>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="card-surface p-6" data-testid="income-chart"><h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><PieChart size={20} className="text-emerald-600" strokeWidth={1.5} />Income by Category</h3>{incomeChartData.length > 0 ? (<ResponsiveContainer width="100%" height={250}><RePieChart><Pie data={incomeChartData} cx="50%" cy="50%" outerRadius={80} fill="#22c55e" dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>{incomeChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip formatter={(value) => formatCurrency(value)} /></RePieChart></ResponsiveContainer>) : (<div className="h-[250px] flex items-center justify-center text-gray-500">No income data</div>)}</div>
            <div className="card-surface p-6" data-testid="expense-chart"><h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><PieChart size={20} className="text-rose-600" strokeWidth={1.5} />Expense by Category</h3>{expenseChartData.length > 0 ? (<ResponsiveContainer width="100%" height={250}><RePieChart><Pie data={expenseChartData} cx="50%" cy="50%" outerRadius={80} fill="#ef4444" dataKey="value" label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} labelLine={false}>{expenseChartData.map((entry, index) => (<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />))}</Pie><Tooltip formatter={(value) => formatCurrency(value)} /></RePieChart></ResponsiveContainer>) : (<div className="h-[250px] flex items-center justify-center text-gray-500">No expense data</div>)}</div>
          </div>
          <div className="card-surface p-6" data-testid="comparison-chart"><h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><BarChart3 size={20} className="text-blue-600" strokeWidth={1.5} />Income vs Expense</h3><ResponsiveContainer width="100%" height={250}><BarChart data={comparisonData}><CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" /><XAxis dataKey="name" stroke="#6b7280" /><YAxis stroke="#6b7280" tickFormatter={(val) => `₹${(val / 1000).toFixed(0)}K`} /><Tooltip formatter={(value) => formatCurrency(value)} /><Bar dataKey="amount" radius={[4, 4, 0, 0]}><Cell fill="#22c55e" /><Cell fill="#ef4444" /></Bar></BarChart></ResponsiveContainer></div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
