import { useState } from "react";
import "./Login.css";

function Login({ onBack, onRegister, onLogin }) {
    const [role, setRole] = useState("DONOR");
    const [username, setUsername] = useState("");
    const [password, setPassword] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        setError("");

        if (!username || !password) {
            setError("Please enter both username and password.");
            return;
        }

        setLoading(true);

        try {
            const response = await fetch("http://localhost:5000/api/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    username,
                    password,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                setError(data.message || "Login failed.");
                return;
            }

            if (data.role !== role) {
                setError(`This account is registered as ${data.role}.`);
                return;
            }

            onLogin(data.role, data);
        } catch (error) {
            console.error("Login error:", error);
            setError("Unable to connect to the server.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">

            {/* Left side */}
            <section className="login-info">

                <button
                    type="button"
                    className="back-button"
                    onClick={onBack}
                >
                    ← Back to Home
                </button>

                <div className="login-brand">
                    <div className="login-brand-icon">F</div>
                    <span>FoodRescue</span>
                </div>

                <div className="login-message">
                    <p className="login-label">WELCOME BACK</p>

                    <h1>
                        Together, we can make
                        <span> every meal count.</span>
                    </h1>

                    <p>
                        Manage surplus food, connect with organizations,
                        and help redistribute safe food to people who need it.
                    </p>
                </div>

                <div className="login-stat">
                    <strong>1,240+</strong>

                    <span>
                        meals already rescued through FoodRescue
                    </span>
                </div>

            </section>


            {/* Right side */}
            <section className="login-form-section">

                <div className="login-card">

                    <div className="login-heading">
                        <p className="login-label">FOODRESCUE PORTAL</p>

                        <h2>Sign in</h2>

                        <p>
                            Access your FoodRescue account to continue.
                        </p>
                    </div>


                    {/* Role selection */}
                    <div className="role-section">

                        <label>Login as</label>

                        <div className="role-buttons">

                            <button
                                type="button"
                                className={role === "DONOR" ? "active" : ""}
                                onClick={() => setRole("DONOR")}
                            >
                                <span>🏪</span>
                                Donor
                            </button>

                            <button
                                type="button"
                                className={role === "NGO" ? "active" : ""}
                                onClick={() => setRole("NGO")}
                            >
                                <span>🤝</span>
                                NGO
                            </button>

                            <button
                                type="button"
                                className={role === "DELIVERY" ? "active" : ""}
                                onClick={() => setRole("DELIVERY")}
                            >
                                <span>🚚</span>
                                Delivery
                            </button>

                            <button
                                type="button"
                                className={role === "ADMIN" ? "active" : ""}
                                onClick={() => setRole("ADMIN")}
                            >
                                <span>⚙</span>
                                Admin
                            </button>

                        </div>
                    </div>


                    <form onSubmit={handleSubmit}>

                        {/* Username */}
                        <div className="input-group">

                            <label htmlFor="username">
                                Username
                            </label>

                            <input
                                id="username"
                                type="text"
                                placeholder="Enter your username"
                                value={username}
                                onChange={(event) =>
                                    setUsername(event.target.value)
                                }
                            />

                        </div>


                        {/* Password */}
                        <div className="input-group">

                            <div className="password-label">

                                <label htmlFor="password">
                                    Password
                                </label>

                                <button
                                    type="button"
                                    className="forgot-password"
                                >
                                    Forgot password?
                                </button>

                            </div>

                            <input
                                id="password"
                                type="password"
                                placeholder="Enter your password"
                                value={password}
                                onChange={(event) =>
                                    setPassword(event.target.value)
                                }
                            />

                        </div>


                        {/* Error */}
                        {error && (
                            <div className="login-error">
                                {error}
                            </div>
                        )}


                        {/* Submit */}
                        <button
                            type="submit"
                            className="login-button"
                            disabled={loading}
                        >
                            {loading ? "Signing in..." : "Sign in"}
                            {!loading && <span>→</span>}
                        </button>

                    </form>


                    <div className="register-section">

                        <span>
                            Don't have an account?
                        </span>

                        <button
                            type="button"
                            onClick={onRegister}
                        >
                            Create an account
                        </button>

                    </div>

                </div>

            </section>

        </div>
    );
}

export default Login;