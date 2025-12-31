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
import { format } from "date-fns";
import { Plus, ArrowUpRight, ArrowDownRight, Banknote, User, Percent, Calculator, Edit2, Trash2 } from "lucide-react";

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
  const [interestData, setInterestData] = useState({});
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showRepaymentDialog, setShowRepaymentDialog] = useState(false);
  const [showInterestDialog, setShowInterestDialog] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState(null);
  const [filterType, setFilterType] = useState("all");
  const [editingLoan, setEditingLoan] = useState(null);

  // Form state
  const [formData, setFormData] = useState({
    person_name: "",
    loan_type: "given",
    principal: 0,
    interest_rate: 0,
    interest_type: "simple",
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
      // Fetch interest for each loan
      for (const loan of res.data) {
        if (loan.interest_rate > 0) {
          fetchInterest(loan.id);
        }
      }
    } catch (err) {
      console.error("Fetch loans error:", err);
    } finally {
      setLoading(false);
    }
  };

  const fetchInterest = async (loanId) => {
    try {
      const res = await axios.get(`${API}/loans/${loanId}/interest?token=${token}`);
      setInterestData((prev) => ({ ...prev, [loanId]: res.data }));
    } catch (err) {
      console.error("Fetch interest error:", err);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingLoan) {
        await axios.put(`${API}/loans/${editingLoan.id}?token=${token}`, formData);
        toast.success("Loan updated");
      } else {
        await axios.post(`${API}/loans?token=${token}`, formData);
        toast.success("Loan created");
      }
      setShowDialog(false);
      setEditingLoan(null);
      resetForm();
      fetchLoans();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to save loan");
    }
  };

  const handleRepayment = async (e) => {
    e.preventDefault();
    try {
      await axios.post(`${API}/loans/repayment?token=${token}`, {
        loan_id: selectedLoan.id,
        ...repaymentData,
      });
      toast.success("Payment recorded");
      setShowRepaymentDialog(false);
      setSelectedLoan(null);
      fetchLoans();
    } catch (err) {
      toast.error(err.response?.data?.detail || "Failed to record payment");
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

  const handleEdit = (loan) => {
    setEditingLoan(loan);
    setFormData({
      person_name: loan.person_name,
      loan_type: loan.loan_type,
      principal: loan.principal,
      interest_rate: loan.interest_rate,
      interest_type: loan.interest_type || "simple",
      start_date: loan.start_date,
      notes: loan.notes,
    });
    setShowDialog(true);
  };

  const showInterestCalc = (loan) => {
    setSelectedLoan(loan);
    fetchInterest(loan.id);
    setShowInterestDialog(true);
  };

  const resetForm = () => {
    setFormData({
      person_name: "",
      loan_type: "given",
      principal: 0,
      interest_rate: 0,
      interest_type: "simple",
      start_date: format(new Date(), "yyyy-MM-dd"),
      notes: "",
    });
  };

  const getOutstandingBalance = (loan) => {
    return loan.principal - loan.total_repaid;
  };

  const filteredLoans = filterType === "all" ? loans : loans.filter((l) => l.loan_type === filterType);

  const totalReceivable = loans.filter((l) => l.loan_type === "given").reduce((sum, l) => sum + getOutstandingBalance(l), 0);
  const totalPayable = loans.filter((l) => l.loan_type === "taken").reduce((sum, l) => sum + getOutstandingBalance(l), 0);

  return (
    <div className="space-y-6 animate-fadeIn" data-testid="loans-page">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Loans</h1>
          <p className="text-gray-500 text-sm mt-1">Track loans given and taken with interest</p>
        </div>
        <Button onClick={() => { resetForm(); setEditingLoan(null); setShowDialog(true); }} data-testid="create-loan-btn">
          <Plus size={16} className="mr-2" />
          New Loan
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="metric-card" data-testid="loans-receivable-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowUpRight size={18} className="text-emerald-600" strokeWidth={1.5} />
            <p className="metric-label mb-0">Total Receivable</p>
          </div>
          <p className="metric-value text-emerald-600" data-testid="total-receivable">{formatCurrency(totalReceivable)}</p>
          <p className="text-xs text-gray-500 mt-1">{loans.filter((l) => l.loan_type === "given").length} active loans</p>
        </div>

        <div className="metric-card" data-testid="loans-payable-card">
          <div className="flex items-center gap-2 mb-2">
            <ArrowDownRight size={18} className="text-rose-600" strokeWidth={1.5} />
            <p className="metric-label mb-0">Total Payable</p>
          </div>
          <p className="metric-value text-rose-600" data-testid="total-payable">{formatCurrency(totalPayable)}</p>
          <p className="text-xs text-gray-500 mt-1">{loans.filter((l) => l.loan_type === "taken").length} active loans</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        <Button variant={filterType === "all" ? "default" : "outline"} size="sm" onClick={() => setFilterType("all")} data-testid="filter-all-loans">All</Button>
        <Button variant={filterType === "given" ? "default" : "outline"} size="sm" onClick={() => setFilterType("given")} data-testid="filter-given">Given</Button>
        <Button variant={filterType === "taken" ? "default" : "outline"} size="sm" onClick={() => setFilterType("taken")} data-testid="filter-taken">Taken</Button>
      </div>

      {/* Loans List */}
      {loading ? (
        <div className="text-center py-8 text-gray-500">Loading...</div>
      ) : filteredLoans.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <p>No loans found</p>
          <Button variant="link" className="text-blue-600 mt-2" onClick={() => setShowDialog(true)}>Create your first loan</Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredLoans.map((loan) => {
            const outstanding = getOutstandingBalance(loan);
            const isGiven = loan.loan_type === "given";
            const interest = interestData[loan.id];

            return (
              <div key={loan.id} className="card-surface p-4" data-testid={`loan-card-${loan.id}`}>
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-md flex items-center justify-center ${isGiven ? "bg-emerald-50" : "bg-rose-50"}`}>
                      <User size={20} className={isGiven ? "text-emerald-600" : "text-rose-600"} strokeWidth={1.5} />
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">{loan.person_name}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded ${isGiven ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"}`}>
                        {isGiven ? "Given" : "Taken"}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleEdit(loan)} data-testid={`edit-loan-${loan.id}`}>
                      <Edit2 size={14} className="text-gray-500" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleDelete(loan.id)} data-testid={`delete-loan-${loan.id}`}>
                      <Trash2 size={14} className="text-gray-500 hover:text-rose-600" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Principal</span>
                    <span className="font-mono text-gray-900">{formatCurrency(loan.principal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-500">Repaid</span>
                    <span className="font-mono text-gray-900">{formatCurrency(loan.total_repaid)}</span>
                  </div>
                  {loan.interest_rate > 0 && (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Interest Rate</span>
                        <span className="font-mono text-gray-900">{loan.interest_rate}% ({loan.interest_type || "simple"})</span>
                      </div>
                      {interest && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Accrued Interest</span>
                          <span className="font-mono text-amber-600">{formatCurrency(interest.accrued_interest)}</span>
                        </div>
                      )}
                      {loan.interest_paid > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-500">Interest Paid</span>
                          <span className="font-mono text-emerald-600">{formatCurrency(loan.interest_paid)}</span>
                        </div>
                      )}
                    </>
                  )}
                </div>

                <div className="pt-4 border-t border-gray-100">
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-xs text-gray-500">Outstanding</span>
                    <span className={`font-mono text-lg font-medium ${isGiven ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatCurrency(interest?.total_due || outstanding)}
                    </span>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => {
                      setSelectedLoan(loan);
                      setRepaymentData({ amount: 0, date: format(new Date(), "yyyy-MM-dd"), is_interest: false, notes: "" });
                      setShowRepaymentDialog(true);
                    }} data-testid={`record-repayment-${loan.id}`}>
                      <Banknote size={14} className="mr-1" />
                      Pay
                    </Button>
                    {loan.interest_rate > 0 && (
                      <Button variant="outline" size="sm" onClick={() => showInterestCalc(loan)} data-testid={`calc-interest-${loan.id}`}>
                        <Calculator size={14} />
                      </Button>
                    )}
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-3">Started: {loan.start_date}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Create/Edit Loan Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingLoan ? "Edit Loan" : "New Loan"}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label>Person Name</Label>
              <Input value={formData.person_name} onChange={(e) => setFormData({ ...formData, person_name: e.target.value })} className="mt-1" placeholder="Enter name" required data-testid="loan-person-input" />
            </div>

            <div>
              <Label>Loan Type</Label>
              <Select value={formData.loan_type} onValueChange={(val) => setFormData({ ...formData, loan_type: val })}>
                <SelectTrigger className="mt-1" data-testid="loan-type-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="given">Loan Given (You lent money)</SelectItem>
                  <SelectItem value="taken">Loan Taken (You borrowed money)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Principal Amount (₹)</Label>
                <Input type="number" step="0.01" value={formData.principal} onChange={(e) => setFormData({ ...formData, principal: parseFloat(e.target.value) || 0 })} className="mt-1 font-mono" required data-testid="loan-principal-input" />
              </div>
              <div>
                <Label>Interest Rate (% p.a.)</Label>
                <Input type="number" step="0.01" value={formData.interest_rate} onChange={(e) => setFormData({ ...formData, interest_rate: parseFloat(e.target.value) || 0 })} className="mt-1 font-mono" data-testid="loan-interest-input" />
              </div>
            </div>

            {formData.interest_rate > 0 && (
              <div>
                <Label>Interest Type</Label>
                <Select value={formData.interest_type} onValueChange={(val) => setFormData({ ...formData, interest_type: val })}>
                  <SelectTrigger className="mt-1" data-testid="loan-interest-type"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="simple">Simple Interest</SelectItem>
                    <SelectItem value="compound">Compound Interest (Monthly)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <Label>Start Date</Label>
              <Input type="date" value={formData.start_date} onChange={(e) => setFormData({ ...formData, start_date: e.target.value })} className="mt-1" data-testid="loan-date-input" />
            </div>

            <div>
              <Label>Notes (Optional)</Label>
              <Textarea value={formData.notes} onChange={(e) => setFormData({ ...formData, notes: e.target.value })} className="mt-1 h-20" placeholder="Any additional notes" data-testid="loan-notes-input" />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowDialog(false)}>Cancel</Button>
              <Button type="submit" data-testid="save-loan-btn">{editingLoan ? "Update" : "Create Loan"}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Repayment Dialog */}
      <Dialog open={showRepaymentDialog} onOpenChange={setShowRepaymentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Record Payment - {selectedLoan?.person_name}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleRepayment} className="space-y-4">
            <div>
              <Label>Amount (₹)</Label>
              <Input type="number" step="0.01" value={repaymentData.amount} onChange={(e) => setRepaymentData({ ...repaymentData, amount: parseFloat(e.target.value) || 0 })} className="mt-1 font-mono" required data-testid="repayment-amount-input" />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={repaymentData.date} onChange={(e) => setRepaymentData({ ...repaymentData, date: e.target.value })} className="mt-1" data-testid="repayment-date-input" />
            </div>
            <div>
              <Label>Payment Type</Label>
              <Select value={repaymentData.is_interest ? "interest" : "principal"} onValueChange={(val) => setRepaymentData({ ...repaymentData, is_interest: val === "interest" })}>
                <SelectTrigger className="mt-1" data-testid="repayment-type-select"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="principal">Principal Repayment</SelectItem>
                  <SelectItem value="interest">Interest Payment</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setShowRepaymentDialog(false)}>Cancel</Button>
              <Button type="submit" data-testid="save-repayment-btn">Record Payment</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Interest Calculation Dialog */}
      <Dialog open={showInterestDialog} onOpenChange={setShowInterestDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Interest Calculation - {selectedLoan?.person_name}</DialogTitle>
          </DialogHeader>
          {selectedLoan && interestData[selectedLoan.id] && (
            <div className="space-y-4">
              <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Principal</span>
                  <span className="font-mono">{formatCurrency(interestData[selectedLoan.id].principal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Outstanding Principal</span>
                  <span className="font-mono">{formatCurrency(interestData[selectedLoan.id].outstanding_principal)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Interest Rate</span>
                  <span className="font-mono">{interestData[selectedLoan.id].interest_rate}% ({interestData[selectedLoan.id].interest_type})</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Days Elapsed</span>
                  <span className="font-mono">{interestData[selectedLoan.id].days_elapsed} days</span>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accrued Interest</span>
                    <span className="font-mono text-amber-600">{formatCurrency(interestData[selectedLoan.id].accrued_interest)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interest Paid</span>
                    <span className="font-mono text-emerald-600">{formatCurrency(interestData[selectedLoan.id].interest_paid)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interest Due</span>
                    <span className="font-mono text-rose-600">{formatCurrency(interestData[selectedLoan.id].interest_due)}</span>
                  </div>
                </div>
                <div className="border-t border-gray-200 pt-2 mt-2">
                  <div className="flex justify-between text-lg font-medium">
                    <span className="text-gray-900">Total Due</span>
                    <span className={`font-mono ${selectedLoan.loan_type === "given" ? "text-emerald-600" : "text-rose-600"}`}>
                      {formatCurrency(interestData[selectedLoan.id].total_due)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button onClick={() => setShowInterestDialog(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
