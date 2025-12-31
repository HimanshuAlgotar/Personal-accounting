import { useState } from "react";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Key, Download, Trash2, AlertTriangle } from "lucide-react";

export default function Settings() {
  const { token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) { toast.error("New passwords do not match"); return; }
    if (newPassword.length < 4) { toast.error("Password must be at least 4 characters"); return; }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/change-password?token=${token}`, { current_password: currentPassword, new_password: newPassword });
      toast.success("Password changed successfully");
      setCurrentPassword(""); setNewPassword(""); setConfirmPassword("");
    } catch (err) { toast.error(err.response?.data?.detail || "Failed to change password"); } finally { setLoading(false); }
  };

  const handleResetAllData = async () => {
    if (resetConfirmText !== "DELETE") {
      toast.error("Please type DELETE to confirm");
      return;
    }
    setLoading(true);
    try {
      await axios.post(`${API}/auth/reset-all-data?token=${token}`);
      toast.success("All data has been reset. Default ledgers created.");
      setShowResetDialog(false);
      setResetConfirmText("");
      window.location.reload();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to reset data");
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async (type) => {
    try {
      const endpoint = type === "balance-sheet" ? "balance-sheet" : "transactions";
      const response = await axios.get(`${API}/export/${endpoint}?token=${token}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `ledgeros_${endpoint}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success("Export downloaded");
    } catch (err) { toast.error("Export failed"); }
  };

  return (
    <div className="space-y-6 animate-fadeIn max-w-2xl" data-testid="settings-page">
      <div><h1 className="text-2xl font-bold text-gray-900">Settings</h1><p className="text-gray-500 text-sm mt-1">Manage your account and data</p></div>

      {/* Change Password */}
      <div className="card-surface p-6" data-testid="change-password-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-md bg-blue-50 flex items-center justify-center"><Key size={20} className="text-blue-600" strokeWidth={1.5} /></div>
          <div><h2 className="font-semibold text-gray-900">Change Password</h2><p className="text-sm text-gray-500">Update your account password</p></div>
        </div>
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div><Label>Current Password</Label><Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="mt-1" placeholder="Enter current password" required data-testid="current-password-input" /></div>
          <div><Label>New Password</Label><Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="mt-1" placeholder="Enter new password" required data-testid="new-password-input" /></div>
          <div><Label>Confirm New Password</Label><Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="mt-1" placeholder="Confirm new password" required data-testid="confirm-new-password-input" /></div>
          <Button type="submit" disabled={loading} data-testid="change-password-btn">{loading ? "Changing..." : "Change Password"}</Button>
        </form>
      </div>

      {/* Export Data */}
      <div className="card-surface p-6" data-testid="export-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-md bg-emerald-50 flex items-center justify-center"><Download size={20} className="text-emerald-600" strokeWidth={1.5} /></div>
          <div><h2 className="font-semibold text-gray-900">Export Data</h2><p className="text-sm text-gray-500">Download your financial data as Excel</p></div>
        </div>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => handleExport("transactions")} data-testid="export-transactions-btn"><Download size={16} className="mr-2" />Transactions</Button>
          <Button variant="outline" onClick={() => handleExport("balance-sheet")} data-testid="export-balance-sheet-btn"><Download size={16} className="mr-2" />Balance Sheet</Button>
        </div>
      </div>

      {/* Reset All Data */}
      <div className="card-surface p-6 border-rose-200" data-testid="reset-section">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-md bg-rose-50 flex items-center justify-center"><Trash2 size={20} className="text-rose-600" strokeWidth={1.5} /></div>
          <div><h2 className="font-semibold text-gray-900">Reset All Data</h2><p className="text-sm text-gray-500">Delete all ledgers, transactions, loans and start fresh</p></div>
        </div>
        <Button variant="destructive" onClick={() => setShowResetDialog(true)} data-testid="reset-data-btn">
          <Trash2 size={16} className="mr-2" />Reset All Data
        </Button>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-600">
              <AlertTriangle size={20} />
              Confirm Data Reset
            </DialogTitle>
            <DialogDescription>
              This will permanently delete all your data including:
              <ul className="list-disc ml-6 mt-2 text-gray-700">
                <li>All ledgers and accounts</li>
                <li>All transactions</li>
                <li>All loans</li>
                <li>All tagging patterns</li>
              </ul>
              <p className="mt-3 font-medium text-gray-900">Default ledgers will be recreated.</p>
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Label className="text-gray-700">Type DELETE to confirm:</Label>
            <Input 
              value={resetConfirmText} 
              onChange={(e) => setResetConfirmText(e.target.value)} 
              className="mt-1" 
              placeholder="DELETE"
              data-testid="reset-confirm-input"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowResetDialog(false); setResetConfirmText(""); }}>Cancel</Button>
            <Button variant="destructive" onClick={handleResetAllData} disabled={loading || resetConfirmText !== "DELETE"} data-testid="confirm-reset-btn">
              {loading ? "Resetting..." : "Reset Everything"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
