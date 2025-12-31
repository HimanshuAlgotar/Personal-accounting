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
} from "lucide-react";
import { Button } from "@/components/ui/button";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
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
        <div className="text-slate-400">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="dashboard-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Dashboard</h1>
          <p className="text-slate-400 text-sm mt-1">Your financial overview</p>
        </div>
        <div className="flex gap-2">
          <Link to="/upload">
            <Button variant="outline" size="sm" className="border-slate-700 text-slate-300" data-testid="upload-btn">
              <Upload size={16} className="mr-2" />
              Upload Statement
            </Button>
          </Link>
          <Link to="/cash">
            <Button size="sm" className="btn-primary text-white" data-testid="add-cash-btn">
              <Plus size={16} className="mr-2" />
              Add Entry
            </Button>
          </Link>
        </div>
      </div>

      {/* Net Worth Card */}
      <div className="net-worth-card metric-card p-6" data-testid="net-worth-card">
        <div className="relative z-10">
          <p className="metric-label">Net Worth</p>
          <p className={`text-3xl font-mono font-bold ${data?.net_worth >= 0 ? "text-emerald-400" : "text-rose-400"}`} data-testid="net-worth-value">
            {formatCurrency(data?.net_worth)}
          </p>
          <div className="flex gap-6 mt-4">
            <div>
              <p className="text-xs text-slate-500">Total Assets</p>
              <p className="font-mono text-emerald-400" data-testid="total-assets">{formatCurrency(data?.total_assets)}</p>
            </div>
            <div>
              <p className="text-xs text-slate-500">Total Liabilities</p>
              <p className="font-mono text-rose-400" data-testid="total-liabilities">{formatCurrency(data?.total_liabilities)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card" data-testid="bank-balance-card">
          <div className="flex items-center gap-2 mb-2">
            <Banknote size={18} className="text-indigo-400" strokeWidth={1.5} />
            <p className="metric-label mb-0">Bank Balance</p>
          </div>
          <p className="metric-value text-white" data-testid="bank-balance">{formatCurrency(data?.bank_balance)}</p>
        </div>

        <div className="metric-card" data-testid="cash-balance-card">
          <div className="flex items-center gap-2 mb-2">
            <Wallet size={18} className="text-emerald-400" strokeWidth={1.5} />
            <p className="metric-label mb-0">Cash in Hand</p>
          </div>
          <p className="metric-value text-white" data-testid="cash-balance">{formatCurrency(data?.cash_balance)}</p>
        </div>

        <div className="metric-card" data-testid="loans-receivable-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight size={18} className="text-amber-400" strokeWidth={1.5} />
            <p className="metric-label mb-0">Loans Receivable</p>
          </div>
          <p className="metric-value text-emerald-400" data-testid="loans-receivable">{formatCurrency(data?.loans_receivable)}</p>
        </div>

        <div className="metric-card" data-testid="loans-payable-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight size={18} className="text-rose-400" strokeWidth={1.5} />
            <p className="metric-label mb-0">Loans Payable</p>
          </div>
          <p className="metric-value text-rose-400" data-testid="loans-payable">{formatCurrency(data?.loans_payable)}</p>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="metric-card" data-testid="investments-card">
          <p className="metric-label">Investments</p>
          <p className="metric-value text-indigo-400" data-testid="investments">{formatCurrency(data?.investments)}</p>
        </div>

        <div className="metric-card" data-testid="credit-cards-card">
          <div className="flex items-center gap-2 mb-2">
            <CreditCard size={18} className="text-rose-400" strokeWidth={1.5} />
            <p className="metric-label mb-0">Credit Cards</p>
          </div>
          <p className="metric-value text-rose-400" data-testid="credit-cards">{formatCurrency(data?.credit_cards)}</p>
        </div>

        <div className="metric-card" data-testid="monthly-income-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingUp size={18} className="text-emerald-400" strokeWidth={1.5} />
            <p className="metric-label mb-0">Monthly Income</p>
          </div>
          <p className="metric-value text-emerald-400" data-testid="monthly-income">{formatCurrency(data?.monthly_income)}</p>
        </div>

        <div className="metric-card" data-testid="monthly-expense-card">
          <div className="flex items-center gap-2 mb-2">
            <TrendingDown size={18} className="text-rose-400" strokeWidth={1.5} />
            <p className="metric-label mb-0">Monthly Expense</p>
          </div>
          <p className="metric-value text-rose-400" data-testid="monthly-expense">{formatCurrency(data?.monthly_expense)}</p>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card-surface rounded-sm p-6" data-testid="recent-transactions">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white">Recent Transactions</h2>
          <Link to="/transactions" className="text-sm text-indigo-400 hover:text-indigo-300">
            View All
          </Link>
        </div>

        {data?.recent_transactions?.length > 0 ? (
          <div className="space-y-2">
            {data.recent_transactions.map((txn) => (
              <div
                key={txn.id}
                className="flex items-center justify-between py-3 border-b border-slate-800 last:border-0"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-white truncate">{txn.description}</p>
                  <p className="text-xs text-slate-500 font-mono">{txn.date}</p>
                </div>
                <div className="flex items-center gap-3">
                  {txn.tag && (
                    <span className={`tag ${
                      txn.tag.includes("income") || txn.tag.includes("received") ? "tag-income" :
                      txn.tag.includes("expense") || txn.tag.includes("paid") ? "tag-expense" :
                      txn.tag.includes("loan") ? "tag-loan" : "tag-transfer"
                    }`}>
                      {txn.tag.replace(/_/g, " ")}
                    </span>
                  )}
                  <p className={`font-mono text-sm ${
                    txn.transaction_type === "credit" ? "text-emerald-400" : "text-rose-400"
                  }`}>
                    {txn.transaction_type === "credit" ? "+" : "-"}{formatCurrency(txn.amount)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-slate-500">
            <p>No transactions yet</p>
            <Link to="/upload" className="text-indigo-400 hover:text-indigo-300 text-sm mt-2 inline-block">
              Upload your first bank statement
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
