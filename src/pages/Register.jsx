import { useState } from "react";
import "./Register.css";

function Register({ onBackToLogin }) {
  const [accountType, setAccountType] = useState("DONOR");

  const [formData, setFormData] = useState({
    name: "",
    username: "",
    organizationName: "",
    email: "",
    phone: "",
    password: "",
    confirmPassword: "",
    address: "",
    city: "",
  });
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value,
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (
      !formData.name ||
      !formData.username ||
      !formData.organizationName ||
      !formData.email ||
      !formData.phone ||
      !formData.password ||
      !formData.confirmPassword ||
      !formData.address ||
      !formData.city
    ) {
      setError("Please fill in all required fields.");
      return;
    }

    if (!formData.email.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    if (formData.password.length < 6) {
      setError("Password must contain at least 6 characters.");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

   try {
  const response = await fetch("http://localhost:5000/api/register", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      accountType,
      contactName: formData.name,
      organizationName: formData.organizationName,
      email: formData.email,
      phone: formData.phone,
      password: formData.password,
      address: formData.address,
      city: formData.city,
      username: formData.username,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    setError(data.error || data.message || "Registration failed.");
    return;
  }

  alert(
    "Registration submitted successfully. Your account is pending admin approval."
  );

  onBackToLogin();

} catch (error) {
  console.error("Registration error:", error);
  setError("Unable to connect to the server.");
}
  };

  return (
    <div className="register-page">

      {/* HEADER */}

      <header className="register-header">

        <div className="site-logo">
          <div className="site-logo-mark">F</div>
          <span>FoodRescue</span>
        </div>

        <button
          className="register-login-button"
          onClick={onBackToLogin}
        >
          Already have an account? <strong>Sign in</strong>
        </button>

      </header>


      {/* CONTENT */}

      <main className="register-content">

        <div className="register-heading">

          <p className="register-eyebrow">
            JOIN FOODRESCUE
          </p>

          <h1>
            Create your
            <span> FoodRescue account.</span>
          </h1>

          <p>
            Register as a food donor or an organization that
            redistributes food to communities.
          </p>

        </div>


        <div className="register-layout">

          {/* ACCOUNT TYPE */}

          <aside className="account-type-panel">

            <p className="account-type-label">
              ACCOUNT TYPE
            </p>

            <button
              type="button"
              className={
                accountType === "DONOR"
                  ? "account-type active"
                  : "account-type"
              }
              onClick={() => setAccountType("DONOR")}
            >
              <div className="account-icon">
                D
              </div>

              <div>
                <strong>Food Donor</strong>
                <span>
                  Restaurant, cafeteria or caterer
                </span>
              </div>

              <b>→</b>
            </button>


            <button
              type="button"
              className={
                accountType === "NGO"
                  ? "account-type active"
                  : "account-type"
              }
              onClick={() => setAccountType("NGO")}
            >
              <div className="account-icon">
                N
              </div>

              <div>
                <strong>NGO / Organization</strong>
                <span>
                  Shelter, food bank or community kitchen
                </span>
              </div>

              <b>→</b>
            </button>


            <div className="registration-note">
              <strong>Verification required</strong>

              <p>
                New organizations will be reviewed before
                receiving access to the allocation system.
              </p>
            </div>

          </aside>


          {/* FORM */}

          <section className="register-form-card">

            <div className="form-card-heading">

              <div>
                <span>REGISTERING AS</span>
                <h2>
                  {accountType === "DONOR"
                    ? "Food Donor"
                    : "NGO / Organization"}
                </h2>
              </div>

              <div className="form-role">
                {accountType}
              </div>

            </div>


            <form onSubmit={handleSubmit}>

              <div className="form-grid">

                {/* USERNAME */}

                <div className="register-input">

                  <label htmlFor="username">
                    Username
                  </label>

                  <input
                    id="username"
                    name="username"
                    type="text"
                    placeholder="Choose a username"
                    value={formData.username}
                    onChange={handleChange}
                  />

                </div>


                {/* NAME */}

                <div className="register-input">

                  <label htmlFor="name">
                    Contact person
                  </label>

                  <input
                    id="name"
                    name="name"
                    type="text"
                    placeholder="Enter full name"
                    value={formData.name}
                    onChange={handleChange}
                  />

                </div>


                {/* ORGANIZATION */}

                <div className="register-input">

                  <label htmlFor="organizationName">
                    Organization name
                  </label>

                  <input
                    id="organizationName"
                    name="organizationName"
                    type="text"
                    placeholder={
                      accountType === "DONOR"
                        ? "Restaurant / cafeteria name"
                        : "NGO / organization name"
                    }
                    value={formData.organizationName}
                    onChange={handleChange}
                  />

                </div>


                {/* EMAIL */}

                <div className="register-input">

                  <label htmlFor="email">
                    Email address
                  </label>

                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    value={formData.email}
                    onChange={handleChange}
                  />

                </div>


                {/* PHONE */}

                <div className="register-input">

                  <label htmlFor="phone">
                    Phone number
                  </label>

                  <input
                    id="phone"
                    name="phone"
                    type="tel"
                    placeholder="+91 XXXXX XXXXX"
                    value={formData.phone}
                    onChange={handleChange}
                  />

                </div>


                {/* ADDRESS */}

                <div className="register-input full-width">

                  <label htmlFor="address">
                    Address
                  </label>

                  <input
                    id="address"
                    name="address"
                    type="text"
                    placeholder="Organization address"
                    value={formData.address}
                    onChange={handleChange}
                  />

                </div>


                {/* CITY */}

                <div className="register-input">

                  <label htmlFor="city">
                    City
                  </label>

                  <input
                    id="city"
                    name="city"
                    type="text"
                    placeholder="e.g. Vellore"
                    value={formData.city}
                    onChange={handleChange}
                  />

                </div>


                {/* PASSWORD */}

                <div className="register-input">

                  <label htmlFor="password">
                    Password
                  </label>

                  <input
                    id="password"
                    name="password"
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={handleChange}
                  />

                </div>


                {/* CONFIRM PASSWORD */}

                <div className="register-input">

                  <label htmlFor="confirmPassword">
                    Confirm password
                  </label>

                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    placeholder="Re-enter password"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                  />

                </div>

              </div>


              {error && (
                <div className="register-error">
                  {error}
                </div>
              )}


              <div className="register-submit-row">

                <p>
                  By registering, your organization agrees to
                  verification before accessing the platform.
                </p>

                <button
                  type="submit"
                  className="register-submit"
                >
                  Create account
                  <span>→</span>
                </button>

              </div>

            </form>

          </section>

        </div>

      </main>

    </div>
  );
}

export default Register;