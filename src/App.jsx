
import { useState } from "react";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DonorDashboard from "./pages/DonorDashboard";
import AddFoodBatch from "./pages/AddFoodBatch";
import NGODashboard from "./pages/NGODashboard";
import AdminDashboard from "./pages/AdminDashboard";

import "./App.css";

const SESSION_KEY = "foodrescue_session";

const getDashboardPage = (role) => {
  switch (role) {
    case "DONOR":
      return "donor-dashboard";
    case "NGO":
      return "ngo-dashboard";
    case "ADMIN":
      return "admin-dashboard";
    default:
      return "landing";
  }
};

const loadSavedSession = () => {
  try {
    const saved = localStorage.getItem(SESSION_KEY);

    if (!saved) return null;

    const session = JSON.parse(saved);

    if (
      !session ||
      !session.user ||
      !["DONOR", "NGO", "ADMIN"].includes(session.role)
    ) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }

    return session;
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
};

function App() {
  const [session, setSession] = useState(loadSavedSession);

  const [page, setPage] = useState(() => {
    const savedSession = loadSavedSession();

    return savedSession
      ? getDashboardPage(savedSession.role)
      : "landing";
  });

  const user = session?.user ?? null;

  const handleLogin = (role, userData) => {
    if (role === "DELIVERY") {
      alert("Delivery dashboard will be added next.");
      return;
    }

    const dashboardPage = getDashboardPage(role);

    if (dashboardPage === "landing") {
      alert("Unsupported account role.");
      return;
    }

    const newSession = {
      role,
      user: userData,
    };

    localStorage.setItem(
      SESSION_KEY,
      JSON.stringify(newSession)
    );

    setSession(newSession);
    setPage(dashboardPage);
  };

  const handleLogout = () => {
    localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setPage("login");
  };

  const handleAddFood = () => {
    setPage("add-food-batch");
  };

  const handleBackToDashboard = () => {
    setPage("donor-dashboard");
  };

  return (
    <>
      {page === "landing" && (
        <Landing
          onGetStarted={() => setPage("login")}
        />
      )}

      {page === "login" && (
        <Login
          onBack={() => setPage("landing")}
          onRegister={() => setPage("register")}
          onLogin={handleLogin}
        />
      )}

      {page === "register" && (
        <Register
          onBackToLogin={() => setPage("login")}
        />
      )}

      {page === "donor-dashboard" && (
        <DonorDashboard
          onLogout={handleLogout}
          onAddFood={handleAddFood}
          donorId={user?.donorId}
        />
      )}

      {page === "ngo-dashboard" && (
        <NGODashboard
          onLogout={handleLogout}
          ngoId={user?.ngoId}
        />
      )}

      {page === "admin-dashboard" && (
        <AdminDashboard
          onLogout={handleLogout}
        />
      )}

      {page === "add-food-batch" && (
        <AddFoodBatch
          onBack={handleBackToDashboard}
        />
      )}
    </>
  );
}

export default App;
