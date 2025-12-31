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
import { ArrowRightLeft, Plus, Minus, Check } from "lucide-react";

const TAGS = [
  { value: "personal_expense", label: "Personal Expense" },
  { value: "personal_income", label: "Personal Income" },
  { value: "interest_paid", label: "Interest Paid" },
  { value: "interest_received", label: "Interest Received" },
  { value: "loan_repayment", label: "Loan Repayment" },
  { value: "investment", label: "Investment" },
  { value: "salary", label: "Salary" },
  { value: "rent", label: "Rent" },
  { value: "utilities", label: "Utilities" },
  { value: "food", label: "Food & Dining" },
  { value: "transport", label: "Transport" },
  { value: "other", label: "Other" },
];

const formatCurrency = (amount) => new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", minimumFractionDigits: 2 }).format(amount || 0);

export default function AddEntry() {
  const { token } = useAuth();
  const [ledgers, setLedgers] = useState([]);
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("transfer");

  // Transfer form
  const [transferData, setTransferData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    from_ledger_id: "",
    to_ledger_id: "",
    amount: "",
    description: "",
    notes: "",
    linked_loan_id: "",
  });

  // Manual entry form
  const [manualData, setManualData] = useState({
    date: format(new Date(), "yyyy-MM-dd"),
    ledger_id: "",
    amount: "",
    transaction_type: "debit",
    description: "",
    tag: "",
    notes: "",
    linked_loan_id: "",
  });

  useEffect(() => {
    fetchData();
  }, [token]);

  const fetchData = async () => {
    try {
      const [ledgerRes, loanRes] = await Promise.all([
        axios.get(`${API}/ledgers?token=${token}`),
        axios.get(`${API}/loans?token=${token}`),
      ]);
      setLedgers(ledgerRes.data);
      setLoans(loanRes.data);
    } catch (err) {
      console.error("Fetch error:", err);
    }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    if (!transferData.from_ledger_id || !transferData.to_ledger_id) {
      toast.error("Please select both accounts");
      return;
    }
    if (transferData.from_ledger_id === transferData.to_ledger_id) {
      toast.error("Cannot transfer to same account");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/transfers?token=${token}`, {
        ...transferData,
        amount: parseFloat(transferData.amount) || 0,
        linked_loan_id: transferData.linked_loan_id || null,
      });
      toast.success("Transfer recorded successfully");
      setTransferData({
        date: format(new Date(), "yyyy-MM-dd"),
        from_ledger_id: "",
        to_ledger_id: "",
        amount: "",
        description: "",
        notes: "",
        linked_loan_id: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create transfer");
    } finally {
      setLoading(false);
    }
  };

  const handleManualEntry = async (e) => {
    e.preventDefault();
    if (!manualData.ledger_id) {
      toast.error("Please select an account");
      return;
    }
    
    setLoading(true);
    try {
      await axios.post(`${API}/transactions/manual?token=${token}`, {
        ...manualData,
        amount: parseFloat(manualData.amount) || 0,
        tag: manualData.tag || null,
        linked_loan_id: manualData.linked_loan_id || null,
      });
      toast.success("Entry recorded successfully");
      setManualData({
        date: format(new Date(), "yyyy-MM-dd"),
        ledger_id: "",
        amount: "",
        transaction_type: "debit",
        description: "",
        tag: "",
        notes: "",
        linked_loan_id: "",
      });
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create entry");
    } finally {
      setLoading(false);
    }
  };

  const getLedgerBalance = (id) => {
    const ledger = ledgers.find((l) => l.id === id);
    return ledger ? formatCurrency(ledger.current_balance) : "";
  };

  const assetLedgers = ledgers.filter((l) => l.type === "asset");
  const liabilityLedgers = ledgers.filter((l) => l.type === "liability");
  const allAccountLedgers = [...assetLedgers, ...liabilityLedgers];

  return (
    <div className="max-w-2xl mx-auto animate-fadeIn" data-testid="add-entry-page">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Add Entry</h1>
        <p className="text-gray-500 text-sm mt-1">Record transfers or manual transactions</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid grid-cols-2 w-full">
          <TabsTrigger value="transfer" className="flex items-center gap-2">
            <ArrowRightLeft size={16} />
            Transfer
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex items-center gap-2">
            <Plus size={16} />
            Income/Expense
          </TabsTrigger>
        </TabsList>

        {/* Transfer Tab */}
        <TabsContent value="transfer">
          <form onSubmit={handleTransfer} className="card-surface p-6 space-y-5">
            <p className="text-sm text-gray-600 mb-4">
              Transfer money between your accounts (bank to bank, bank to loan, etc.)
            </p>
            
            <div>
              <Label>Date</Label>
              <Input type="date" value={transferData.date} onChange={(e) => setTransferData({ ...transferData, date: e.target.value })} className="mt-1" data-testid="transfer-date" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>From Account</Label>
                <Select value={transferData.from_ledger_id} onValueChange={(val) => setTransferData({ ...transferData, from_ledger_id: val })}>
                  <SelectTrigger className="mt-1" data-testid="transfer-from"><SelectValue placeholder="Select source" /></SelectTrigger>
                  <SelectContent>
                    {allAccountLedgers.map((l) => (
                      <SelectItem key={l.id} value={l.id}>
                        <span className="flex justify-between w-full">{l.name}</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {transferData.from_ledger_id && (
                  <p className="text-xs text-gray-500 mt-1">Balance: {getLedgerBalance(transferData.from_ledger_id)}</p>
                )}
              </div>

              <div>
                <Label>To Account</Label>
                <Select value={transferData.to_ledger_id} onValueChange={(val) => setTransferData({ ...transferData, to_ledger_id: val })}>
                  <SelectTrigger className="mt-1" data-testid="transfer-to"><SelectValue placeholder="Select destination" /></SelectTrigger>
                  <SelectContent>
                    {allAccountLedgers.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {transferData.to_ledger_id && (
                  <p className="text-xs text-gray-500 mt-1">Balance: {getLedgerBalance(transferData.to_ledger_id)}</p>
                )}
              </div>
            </div>

            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" step="0.01" min="0" value={transferData.amount} onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })} className="mt-1 font-mono text-lg" placeholder="0.00" data-testid="transfer-amount" />
            </div>

            <div>
              <Label>Description</Label>
              <Input value={transferData.description} onChange={(e) => setTransferData({ ...transferData, description: e.target.value })} className="mt-1" placeholder="e.g., Loan repayment to Akash" required data-testid="transfer-description" />
            </div>

            {loans.length > 0 && (
              <div>
                <Label>Link to Loan (Optional)</Label>
                <Select value={transferData.linked_loan_id} onValueChange={(val) => setTransferData({ ...transferData, linked_loan_id: val })}>
                  <SelectTrigger className="mt-1" data-testid="transfer-loan"><SelectValue placeholder="Select if this is loan related" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not linked to loan</SelectItem>
                    {loans.map((l) => (
                      <SelectItem key={l.id} value={l.id}>{l.person_name} ({l.loan_type})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <Button type="submit" className="w-full" disabled={loading} data-testid="submit-transfer">
              <Check size={16} className="mr-2" />
              {loading ? "Processing..." : "Record Transfer"}
            </Button>
          </form>
        </TabsContent>

        {/* Manual Entry Tab */}
        <TabsContent value="manual">
          <form onSubmit={handleManualEntry} className="card-surface p-6 space-y-5">
            <p className="text-sm text-gray-600 mb-4">
              Record single income or expense entry
            </p>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Date</Label>
                <Input type="date" value={manualData.date} onChange={(e) => setManualData({ ...manualData, date: e.target.value })} className="mt-1" data-testid="manual-date" />
              </div>
              <div>
                <Label>Type</Label>
                <Select value={manualData.transaction_type} onValueChange={(val) => setManualData({ ...manualData, transaction_type: val })}>
                  <SelectTrigger className="mt-1" data-testid="manual-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="debit">
                      <span className="flex items-center gap-2"><Minus size={14} className="text-rose-600" /> Expense (Debit)</span>
                    </SelectItem>
                    <SelectItem value="credit">
                      <span className="flex items-center gap-2"><Plus size={14} className="text-emerald-600" /> Income (Credit)</span>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Account</Label>
              <Select value={manualData.ledger_id} onValueChange={(val) => setManualData({ ...manualData, ledger_id: val })}>
                <SelectTrigger className="mt-1" data-testid="manual-account"><SelectValue placeholder="Select account" /></SelectTrigger>
                <SelectContent>
                  {ledgers.map((l) => (
                    <SelectItem key={l.id} value={l.id}>{l.name} ({l.type})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" step="0.01" min="0" value={manualData.amount} onChange={(e) => setManualData({ ...manualData, amount: e.target.value })} className="mt-1 font-mono text-lg" placeholder="0.00" data-testid="manual-amount" />
            </div>

            <div>
              <Label>Description</Label>
              <Input value={manualData.description} onChange={(e) => setManualData({ ...manualData, description: e.target.value })} className="mt-1" placeholder="e.g., Monthly rent, Interest payment" required data-testid="manual-description" />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Category</Label>
                <Select value={manualData.tag} onValueChange={(val) => setManualData({ ...manualData, tag: val })}>
                  <SelectTrigger className="mt-1" data-testid="manual-tag"><SelectValue placeholder="Select category" /></SelectTrigger>
                  <SelectContent>
                    {TAGS.map((t) => (<SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              {loans.length > 0 && (manualData.tag === "interest_paid" || manualData.tag === "interest_received") && (
                <div>
                  <Label>Link to Loan</Label>
                  <Select value={manualData.linked_loan_id} onValueChange={(val) => setManualData({ ...manualData, linked_loan_id: val })}>
                    <SelectTrigger className="mt-1" data-testid="manual-loan"><SelectValue placeholder="Select loan" /></SelectTrigger>
                    <SelectContent>
                      {loans.map((l) => (<SelectItem key={l.id} value={l.id}>{l.person_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea value={manualData.notes} onChange={(e) => setManualData({ ...manualData, notes: e.target.value })} className="mt-1 h-20" placeholder="Any additional notes" data-testid="manual-notes" />
            </div>

            <Button type="submit" className="w-full" disabled={loading} data-testid="submit-manual">
              <Check size={16} className="mr-2" />
              {loading ? "Processing..." : "Record Entry"}
            </Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
