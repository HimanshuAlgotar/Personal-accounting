import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth, API } from "@/App";
import axios from "axios";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Lock, Eye, EyeOff } from "lucide-react";

export default function Login() {
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, setupRequired, setSetupRequired } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (setupRequired) {
        if (password !== confirmPassword) {
          toast.error("Passwords do not match");
          setLoading(false);
          return;
        }
        if (password.length < 4) {
          toast.error("Password must be at least 4 characters");
          setLoading(false);
          return;
        }
        const res = await axios.post(`${API}/auth/setup`, { password });
        login(res.data.token);
        setSetupRequired(false);
        toast.success("Setup complete! Welcome to LedgerOS");
      } else {
        const res = await axios.post(`${API}/auth/login`, { password });
        login(res.data.token);
        toast.success("Welcome back!");
      }
      navigate("/");
    } catch (err) {
      toast.error(err.response?.data?.detail || "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container" data-testid="login-page">
      <div className="login-card animate-fadeIn">
        <div className="text-center mb-8">
          <div className="w-12 h-12 bg-indigo-600/20 rounded-sm flex items-center justify-center mx-auto mb-4">
            <Lock className="text-indigo-400" size={24} strokeWidth={1.5} />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">LedgerOS</h1>
          <p className="text-slate-400 text-sm">
            {setupRequired ? "Set up your password to get started" : "Enter your password to continue"}
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="password" className="text-slate-300 text-sm">
              Password
            </Label>
            <div className="relative mt-1">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-slate-950 border-slate-700 focus:border-indigo-500 pr-10"
                placeholder="Enter password"
                data-testid="password-input"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-300"
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {setupRequired && (
            <div>
              <Label htmlFor="confirmPassword" className="text-slate-300 text-sm">
                Confirm Password
              </Label>
              <Input
                id="confirmPassword"
                type={showPassword ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="bg-slate-950 border-slate-700 focus:border-indigo-500 mt-1"
                placeholder="Confirm password"
                data-testid="confirm-password-input"
                required
              />
            </div>
          )}

          <Button
            type="submit"
            className="w-full btn-primary text-white"
            disabled={loading}
            data-testid="login-btn"
          >
            {loading ? "Please wait..." : setupRequired ? "Set Password" : "Unlock"}
          </Button>
        </form>

        <p className="text-center text-slate-500 text-xs mt-6">
          Your data is stored locally and secured with your password
        </p>
      </div>
    </div>
  );
}
