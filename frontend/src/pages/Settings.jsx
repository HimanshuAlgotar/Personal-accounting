import { useState } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Settings as SettingsIcon, Key, Download, Trash2 } from "lucide-react";

export default function Settings() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    
    if (newPassword !== confirmPassword) {
      toast.error("New passwords do not match");
      return;
    }
    
    if (newPassword.length < 4) {
      toast.error("Password must be at least 4 characters");
      return;
    }

    setLoading(true);
    try {
      await axios.post(`${API}/auth/change-password?token=${token}`, {
        current_password: currentPassword,
        new_password: newPassword,
      });
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to change password");
    } finally {
      setLoading(false);
    }
  };

  const handleExportAll = async () => {
    try {
      const response = await axios.get(`${API}/export/transactions?token=${token}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "ledgeros_transactions.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export downloaded");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  const handleExportBalanceSheet = async () => {
    try {
      const response = await axios.get(`${API}/export/balance-sheet?token=${token}`, {
        responseType: "blob",
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "ledgeros_balance_sheet.xlsx");
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export downloaded");
    } catch (err) {
      toast.error("Export failed");
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-2xl" data-testid="settings-page">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-slate-400 text-sm mt-1">Manage your account and preferences</p>
      </div>

      {/* Change Password */}
      <div className="card-surface rounded-sm p-6" data-testid="change-password-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-sm bg-indigo-900/30 flex items-center justify-center">
            <Key size={20} className="text-indigo-400" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Change Password</h2>
            <p className="text-sm text-slate-500">Update your account password</p>
          </div>
        </div>

        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <Label className="text-slate-300">Current Password</Label>
            <Input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="bg-slate-950 border-slate-700 mt-1"
              placeholder="Enter current password"
              required
              data-testid="current-password-input"
            />
          </div>

          <div>
            <Label className="text-slate-300">New Password</Label>
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="bg-slate-950 border-slate-700 mt-1"
              placeholder="Enter new password"
              required
              data-testid="new-password-input"
            />
          </div>

          <div>
            <Label className="text-slate-300">Confirm New Password</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="bg-slate-950 border-slate-700 mt-1"
              placeholder="Confirm new password"
              required
              data-testid="confirm-new-password-input"
            />
          </div>

          <Button type="submit" disabled={loading} className="btn-primary text-white" data-testid="change-password-btn">
            {loading ? "Changing..." : "Change Password"}
          </Button>
        </form>
      </div>

      {/* Data Export */}
      <div className="card-surface rounded-sm p-6" data-testid="export-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-sm bg-emerald-900/30 flex items-center justify-center">
            <Download size={20} className="text-emerald-400" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Export Data</h2>
            <p className="text-sm text-slate-500">Download your financial data as Excel files</p>
          </div>
        </div>

        <div className="space-y-3">
          <Button
            variant="outline"
            className="w-full justify-start border-slate-700 text-slate-300"
            onClick={handleExportAll}
            data-testid="export-transactions-btn"
          >
            <Download size={16} className="mr-2" />
            Export All Transactions
          </Button>

          <Button
            variant="outline"
            className="w-full justify-start border-slate-700 text-slate-300"
            onClick={handleExportBalanceSheet}
            data-testid="export-balance-sheet-btn"
          >
            <Download size={16} className="mr-2" />
            Export Balance Sheet
          </Button>
        </div>
      </div>

      {/* About */}
      <div className="card-surface rounded-sm p-6" data-testid="about-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-sm bg-slate-800 flex items-center justify-center">
            <SettingsIcon size={20} className="text-slate-400" strokeWidth={1.5} />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">About LedgerOS</h2>
            <p className="text-sm text-slate-500">Personal accounting software</p>
          </div>
        </div>

        <div className="space-y-2 text-sm text-slate-400">
          <p>Version 1.0.0</p>
          <p>Built for personal finance management with:</p>
          <ul className="list-disc list-inside ml-2 space-y-1">
            <li>Ledger-based double-entry accounting</li>
            <li>Bank statement import (HDFC XLS)</li>
            <li>Auto-tagging for repeated transactions</li>
            <li>Loan tracking with interest</li>
            <li>Cash book management</li>
            <li>Balance sheet & Income reports</li>
            <li>Excel export</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
