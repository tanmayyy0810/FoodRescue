import { useState } from "react";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DonorDashboard from "./pages/DonorDashboard";
import AddFoodBatch from "./pages/AddFoodBatch";
import NGODashboard from "./pages/NGODashboard";

import "./App.css";

function App() {
  const [page, setPage] = useState("landing");
  const [user, setUser] = useState(null);

  const handleLogin = (role, userData) => {
    setUser(userData);

    if (role === "DONOR") {
      setPage("donor-dashboard");
      return;
    }

    if (role === "NGO") {
      setPage("ngo-dashboard");
      return;
    }

    if (role === "ADMIN") {
      alert("Admin dashboard will be added next.");
      return;
    }

    if (role === "DELIVERY") {
      alert("Delivery dashboard will be added next.");
      return;
    }
  };

  const handleLogout = () => {
    setUser(null);
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

      {page === "add-food-batch" && (
        <AddFoodBatch
          onBack={handleBackToDashboard}
        />
      )}
    </>
  );
}

export default App;