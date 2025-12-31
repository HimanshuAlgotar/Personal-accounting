import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Wallet,
  Banknote,
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  TrendingDown,
  Upload,
  Plus,
  CreditCard,
  Folder,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
  }).format(amount || 0);
};

export default function Dashboard() {
  const { token } = useAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboard();
  }, [token]);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(`${API}/reports/dashboard?token=${token}`);
      setData(res.data);
    } catch (err) {
      console.error("Dashboard fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 text-sm mt-1">Your financial overview</p>
        </div>
        <div className="flex gap-2">
          <Link to="/upload">
            <Button variant="outline" size="sm" data-testid="upload-btn">
              <Upload size={16} className="mr-2" />
              Upload Statement
            </Button>
          </Link>
          <Link to="/add-entry">
            <Button size="sm" data-testid="add-entry-btn">
              <Plus size={16} className="mr-2" />
              Add Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* Net Worth Card */}
      <div className="net-worth-card metric-card p-6 rounded-lg" data-testid="net-worth-card">
        <div className="relative z-10">
          <p className="text-xs uppercase tracking-wider text-white/70 mb-1">Net Worth</p>
          <p className="text-3xl font-mono font-bold text-white" data-testid="net-worth-value">
            {formatCurrency(data?.net_worth)}
          </p>
          <div className="flex gap-8 mt-4">
            <div>
              <p className="text-xs text-white/60">Total Assets</p>
              <p className="font-mono text-emerald-300" data-testid="total-assets">{formatCurrency(data?.total_assets)}</p>
            </div>
            <div>
              <p className="text-xs text-white/60">Total Liabilities</p>
              <p className="font-mono text-rose-300" data-testid="total-liabilities">{formatCurrency(data?.total_liabilities)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card" data-testid="bank-balance-card">
          <div className="flex items-center gap-2 mb-2">
            <Banknote size={18} className="text-blue-600" strokeWidth={1.5} />
            <p className="metric-label mb-0">Bank Balance</p>
          </div>
          <p className="metric-value" data-testid="bank-balance">{formatCurrency(data?.bank_balance)}</p>
        </div>

        <div className="metric-card" data-testid="cash-balance-card">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={18} className="text-emerald-600" strokeWidth={1.5} />
            <p className="metric-label mb-0">Cash in Hand</p>
          </div>
          <p className="metric-value" data-testid="cash-balance">{formatCurrency(data?.cash_balance)}</p>
        </div>

        <div className="metric-card" data-testid="loans-receivable-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight size={18} className="text-amber-600" strokeWidth={1.5} />
            <p className="metric-label mb-0">Loans Receivable</p>
          </div>
          <p className="metric-value text-emerald-600" data-testid="loans-receivable">{formatCurrency(data?.loans_receivable)}</p>
        </div>

        <div className="metric-card" data-testid="loans-payable-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight size={18} className="text-rose-600" strokeWidth={1.5} />
            <p className="metric-label mb-0">Loans Payable</p>
          </div>
          <p className="metric-value text-rose-600" data-testid="loans-payable">{formatCurrency(data?.loans_payable)}</p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card" data-testid="investments-card">
          <p className="metric-label">Investments</p>
          <p className="metric-value text-blue-600" data-testid="investments">{formatCurrency(data?.investments)}</p>
        </div>

        <div className="metric-card" data-testid="credit-cards-card">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={18} className="text-rose-600" strokeWidth={1.5} />
            <p className="metric-label mb-0">Credit Cards</p>
          </div>
          <p className="metric-value text-rose-600" data-testid="credit-cards">{formatCurrency(data?.credit_cards)}</p>
        </div>

        <div className="metric-card" data-testid="monthly-income-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-emerald-600" strokeWidth={1.5} />
            <p className="metric-label mb-0">Monthly Income</p>
          </div>
          <p className="metric-value text-emerald-600" data-testid="monthly-income">{formatCurrency(data?.monthly_income)}</p>
        </div>

        <div className="metric-card" data-testid="monthly-expense-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={18} className="text-rose-600" strokeWidth={1.5} />
            <p className="metric-label mb-0">Monthly Expense</p>
          </div>
          <p className="metric-value text-rose-600" data-testid="monthly-expense">{formatCurrency(data?.monthly_expense)}</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card-surface p-6" data-testid="recent-transactions">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">Recent Transactions</h2>
          <Link to="/transactions" className="text-sm text-blue-600 hover:text-blue-700 font-medium">
            View All →
          </Link>
        </div>

        {data?.recent_transactions?.length > 0 ? (
          <div className="space-y-1">
            {data.recent_transactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0 hover:bg-gray-50 -mx-2 px-2 rounded"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{txn.description}</p>
                  <p className="text-xs text-gray-500 font-mono">{txn.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  {txn.category_name && (
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-1 rounded bg-gray-100 text-gray-600">
                      <Folder size={10} />
                      {txn.category_name}
                    </span>
                  )}
                  <p className={`font-mono text-sm font-medium ${
                    txn.transaction_type === "income" ? "text-emerald-600" : 
                    txn.transaction_type === "transfer" ? "text-blue-600" : "text-rose-600"
                  }`}>
                    {txn.transaction_type === "income" ? "+" : txn.transaction_type === "transfer" ? "↔" : "-"}{formatCurrency(txn.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-gray-500">
            <p>No transactions yet</p>
            <Link to="/upload" className="text-blue-600 hover:text-blue-700 text-sm mt-2 inline-block font-medium">
              Upload your first bank statement →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
