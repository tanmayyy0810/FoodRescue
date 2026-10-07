import { useState } from "react";

import Landing from "./pages/Landing";
import Login from "./pages/Login";
import Register from "./pages/Register";
import DonorDashboard from "./pages/DonorDashboard";
import AddFoodBatch from "./pages/AddFoodBatch";

import "./App.css";

function App() {
  const [page, setPage] = useState("landing");

  const handleLogin = (role) => {
    if (role === "DONOR") {
      setPage("donor-dashboard");
      return;
    }

    alert(`${role} dashboard will be added next.`);
  };

  const handleLogout = () => {
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