import { useState, useEffect, createContext, useContext } from "react";
import "@/App.css";
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { Toaster } from "@/components/ui/sonner";

// Pages
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import BankUpload from "@/pages/BankUpload";
import Transactions from "@/pages/Transactions";
import Ledgers from "@/pages/Ledgers";
import Loans from "@/pages/Loans";
import CashBook from "@/pages/CashBook";
import Reports from "@/pages/Reports";
import Settings from "@/pages/Settings";
import Layout from "@/components/Layout";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

// Auth Context
export const AuthContext = createContext(null);

export const useAuth = () => useContext(AuthContext);

const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem("ledgeros_token"));
  const [loading, setLoading] = useState(true);
  const [setupRequired, setSetupRequired] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await axios.get(`${API}/auth/check`);
      setSetupRequired(res.data.setup_required);
    } catch (e) {
      console.error("Auth check failed:", e);
    } finally {
      setLoading(false);
    }
  };

  const login = (newToken) => {
    localStorage.setItem("ledgeros_token", newToken);
    setToken(newToken);
  };

  const logout = async () => {
    if (token) {
      try {
        await axios.post(`${API}/auth/logout?token=${token}`);
      } catch (e) {
        console.error("Logout error:", e);
      }
    }
    localStorage.removeItem("ledgeros_token");
    setToken(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="text-slate-400">Loading...</div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ token, login, logout, setupRequired, setSetupRequired }}>
      {children}
    </AuthContext.Provider>
  );
};

const ProtectedRoute = ({ children }) => {
  const { token } = useAuth();
  const location = useLocation();

  if (!token) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

function AppRoutes() {
  const { token, setupRequired } = useAuth();

  return (
    <Routes>
      <Route path="/login" element={
        token ? <Navigate to="/" replace /> : <Login />
      } />
      <Route path="/" element={
        <ProtectedRoute>
          <Layout>
            <Dashboard />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/upload" element={
        <ProtectedRoute>
          <Layout>
            <BankUpload />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/transactions" element={
        <ProtectedRoute>
          <Layout>
            <Transactions />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/ledgers" element={
        <ProtectedRoute>
          <Layout>
            <Ledgers />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/loans" element={
        <ProtectedRoute>
          <Layout>
            <Loans />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/cash" element={
        <ProtectedRoute>
          <Layout>
            <CashBook />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/reports" element={
        <ProtectedRoute>
          <Layout>
            <Reports />
          </Layout>
        </ProtectedRoute>
      } />
      <Route path="/settings" element={
        <ProtectedRoute>
          <Layout>
            <Settings />
          </Layout>
        </ProtectedRoute>
      } />
    </Routes>
  );
}

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AppRoutes />
        <Toaster position="top-right" richColors />
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
