import { useState, useEffect } from "react";
import { useAuth, API } from "@/App";
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
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { Plus, CalendarIcon, ArrowUpRight, ArrowDownRight, Banknote, User, Percent } from "lucide-react";

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
  }).format(amount || 0);
};

export default function Loans() {
  const { token } = useAuth();
  const [loans, setLoans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showRepaymentDialog, setShowRepaymentDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [filterType, setFilterType] = useState("all");

  // Form state
  const [formData, setFormData] = useState({
    person_name: "",
    loan_type: "given",
    principal: 0,
    interest_rate: 0,
    start_date: format(new Date(), "yyyy-MM-dd"),
    notes: "",
  });

  // Repayment form
  const [repaymentData, setRepaymentData] = useState({
    amount: 0,
    date: format(new Date(), "yyyy-MM-dd"),
    is_interest: false,
    notes: "",
  });

  useEffect(() => {
    fetchLoans();
  }, [token]);

  const fetchLoans = async () => {
    try {
      const res = await axios.get(`${API}/loans?token=${token}`);
      setLoans(res.data);
    } catch (err) {
      console.error("Fetch loans error:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/loans?token=${token}`, formData);
      toast.success("Loan created");
      setShowDialog(false);
      resetForm();
      fetchLoans();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to create loan");
    }
  };

  const handleRepayment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/loans/repayment?token=${token}`, {
        loan_id: selectedLoan.id,
        ...repaymentData,
      });
      toast.success("Repayment recorded");
      setShowRepaymentDialog(false);
      setSelectedLoan(null);
      fetchLoans();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to record repayment");
    }
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this loan? This cannot be undone.")) return;
    try {
      await axios.delete(`${API}/loans/${id}?token=${token}`);
      toast.success("Loan deleted");
      fetchLoans();
    } catch (err) {
      toast.error("Failed to delete loan");
    }
  };

  const resetForm = () => {
    setFormData({
      person_name: "",
      loan_type: "given",
      principal: 0,
      interest_rate: 0,
      start_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
  };

  const getOutstandingBalance = (loan) => {
    return loan.principal - loan.total_repaid;
  };

  const filteredLoans =
    filterType === "all" ? loans : loans.filter((l) => l.loan_type === filterType);

  const totalReceivable = loans
    .filter((l) => l.loan_type === "given")
    .reduce((sum, l) => sum + getOutstandingBalance(l), 0);

  const totalPayable = loans
    .filter((l) => l.loan_type === "taken")
    .reduce((sum, l) => sum + getOutstandingBalance(l), 0);

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="loans-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Loans</h1>
          <p className="text-slate-400 text-sm mt-1">Track loans given and taken</p>
        </div>
        <Button
          onClick={() => {
            resetForm();
            setShowDialog(true);
          }}
          className="btn-primary text-white"
          data-testid="create-loan-btn"
        >
          <Plus size={16} className="mr-2" />
          New Loan
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="metric-card" data-testid="loans-receivable-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight size={18} className="text-emerald-400" strokeWidth={1.5} />
            <p className="metric-label mb-0">Total Receivable</p>
          </div>
          <p className="metric-value text-emerald-400" data-testid="total-receivable">
            {formatCurrency(totalReceivable)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {loans.filter((l) => l.loan_type === "given").length} active loans
          </p>
        </div>

        <div className="metric-card" data-testid="loans-payable-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight size={18} className="text-rose-400" strokeWidth={1.5} />
            <p className="metric-label mb-0">Total Payable</p>
          </div>
          <p className="metric-value text-rose-400" data-testid="total-payable">
            {formatCurrency(totalPayable)}
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {loans.filter((l) => l.loan_type === "taken").length} active loans
          </p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button
          variant={filterType === "all" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterType("all")}
          className={filterType === "all" ? "btn-primary text-white" : "border-slate-700 text-slate-300"}
          data-testid="filter-all-loans"
        >
          All
        </Button>
        <Button
          variant={filterType === "given" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterType("given")}
          className={filterType === "given" ? "btn-primary text-white" : "border-slate-700 text-slate-300"}
          data-testid="filter-given"
        >
          Given
        </Button>
        <Button
          variant={filterType === "taken" ? "default" : "outline"}
          size="sm"
          onClick={() => setFilterType("taken")}
          className={filterType === "taken" ? "btn-primary text-white" : "border-slate-700 text-slate-300"}
          data-testid="filter-taken"
        >
          Taken
        </Button>
      </div>

      {/* Loans List */}
      {loading ? (
        <div className="text-center py-8 text-slate-500">Loading...</div>
      ) : filteredLoans.length === 0 ? (
        <div className="text-center py-12 text-slate-500">
          <p>No loans found</p>
          <Button
            variant="link"
            className="text-indigo-400 mt-2"
            onClick={() => setShowDialog(true)}
          >
            Create your first loan
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLoans.map((loan) => {
            const outstanding = getOutstandingBalance(loan);
            const isGiven = loan.loan_type === "given";

            return (
              <div
                key={loan.id}
                className="card-surface rounded-sm p-4"
                data-testid={`loan-card-${loan.id}`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-10 h-10 rounded-sm flex items-center justify-center ${
                        isGiven ? "bg-emerald-900/30" : "bg-rose-900/30"
                      }`}
                    >
                      <User
                        size={20}
                        className={isGiven ? "text-emerald-400" : "text-rose-400"}
                        strokeWidth={1.5}
                      />
                    </div>
                    <div>
                      <h3 className="font-medium text-white">{loan.person_name}</h3>
                      <span
                        className={`text-xs px-2 py-0.5 rounded ${
                          isGiven
                            ? "bg-emerald-900/30 text-emerald-400"
                            : "bg-rose-900/30 text-rose-400"
                        }`}
                      >
                        {isGiven ? "Given" : "Taken"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Principal</span>
                    <span className="font-mono text-slate-300">{formatCurrency(loan.principal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">Repaid</span>
                    <span className="font-mono text-slate-300">{formatCurrency(loan.total_repaid)}</span>
                  </div>
                  {loan.interest_rate > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Interest Rate</span>
                      <span className="font-mono text-slate-300">{loan.interest_rate}%</span>
                    </div>
                  )}
                  {loan.interest_paid > 0 && (
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-500">Interest Paid</span>
                      <span className="font-mono text-amber-400">{formatCurrency(loan.interest_paid)}</span>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-800">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-slate-500">Outstanding</span>
                    <span
                      className={`font-mono text-lg font-medium ${
                        isGiven ? "text-emerald-400" : "text-rose-400"
                      }`}
                    >
                      {formatCurrency(outstanding)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex-1 border-slate-700 text-slate-300"
                      onClick={() => {
                        setSelectedLoan(loan);
                        setRepaymentData({
                          amount: 0,
                          date: format(new Date(), "yyyy-MM-dd"),
                          is_interest: false,
                          notes: "",
                        });
                        setShowRepaymentDialog(true);
                      }}
                      data-testid={`record-repayment-${loan.id}`}
                    >
                      <Banknote size={14} className="mr-1" />
                      Record Payment
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-slate-500 hover:text-rose-400"
                      onClick={() => handleDelete(loan.id)}
                      data-testid={`delete-loan-${loan.id}`}
                    >
                      Delete
                    </Button>
                  </div>
                </div>

                <p className="text-xs text-slate-600 mt-3">Started: {loan.start_date}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Loan Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">New Loan</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label className="text-slate-300">Person Name</Label>
              <Input
                value={formData.person_name}
                onChange={(e) => setFormData({ ...formData, person_name: e.target.value })}
                className="bg-slate-950 border-slate-700 mt-1"
                placeholder="Enter name"
                required
                data-testid="loan-person-input"
              />
            </div>

            <div>
              <Label className="text-slate-300">Loan Type</Label>
              <Select
                value={formData.loan_type}
                onValueChange={(val) => setFormData({ ...formData, loan_type: val })}
              >
                <SelectTrigger className="bg-slate-950 border-slate-700 mt-1" data-testid="loan-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="given">Loan Given (You lent money)</SelectItem>
                  <SelectItem value="taken">Loan Taken (You borrowed money)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-slate-300">Principal Amount (₹)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.principal}
                  onChange={(e) =>
                    setFormData({ ...formData, principal: parseFloat(e.target.value) || 0 })
                  }
                  className="bg-slate-950 border-slate-700 mt-1 font-mono"
                  required
                  data-testid="loan-principal-input"
                />
              </div>

              <div>
                <Label className="text-slate-300">Interest Rate (%)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={formData.interest_rate}
                  onChange={(e) =>
                    setFormData({ ...formData, interest_rate: parseFloat(e.target.value) || 0 })
                  }
                  className="bg-slate-950 border-slate-700 mt-1 font-mono"
                  data-testid="loan-interest-input"
                />
              </div>
            </div>

            <div>
              <Label className="text-slate-300">Start Date</Label>
              <Input
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                className="bg-slate-950 border-slate-700 mt-1"
                data-testid="loan-date-input"
              />
            </div>

            <div>
              <Label className="text-slate-300">Notes (Optional)</Label>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="bg-slate-950 border-slate-700 mt-1 h-20"
                placeholder="Any additional notes"
                data-testid="loan-notes-input"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)} className="border-slate-700 text-slate-300">
                Cancel
              </Button>
              <Button type="submit" className="btn-primary text-white" data-testid="save-loan-btn">
                Create Loan
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Record Repayment Dialog */}
      <Dialog open={showRepaymentDialog} onOpenChange={setShowRepaymentDialog}>
        <DialogContent className="bg-slate-900 border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-white">
              Record Payment - {selectedLoan?.person_name}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRepayment} className="space-y-4">
            <div>
              <Label className="text-slate-300">Amount (₹)</Label>
              <Input
                type="number"
                step="0.01"
                value={repaymentData.amount}
                onChange={(e) =>
                  setRepaymentData({ ...repaymentData, amount: parseFloat(e.target.value) || 0 })
                }
                className="bg-slate-950 border-slate-700 mt-1 font-mono"
                required
                data-testid="repayment-amount-input"
              />
            </div>

            <div>
              <Label className="text-slate-300">Date</Label>
              <Input
                type="date"
                value={repaymentData.date}
                onChange={(e) => setRepaymentData({ ...repaymentData, date: e.target.value })}
                className="bg-slate-950 border-slate-700 mt-1"
                data-testid="repayment-date-input"
              />
            </div>

            <div>
              <Label className="text-slate-300">Payment Type</Label>
              <Select
                value={repaymentData.is_interest ? "interest" : "principal"}
                onValueChange={(val) =>
                  setRepaymentData({ ...repaymentData, is_interest: val === "interest" })
                }
              >
                <SelectTrigger className="bg-slate-950 border-slate-700 mt-1" data-testid="repayment-type-select">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="principal">Principal Repayment</SelectItem>
                  <SelectItem value="interest">Interest Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-slate-300">Notes (Optional)</Label>
              <Textarea
                value={repaymentData.notes}
                onChange={(e) => setRepaymentData({ ...repaymentData, notes: e.target.value })}
                className="bg-slate-950 border-slate-700 mt-1 h-20"
                placeholder="Any notes about this payment"
                data-testid="repayment-notes-input"
              />
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowRepaymentDialog(false)}
                className="border-slate-700 text-slate-300"
              >
                Cancel
              </Button>
              <Button type="submit" className="btn-primary text-white" data-testid="save-repayment-btn">
                Record Payment
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
