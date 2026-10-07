import { useEffect, useState } from "react";
import "./NGODashboard.css";

function NGODashboard({ onLogout, ngoId }) {
    const [requests, setRequests] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);

    const [activeSection, setActiveSection] = useState("dashboard");

    const [showRequestForm, setShowRequestForm] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);

    const [quantity, setQuantity] = useState("");
    const [requiredBy, setRequiredBy] = useState("");
    const [notes, setNotes] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    const loadData = async () => {
        if (!ngoId) {
            return;
        }

        try {
            setLoading(true);

            const [requestsResponse, batchesResponse] = await Promise.all([
                fetch(`http://localhost:5000/api/ngo-requests/${ngoId}`),
                fetch("http://localhost:5000/api/food-batches")
            ]);

            const requestsData = await requestsResponse.json();
            const batchesData = await batchesResponse.json();

            if (!requestsResponse.ok) {
                throw new Error(
                    requestsData.message || "Failed to fetch NGO requests"
                );
            }

            if (!batchesResponse.ok) {
                throw new Error(
                    batchesData.message || "Failed to fetch available food"
                );
            }

            setRequests(requestsData);
            setBatches(batchesData);
        } catch (error) {
            console.error("Failed to load NGO dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [ngoId]);

    const today = new Date();

    const formattedDate = today.toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric"
    });

    const hour = today.getHours();

    const greeting =
        hour < 12
            ? "Good morning"
            : hour < 17
                ? "Good afternoon"
                : "Good evening";

    const ngoName =
        requests.length > 0
            ? requests[0][1]
            : "Your Organisation";

    const totalRequests = requests.length;

    const pendingRequests = requests.filter(
        (request) => request[8] === "PENDING"
    ).length;

    const approvedRequests = requests.filter(
        (request) =>
            request[8] === "APPROVED" ||
            request[8] === "ALLOCATED"
    ).length;

    const completedRequests = requests.filter(
        (request) => request[8] === "COMPLETED"
    ).length;

    const handleRequestFood = (batch) => {
        setSelectedBatch(batch);
        setQuantity("");
        setRequiredBy("");
        setNotes("");
        setFormError("");
        setShowRequestForm(true);
    };

    const handleSubmitRequest = async (event) => {
        event.preventDefault();
        setFormError("");

        if (!quantity || Number(quantity) <= 0) {
            setFormError("Please enter a valid quantity.");
            return;
        }

        if (Number(quantity) > Number(selectedBatch[11])) {
            setFormError(
                `Only ${selectedBatch[11]} ${selectedBatch[6]} is available.`
            );
            return;
        }

        if (!requiredBy) {
            setFormError("Please select when the food is required.");
            return;
        }

        setSubmitting(true);

        try {
            const response = await fetch(
                "http://localhost:5000/api/ngo-requests",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        ngoId,
                        itemId: selectedBatch[1],
                        quantity: Number(quantity),
                        unit: selectedBatch[6],
                        requiredBy: requiredBy.replace("T", " "),
                        notes
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                setFormError(
                    data.error ||
                    data.message ||
                    "Failed to create request."
                );
                return;
            }

            setShowRequestForm(false);
            setSelectedBatch(null);
            setQuantity("");
            setRequiredBy("");
            setNotes("");

            setActiveSection("dashboard");

            await loadData();
        } catch (error) {
            console.error("Request creation error:", error);
            setFormError("Unable to connect to the server.");
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusClass = (status) => {
        if (status === "PENDING") {
            return "ngo-status pending";
        }

        if (
            status === "APPROVED" ||
            status === "ALLOCATED" ||
            status === "COMPLETED"
        ) {
            return "ngo-status success";
        }

        if (status === "CANCELLED") {
            return "ngo-status cancelled";
        }

        return "ngo-status";
    };

    return (
        <div className="ngo-dashboard">

            {/* SIDEBAR */}

            <aside className="ngo-sidebar">

                <div className="ngo-dashboard-brand">

                    <div className="ngo-dashboard-logo">
                        F
                    </div>

                    <div>
                        <strong>FoodRescue</strong>
                        <span>NGO Portal</span>
                    </div>

                </div>


                <nav className="ngo-dashboard-nav">

                    <p className="ngo-nav-label">
                        MAIN
                    </p>

                    <button
                        className={`ngo-nav-item ${
                            activeSection === "dashboard"
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            setActiveSection("dashboard")
                        }
                    >
                        <span className="ngo-nav-icon">
                            01
                        </span>
                        Dashboard
                    </button>


                    <button
                        className={`ngo-nav-item ${
                            activeSection === "requests"
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            setActiveSection("requests")
                        }
                    >
                        <span className="ngo-nav-icon">
                            02
                        </span>
                        Food Requests
                    </button>


                    <button
                        className={`ngo-nav-item ${
                            activeSection === "available"
                                ? "active"
                                : ""
                        }`}
                        onClick={() =>
                            setActiveSection("available")
                        }
                    >
                        <span className="ngo-nav-icon">
                            03
                        </span>
                        Available Food
                    </button>


                    <button
                        className="ngo-nav-item"
                        onClick={() =>
                            setActiveSection("requests")
                        }
                    >
                        <span className="ngo-nav-icon">
                            04
                        </span>
                        Allocations
                    </button>


                    <button
                        className="ngo-nav-item"
                        onClick={() =>
                            setActiveSection("requests")
                        }
                    >
                        <span className="ngo-nav-icon">
                            05
                        </span>
                        Deliveries
                    </button>


                    <p className="ngo-nav-label ngo-nav-label-spaced">
                        ACCOUNT
                    </p>


                    <button className="ngo-nav-item">
                        <span className="ngo-nav-icon">
                            06
                        </span>
                        Organization
                    </button>


                    <button className="ngo-nav-item">
                        <span className="ngo-nav-icon">
                            07
                        </span>
                        Notifications
                    </button>

                </nav>


                <div className="ngo-sidebar-bottom">

                    <div className="ngo-user-mini">

                        <div className="ngo-user-avatar">
                            HF
                        </div>

                        <div>
                            <strong>{ngoName}</strong>
                            <span>NGO</span>
                        </div>

                    </div>


                    <button
                        className="ngo-logout-button"
                        onClick={onLogout}
                    >
                        Sign out
                    </button>

                </div>

            </aside>


            {/* MAIN CONTENT */}

            <main className="ngo-main">

                <header className="ngo-dashboard-header">

                    <div>

                        <p className="ngo-dashboard-eyebrow">
                            NGO PORTAL
                        </p>

                        <h1>
                            {greeting}, {ngoName}.
                        </h1>

                        <p>
                            Here's what's happening with your food
                            requirements.
                        </p>

                    </div>


                    <div className="ngo-header-date">
                        <span>Today</span>
                        <strong>{formattedDate}</strong>
                    </div>

                </header>


                {/* STATISTICS */}

                <section className="ngo-dashboard-stats">

                    <div className="ngo-stat-card">

                        <span>Total requests</span>

                        <strong>
                            {totalRequests}
                        </strong>

                        <small>
                            food requests submitted
                        </small>

                    </div>


                    <div className="ngo-stat-card">

                        <span>Pending</span>

                        <strong>
                            {pendingRequests}
                        </strong>

                        <small>
                            awaiting approval
                        </small>

                    </div>


                    <div className="ngo-stat-card">

                        <span>Approved</span>

                        <strong>
                            {approvedRequests}
                        </strong>

                        <small>
                            accepted or allocated
                        </small>

                    </div>


                    <div className="ngo-stat-card warning">

                        <span>Completed</span>

                        <strong>
                            {completedRequests}
                        </strong>

                        <small>
                            food received
                        </small>

                    </div>

                </section>


                {/* DASHBOARD VIEW */}

                {activeSection === "dashboard" && (
                    <>
                        <section className="ngo-dashboard-grid">

                            {/* RECENT REQUESTS */}

                            <div className="ngo-dashboard-card ngo-requests-card">

                                <div className="ngo-card-heading">

                                    <div>
                                        <span>
                                            FOOD REQUIREMENTS
                                        </span>

                                        <h2>
                                            Recent requests
                                        </h2>
                                    </div>

                                    <button
                                        className="ngo-outline-button"
                                        onClick={() =>
                                            setActiveSection("requests")
                                        }
                                    >
                                        View all
                                    </button>

                                </div>


                                <div className="ngo-request-table">

                                    <div className="ngo-table-header">
                                        <span>FOOD</span>
                                        <span>QUANTITY</span>
                                        <span>REQUIRED BY</span>
                                        <span>STATUS</span>
                                    </div>


                                    {loading ? (
                                        <div className="ngo-table-empty">
                                            Loading requests...
                                        </div>
                                    ) : requests.length === 0 ? (
                                        <div className="ngo-table-empty">
                                            No food requests yet.
                                        </div>
                                    ) : (
                                        requests
                                            .slice(0, 5)
                                            .map((request) => (
                                                <div
                                                    className="ngo-request-row"
                                                    key={request[3]}
                                                >

                                                    <div className="ngo-food-name">

                                                        <div className="ngo-food-code">
                                                            {request[2]
                                                                .split(" ")
                                                                .map(
                                                                    (word) =>
                                                                        word[0]
                                                                )
                                                                .join("")
                                                                .slice(0, 2)
                                                                .toUpperCase()}
                                                        </div>

                                                        <div>
                                                            <strong>
                                                                {request[2]}
                                                            </strong>

                                                            <span>
                                                                Request #
                                                                {request[0]}
                                                            </span>
                                                        </div>

                                                    </div>


                                                    <span>
                                                        {request[4]}{" "}
                                                        {request[5].toLowerCase()}
                                                    </span>


                                                    <span>
                                                        {new Date(
                                                            request[7]
                                                        ).toLocaleTimeString(
                                                            [],
                                                            {
                                                                hour: "2-digit",
                                                                minute: "2-digit"
                                                            }
                                                        )}
                                                    </span>


                                                    <span
                                                        className={getStatusClass(
                                                            request[8]
                                                        )}
                                                    >
                                                        {request[8]}
                                                    </span>

                                                </div>
                                            ))
                                    )}

                                </div>

                            </div>


                            {/* REQUEST FOOD */}

                            <div className="ngo-dashboard-card ngo-request-food-card">

                                <div className="ngo-card-heading">

                                    <div>
                                        <span>
                                            FOOD REQUIREMENT
                                        </span>

                                        <h2>
                                            Request food
                                        </h2>
                                    </div>

                                </div>


                                <p>
                                    Browse available surplus food and
                                    submit a request for your organisation.
                                </p>


                                <button
                                    type="button"
                                    className="ngo-primary-button"
                                    onClick={() =>
                                        setActiveSection("available")
                                    }
                                >
                                    + Request food
                                </button>


                                <div className="ngo-quick-info">

                                    <div>
                                        <strong>
                                            Availability
                                        </strong>

                                        <span>
                                            Live donor inventory
                                        </span>
                                    </div>


                                    <div>
                                        <strong>
                                            Approval
                                        </strong>

                                        <span>
                                            Tracked by status
                                        </span>
                                    </div>


                                    <div>
                                        <strong>
                                            Distribution
                                        </strong>

                                        <span>
                                            Recorded in system
                                        </span>
                                    </div>

                                </div>

                            </div>

                        </section>


                        {/* AVAILABLE FOOD */}

                        <section className="ngo-dashboard-card ngo-available-card">

                            <div className="ngo-card-heading">

                                <div>
                                    <span>
                                        DONOR INVENTORY
                                    </span>

                                    <h2>
                                        Available food
                                    </h2>
                                </div>

                                <button
                                    className="ngo-outline-button"
                                    onClick={() =>
                                        setActiveSection("available")
                                    }
                                >
                                    View all
                                </button>

                            </div>


                            <div className="ngo-available-table">

                                <div className="ngo-available-header">
                                    <span>FOOD</span>
                                    <span>DONOR</span>
                                    <span>AVAILABLE</span>
                                    <span>EXPIRY</span>
                                    <span></span>
                                </div>


                                {loading ? (
                                    <div className="ngo-table-empty">
                                        Loading available food...
                                    </div>
                                ) : batches.length === 0 ? (
                                    <div className="ngo-table-empty">
                                        No food is currently available.
                                    </div>
                                ) : (
                                    batches
                                        .slice(0, 5)
                                        .map((batch) => (
                                            <div
                                                className="ngo-available-row"
                                                key={batch[0]}
                                            >

                                                <div className="ngo-food-name">

                                                    <div className="ngo-food-code">
                                                        {batch[3]
                                                            .split(" ")
                                                            .map(
                                                                (word) =>
                                                                    word[0]
                                                            )
                                                            .join("")
                                                            .slice(0, 2)
                                                            .toUpperCase()}
                                                    </div>

                                                    <div>
                                                        <strong>
                                                            {batch[3]}
                                                        </strong>

                                                        <span>
                                                            Batch #{batch[0]}
                                                        </span>
                                                    </div>

                                                </div>


                                                <span>
                                                    {batch[2]}
                                                </span>


                                                <span>
                                                    {batch[11]}{" "}
                                                    {batch[6].toLowerCase()}
                                                </span>


                                                <span>
                                                    {new Date(
                                                        batch[8]
                                                    ).toLocaleTimeString(
                                                        [],
                                                        {
                                                            hour: "2-digit",
                                                            minute: "2-digit"
                                                        }
                                                    )}
                                                </span>


                                                <button
                                                    className="ngo-small-request-button"
                                                    onClick={() =>
                                                        handleRequestFood(batch)
                                                    }
                                                >
                                                    Request
                                                </button>

                                            </div>
                                        ))
                                )}

                            </div>

                        </section>
                    </>
                )}


                {/* REQUESTS VIEW */}

                {activeSection === "requests" && (
                    <section className="ngo-dashboard-card ngo-full-section">

                        <div className="ngo-card-heading">

                            <div>
                                <span>
                                    FOOD REQUIREMENTS
                                </span>

                                <h2>
                                    My food requests
                                </h2>
                            </div>

                        </div>


                        <div className="ngo-request-table">

                            <div className="ngo-table-header">
                                <span>FOOD</span>
                                <span>QUANTITY</span>
                                <span>REQUIRED BY</span>
                                <span>STATUS</span>
                            </div>


                            {loading ? (
                                <div className="ngo-table-empty">
                                    Loading requests...
                                </div>
                            ) : requests.length === 0 ? (
                                <div className="ngo-table-empty">
                                    No food requests yet.
                                </div>
                            ) : (
                                requests.map((request) => (
                                    <div
                                        className="ngo-request-row"
                                        key={request[3]}
                                    >

                                        <div className="ngo-food-name">

                                            <div className="ngo-food-code">
                                                {request[2]
                                                    .split(" ")
                                                    .map(
                                                        (word) =>
                                                            word[0]
                                                    )
                                                    .join("")
                                                    .slice(0, 2)
                                                    .toUpperCase()}
                                            </div>

                                            <div>
                                                <strong>
                                                    {request[2]}
                                                </strong>

                                                <span>
                                                    Request #{request[0]}
                                                </span>
                                            </div>

                                        </div>


                                        <span>
                                            {request[4]}{" "}
                                            {request[5].toLowerCase()}
                                        </span>


                                        <span>
                                            {new Date(
                                                request[7]
                                            ).toLocaleDateString(
                                                "en-IN",
                                                {
                                                    day: "2-digit",
                                                    month: "short",
                                                    year: "numeric"
                                                }
                                            )}
                                        </span>


                                        <span
                                            className={getStatusClass(
                                                request[8]
                                            )}
                                        >
                                            {request[8]}
                                        </span>

                                    </div>
                                ))
                            )}

                        </div>

                    </section>
                )}


                {/* AVAILABLE FOOD VIEW */}

                {activeSection === "available" && (
                    <section className="ngo-dashboard-card ngo-full-section">

                        <div className="ngo-card-heading">

                            <div>
                                <span>
                                    DONOR INVENTORY
                                </span>

                                <h2>
                                    Available food
                                </h2>
                            </div>

                        </div>


                        <div className="ngo-food-grid">

                            {loading ? (
                                <div className="ngo-table-empty">
                                    Loading available food...
                                </div>
                            ) : batches.length === 0 ? (
                                <div className="ngo-table-empty">
                                    No food is currently available.
                                </div>
                            ) : (
                                batches.map((batch) => (
                                    <div
                                        className="ngo-food-card"
                                        key={batch[0]}
                                    >

                                        <div className="ngo-food-card-top">

                                            <span>
                                                {batch[4]}
                                            </span>

                                            <span className="ngo-food-status">
                                                AVAILABLE
                                            </span>

                                        </div>


                                        <h3>
                                            {batch[3]}
                                        </h3>


                                        <div className="ngo-food-quantity">

                                            <strong>
                                                {batch[11]}
                                            </strong>

                                            <span>
                                                {batch[6].toLowerCase()}
                                                {" "}available
                                            </span>

                                        </div>


                                        <div className="ngo-food-info">

                                            <div>
                                                <span>
                                                    DONOR
                                                </span>

                                                <strong>
                                                    {batch[2]}
                                                </strong>
                                            </div>


                                            <div>
                                                <span>
                                                    EXPIRES
                                                </span>

                                                <strong>
                                                    {new Date(
                                                        batch[8]
                                                    ).toLocaleString()}
                                                </strong>
                                            </div>

                                        </div>


                                        <button
                                            className="ngo-primary-button"
                                            onClick={() =>
                                                handleRequestFood(batch)
                                            }
                                        >
                                            Request Food
                                        </button>

                                    </div>
                                ))
                            )}

                        </div>

                    </section>
                )}


                {/* REQUEST MODAL */}

                {showRequestForm && selectedBatch && (
                    <div className="ngo-request-modal">

                        <div className="ngo-request-modal-card">

                            <div className="ngo-request-modal-header">

                                <div>

                                    <span>
                                        FOOD REQUEST
                                    </span>

                                    <h2>
                                        Request {selectedBatch[3]}
                                    </h2>

                                    <p>
                                        Available:{" "}
                                        {selectedBatch[11]}{" "}
                                        {selectedBatch[6]}
                                    </p>

                                </div>


                                <button
                                    type="button"
                                    onClick={() =>
                                        setShowRequestForm(false)
                                    }
                                >
                                    ×
                                </button>

                            </div>


                            <form onSubmit={handleSubmitRequest}>

                                <div className="ngo-input-group">

                                    <label>
                                        Quantity
                                    </label>

                                    <input
                                        type="number"
                                        min="1"
                                        max={selectedBatch[11]}
                                        value={quantity}
                                        onChange={(event) =>
                                            setQuantity(
                                                event.target.value
                                            )
                                        }
                                        placeholder={`Enter quantity in ${selectedBatch[6]}`}
                                    />

                                </div>


                                <div className="ngo-input-group">

                                    <label>
                                        Required By
                                    </label>

                                    <input
                                        type="datetime-local"
                                        value={requiredBy}
                                        onChange={(event) =>
                                            setRequiredBy(
                                                event.target.value
                                            )
                                        }
                                    />

                                </div>


                                <div className="ngo-input-group">

                                    <label>
                                        Notes
                                    </label>

                                    <textarea
                                        value={notes}
                                        onChange={(event) =>
                                            setNotes(
                                                event.target.value
                                            )
                                        }
                                        placeholder="Optional request details"
                                        rows="3"
                                    />

                                </div>


                                {formError && (
                                    <div className="ngo-form-error">
                                        {formError}
                                    </div>
                                )}


                                <div className="ngo-request-modal-actions">

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowRequestForm(false)
                                        }
                                    >
                                        Cancel
                                    </button>


                                    <button
                                        type="submit"
                                        disabled={submitting}
                                    >
                                        {submitting
                                            ? "Submitting..."
                                            : "Submit Request"}
                                    </button>

                                </div>

                            </form>

                        </div>

                    </div>
                )}

                <footer className="ngo-dashboard-footer">
                    <span>
                        FoodRescue Management System
                    </span>

                    <span>
                        NGO Portal
                    </span>
                </footer>

            </main>

        </div>
    );
}

export default NGODashboard;