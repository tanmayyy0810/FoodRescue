import { useEffect, useState } from "react";
import "./NGODashboard.css";

function NGODashboard({ onLogout, ngoId }) {
    const [requests, setRequests] = useState([]);
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);

    const [activeSection, setActiveSection] = useState("requests");

    const [showRequestForm, setShowRequestForm] = useState(false);
    const [selectedBatch, setSelectedBatch] = useState(null);

    const [quantity, setQuantity] = useState("");
    const [requiredBy, setRequiredBy] = useState("");
    const [notes, setNotes] = useState("");

    const [submitting, setSubmitting] = useState(false);
    const [formError, setFormError] = useState("");

    const loadData = async () => {
        try {
            const [requestsResponse, batchesResponse] = await Promise.all([
                fetch(`http://localhost:5000/api/ngo-requests/${ngoId}`),
                fetch("http://localhost:5000/api/food-batches")
            ]);

            const requestsData = await requestsResponse.json();
            const batchesData = await batchesResponse.json();

            setRequests(requestsData);
            setBatches(batchesData);
        } catch (error) {
            console.error("Failed to load NGO dashboard:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (ngoId) {
            loadData();
        }
    }, [ngoId]);

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
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        ngoId,
                        itemId: selectedBatch[1],
                        quantity: Number(quantity),
                        unit: selectedBatch[6],
                        requiredBy: requiredBy.replace("T", " "),
                        notes,
                    }),
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

            setActiveSection("requests");

            await loadData();

        } catch (error) {
            console.error("Request creation error:", error);
            setFormError("Unable to connect to the server.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="ngo-dashboard">

            <header className="ngo-header">
                <div>
                    <h1>NGO Dashboard</h1>
                    <p>Manage food requirements and allocations</p>
                </div>

                <button onClick={onLogout}>Logout</button>
            </header>

            <main className="ngo-content">

                <nav className="ngo-tabs">
                    <button
                        className={
                            activeSection === "requests"
                                ? "active"
                                : ""
                        }
                        onClick={() => setActiveSection("requests")}
                    >
                        My Requests
                    </button>

                    <button
                        className={
                            activeSection === "available"
                                ? "active"
                                : ""
                        }
                        onClick={() => setActiveSection("available")}
                    >
                        Available Food
                    </button>
                </nav>

                {activeSection === "requests" && (
                    <section className="ngo-section">

                        <div className="section-heading">
                            <div>
                                <h2>My Food Requests</h2>
                                <p>
                                    Track the food requested by your
                                    organisation.
                                </p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="ngo-message">
                                Loading requests...
                            </div>
                        ) : requests.length === 0 ? (
                            <div className="ngo-message">
                                No requests found.
                            </div>
                        ) : (
                            <div className="request-list">

                                {requests.map((request) => (
                                    <div
                                        className="request-card"
                                        key={request[0]}
                                    >
                                        <div className="request-main">

                                            <div>
                                                <span className="request-label">
                                                    REQUEST #{request[0]}
                                                </span>

                                                <h3>{request[1]}</h3>

                                                <p>{request[2]}</p>
                                            </div>

                                            <span className="request-status">
                                                {request[8]}
                                            </span>

                                        </div>

                                        <div className="request-details">

                                            <div>
                                                <span>REQUESTED</span>
                                                <strong>
                                                    {request[4]} {request[5]}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>ALLOCATED</span>
                                                <strong>
                                                    {request[6]} {request[5]}
                                                </strong>
                                            </div>

                                            <div>
                                                <span>REQUIRED BY</span>
                                                <strong>
                                                    {new Date(
                                                        request[7]
                                                    ).toLocaleString()}
                                                </strong>
                                            </div>

                                        </div>
                                    </div>
                                ))}

                            </div>
                        )}

                    </section>
                )}

                {activeSection === "available" && (
                    <section className="ngo-section">

                        <div className="section-heading">
                            <div>
                                <h2>Available Food</h2>
                                <p>
                                    Browse food currently available for
                                    redistribution.
                                </p>
                            </div>
                        </div>

                        {loading ? (
                            <div className="ngo-message">
                                Loading available food...
                            </div>
                        ) : batches.length === 0 ? (
                            <div className="ngo-message">
                                No food is currently available.
                            </div>
                        ) : (
                            <div className="food-grid">

                                {batches.map((batch) => (
                                    <div
                                        className="food-card"
                                        key={batch[0]}
                                    >

                                        <div className="food-card-top">

                                            <span className="food-category">
                                                {batch[4]}
                                            </span>

                                            <span className="food-status">
                                                AVAILABLE
                                            </span>

                                        </div>

                                        <h3>{batch[3]}</h3>

                                        <div className="food-quantity">

                                            <strong>{batch[11]}</strong>

                                            <span>
                                                {batch[6].toLowerCase()}
                                                {" "}available
                                            </span>

                                        </div>

                                        <div className="food-info">

                                            <div>
                                                <span>DONOR</span>
                                                <strong>{batch[2]}</strong>
                                            </div>

                                            <div>
                                                <span>EXPIRES</span>
                                                <strong>
                                                    {new Date(
                                                        batch[8]
                                                    ).toLocaleString()}
                                                </strong>
                                            </div>

                                        </div>

                                        <button
                                            className="request-food-button"
                                            onClick={() =>
                                                handleRequestFood(batch)
                                            }
                                        >
                                            Request Food
                                        </button>

                                    </div>
                                ))}

                            </div>
                        )}

                    </section>
                )}

                {showRequestForm && selectedBatch && (
                    <div className="request-modal">

                        <div className="request-modal-card">

                            <div className="request-modal-header">

                                <div>
                                    <span>FOOD REQUEST</span>

                                    <h2>
                                        Request {selectedBatch[3]}
                                    </h2>

                                    <p>
                                        Available: {selectedBatch[11]}{" "}
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

                                <div className="input-group">
                                    <label>Quantity</label>

                                    <input
                                        type="number"
                                        min="1"
                                        max={selectedBatch[11]}
                                        value={quantity}
                                        onChange={(event) =>
                                            setQuantity(event.target.value)
                                        }
                                        placeholder={`Enter quantity in ${selectedBatch[6]}`}
                                    />
                                </div>

                                <div className="input-group">
                                    <label>Required By</label>

                                    <input
                                        type="datetime-local"
                                        value={requiredBy}
                                        onChange={(event) =>
                                            setRequiredBy(event.target.value)
                                        }
                                    />
                                </div>

                                <div className="input-group">
                                    <label>Notes</label>

                                    <textarea
                                        value={notes}
                                        onChange={(event) =>
                                            setNotes(event.target.value)
                                        }
                                        placeholder="Optional request details"
                                        rows="3"
                                    />
                                </div>

                                {formError && (
                                    <div className="login-error">
                                        {formError}
                                    </div>
                                )}

                                <div className="request-modal-actions">

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

            </main>
        </div>
    );
}

export default NGODashboard;