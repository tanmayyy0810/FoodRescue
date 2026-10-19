import "./DonorDashboard.css";
import { useEffect, useState } from "react";



function DonorDashboard({ onLogout, onAddFood, donorId }) {
    const [batches, setBatches] = useState([]);
    const [donor, setDonor] = useState(null);
    const [accountDetails, setAccountDetails] = useState(null);
const [accountLoading, setAccountLoading] = useState(false);
const [accountError, setAccountError] = useState("");
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [activeSection, setActiveSection] = useState("dashboard");
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const navigateToSection = (section) => {
    setActiveSection(section);
    setMobileMenuOpen(false);
};
    const [allocations, setAllocations] = useState([]);
    const [showAllRecentAllocations, setShowAllRecentAllocations] = useState(false);
    const [deliveries, setDeliveries] = useState([]);
const [deliveriesLoading, setDeliveriesLoading] = useState(true);
const [deliveriesError, setDeliveriesError] = useState("");
    const [matchingRequests, setMatchingRequests] = useState([]);
    const [showAllMatchingRequests, setShowAllMatchingRequests] = useState(false);
    const [matchingLoading, setMatchingLoading] = useState(true);
    const [matchingError, setMatchingError] = useState("");
    const [acceptQuantities, setAcceptQuantities] = useState({});
    const [acceptingRequest, setAcceptingRequest] = useState(null);
    const [acceptMessage, setAcceptMessage] = useState("");
    const [acceptError, setAcceptError] = useState("");
    const [acceptedRequests, setAcceptedRequests] = useState([]);
    const [showAllAcceptedRequests, setShowAllAcceptedRequests] = useState(false);
    const [acceptedLoading, setAcceptedLoading] = useState(true);
    const [acceptedError, setAcceptedError] = useState("");

    useEffect(() => {
        if (!donorId) {
            return;
        }

        const loadDashboard = async () => {
            try {
                const [
                    batchResponse,
                    dashboardResponse,
                    allocationsResponse
                ] = await Promise.all([
                    fetch(`http://localhost:5000/api/food-batches?donorId=${donorId}`),
                    fetch(`http://localhost:5000/api/donors/${donorId}/dashboard`),
                    fetch(`http://localhost:5000/api/donors/${donorId}/allocations`)
                ]);

                const batchData = await batchResponse.json();
                const dashboardData = await dashboardResponse.json();
                const allocationsData = await allocationsResponse.json();

                if (!batchResponse.ok) {
                    throw new Error(
                        batchData.message || "Failed to fetch food batches"
                    );
                }

                if (!dashboardResponse.ok) {
                    throw new Error(
                        dashboardData.message || "Failed to fetch donor dashboard"
                    );
                }

                if (!allocationsResponse.ok) {
                    throw new Error(
                        allocationsData.message || "Failed to fetch allocations"
                    );
                }

                setBatches(batchData);
                setDonor(dashboardData.donor);
                setStats(dashboardData.stats);
                setAllocations(allocationsData);

            } catch (error) {
                console.error("Failed to fetch donor dashboard:", error);
            } finally {
                setLoading(false);
            }
        };

        loadDashboard();
    }, [donorId]);
    useEffect(() => {
        if (!donorId) {
            setMatchingLoading(false);
            return;
        }

        const loadMatchingRequests = async () => {
            try {
                setMatchingLoading(true);
                setMatchingError("");

                const response = await fetch(
                    `http://localhost:5000/api/donors/${donorId}/matching-requests`
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || "Failed to fetch matching NGO requests"
                    );
                }

                setMatchingRequests(data);
            } catch (error) {
                console.error("Matching requests error:", error);
                setMatchingError(error.message);
            } finally {
                setMatchingLoading(false);
            }
        };

        loadMatchingRequests();
    }, [donorId]);
    useEffect(() => {
        if (!donorId) {
            setAcceptedLoading(false);
            return;
        }

        const loadAcceptedRequests = async () => {
            try {
                setAcceptedLoading(true);
                setAcceptedError("");

                const response = await fetch(
                    `http://localhost:5000/api/donors/${donorId}/accepted-requests`
                );

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(
                        data.message || "Failed to fetch accepted requests"
                    );
                }

                setAcceptedRequests(data);
            } catch (error) {
                console.error("Accepted requests error:", error);
                setAcceptedError(error.message);
            } finally {
                setAcceptedLoading(false);
            }
        };

        loadAcceptedRequests();
    }, [donorId]);
    // Load deliveries for the logged-in donor
const loadDeliveries = async () => {
    if (!donorId) {
        setDeliveries([]);
        setDeliveriesLoading(false);
        return;
    }

    try {
        setDeliveriesLoading(true);
        setDeliveriesError("");

        const response = await fetch(
            `http://localhost:5000/api/donors/${donorId}/deliveries`
        );

        const data = await response.json();

        if (!response.ok) {
            throw new Error(
                data.message || "Failed to fetch donor deliveries."
            );
        }

        setDeliveries(data);
    } catch (error) {
        console.error("Donor delivery loading error:", error);
        setDeliveriesError(error.message);
    } finally {
        setDeliveriesLoading(false);
    }
};
useEffect(() => {
    loadDeliveries();
}, [donorId]);
useEffect(() => {
    if (!donorId || activeSection !== "account") return;

    const loadAccountDetails = async () => {
        setAccountLoading(true);
        setAccountError("");

        try {
            const savedSession = JSON.parse(
    localStorage.getItem("foodrescue_session") || "null"
);

const token = savedSession?.user?.token;

            const response = await fetch(
                `http://localhost:5000/api/donors/${donorId}/account`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.message || "Failed to load account details"
                );
            }

            setAccountDetails(data);
        } catch (error) {
            setAccountError(error.message);
        } finally {
            setAccountLoading(false);
        }
    };

    loadAccountDetails();
}, [donorId, activeSection]);
    const handleAcceptRequest = async (request) => {
        const key = `${request.requestItemId}-${request.batchId}`;
        const quantity = Number(acceptQuantities[key]);

        setAcceptMessage("");
        setAcceptError("");

        const maxQuantity = Math.min(
            request.remainingRequestQuantity,
            request.batchAvailableQuantity
        );

        if (!Number.isFinite(quantity) || quantity <= 0 || quantity > maxQuantity) {
            setAcceptError(
                `Enter a quantity between 0 and ${maxQuantity} for this request.`
            );
            return;
        }

        try {
            setAcceptingRequest(key);

            const response = await fetch(
                "http://localhost:5000/api/donor-acceptances",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        donorId,
                        requestItemId: request.requestItemId,
                        batchId: request.batchId,
                        quantity
                    })
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || "Failed to accept request");
            }

            setAcceptMessage(
                `Successfully accepted ${quantity} ${request.unit.toLowerCase()} for ${request.ngoName}.`
            );

            setAcceptQuantities((previous) => ({
                ...previous,
                [key]: ""
            }));

            const refreshResponse = await fetch(
                `http://localhost:5000/api/donors/${donorId}/matching-requests`,
                { cache: "no-store" }
            );

            if (!refreshResponse.ok) {
                throw new Error("Acceptance succeeded, but refreshing requests failed.");
            }

            const refreshedRequests = await refreshResponse.json();
            setMatchingRequests(refreshedRequests);
            const acceptedResponse = await fetch(
    `http://localhost:5000/api/donors/${donorId}/accepted-requests`,
    { cache: "no-store" }
);

if (!acceptedResponse.ok) {
    throw new Error(
        "Acceptance succeeded, but refreshing accepted requests failed."
    );
}

const updatedAcceptedRequests = await acceptedResponse.json();
setAcceptedRequests(updatedAcceptedRequests);

        } catch (error) {
            console.error("Accept request error:", error);
            setAcceptError(error.message);
        } finally {
            setAcceptingRequest(null);
        }
    };

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
    return (
        <div className="donor-dashboard">
            <div className="donor-mobile-header">
    <button
        type="button"
        className="donor-mobile-menu-button"
        onClick={() => setMobileMenuOpen((previous) => !previous)}
        aria-label="Open menu"
        aria-expanded={mobileMenuOpen}
    >
        ☰
    </button>

    <strong>FoodRescue</strong>
</div>
{mobileMenuOpen && (
    <button
        type="button"
        className="donor-mobile-backdrop"
        aria-label="Close navigation menu"
        onClick={() => setMobileMenuOpen(false)}
    />
)}

            {/* SIDEBAR */}
<aside
    className={`donor-sidebar ${
        mobileMenuOpen ? "mobile-open" : ""
    }`}
>
    <button
    type="button"
    className="donor-sidebar-close"
    onClick={() => setMobileMenuOpen(false)}
    aria-label="Close menu"
>
    ✕
</button>
            
                

                <div className="dashboard-brand">
                    <div className="dashboard-logo">F</div>

                    <div>
                        <strong>FoodRescue</strong>
                        <span>Donor Portal</span>
                    </div>
                </div>


                <nav className="dashboard-nav">

                    <p className="nav-label">MAIN</p>

                    <button
    className={`nav-item ${
        activeSection === "dashboard" ? "active" : ""
    }`}
    onClick={() => navigateToSection("dashboard")}
>
    <span className="nav-icon">01</span>
    Dashboard
</button>

                    <button
    className={`nav-item ${
        activeSection === "batches" ? "active" : ""
    }`}
    onClick={() => navigateToSection("batches")}
>
    <span className="nav-icon">02</span>
    Food Batches
</button>

                    <button
    className={`nav-item ${
        activeSection === "allocations" ? "active" : ""
    }`}
    onClick={() => navigateToSection("allocations")}
>
    <span className="nav-icon">03</span>
    Allocations
</button>

                    <button
    className={`nav-item ${
        activeSection === "deliveries" ? "active" : ""
    }`}
    onClick={() => navigateToSection("deliveries")}
>
    <span className="nav-icon">04</span>
    Deliveries
</button>


                    <p className="nav-label nav-label-spaced">
                        ACCOUNT
                    </p>

                    <button
    type="button"
    className={`nav-item ${
        activeSection === "account" ? "active" : ""
    }`}
    onClick={() => navigateToSection("account")}
>
    <span className="nav-icon">05</span>
    Account Details
</button>

                    

                </nav>


                <div className="sidebar-bottom">

                    <div className="user-mini">

                        <div className="user-avatar">
                            RS
                        </div>

                        <div>
                            <strong>{donor?.donorName || "Donor"}</strong>
                            <span>Donor</span>
                        </div>

                    </div>

                    <button
                        className="logout-button"
                        onClick={onLogout}
                    >
                        Sign out
                    </button>

                </div>

            </aside>


            {/* MAIN CONTENT */}

            <main className="donor-main">

                <header className="dashboard-header">

                    <div>
                        <p className="dashboard-eyebrow">
                            DONOR PORTAL
                        </p>

                        <h1>{greeting}, {donor?.donorName || "Donor"}.</h1>

                        <p>
                            Here's what's happening with your food donations.
                        </p>
                    </div>

                    <div className="header-date">
                        <span>Today</span>
                        <strong>{formattedDate}</strong>
                    </div>

                </header>
                {/* {activeSection === "dashboard" && (
    <> */}


                {/* STATISTICS */}

                <section className="dashboard-stats">

                    <div className="dashboard-stat-card">

                        <span>Total donated</span>

                        <strong>{stats?.totalBatches ?? 0}</strong>

                        <small>
                            food batches registered
                        </small>

                    </div>


                    <div className="dashboard-stat-card">

                        <span>Active batches</span>

                        <strong>{stats?.activeBatches ?? 0}</strong>

                        <small>
                            currently available
                        </small>

                    </div>


                    <div className="dashboard-stat-card">

                        <span>Allocated</span>

                        <strong>{stats?.allocatedQuantity ?? 0}</strong>

                        <small>
                            quantity redistributed
                        </small>

                    </div>


                    <div className="dashboard-stat-card warning">

                        <span>Expiring soon</span>

                        <strong>{stats?.expiringSoon ?? 0}</strong>

                        <small>
                            batches need attention
                        </small>

                    </div>

                </section>
                {activeSection === "dashboard" && (
    <>


                {/* MAIN GRID */}

                <section className="dashboard-grid">

                    {/* RECENT BATCHES */}

                    <div className="dashboard-card batches-card">

                        <div className="card-heading">

                            <div>
                                <span>FOOD INVENTORY</span>
                                <h2>Recent batches</h2>
                            </div>

                            <button
    type="button"
    className="outline-button"
    onClick={() => setShowAllRecentAllocations((previous) => !previous)}
>
    {showAllRecentAllocations ? "Show less" : "View all"}
</button>

                        </div>


                        <div className="batch-table">

                            <div className="table-header">
                                <span>FOOD</span>
                                <span>QUANTITY</span>
                                <span>REMAINING</span>
                                <span>EXPIRY</span>
                                <span>STATUS</span>
                            </div>

                            {loading ? (
                                <div className="batch-row">
                                    <span>Loading food batches...</span>
                                </div>
                            ) : batches.length === 0 ? (
                                <div className="batch-row">
                                    <span>No available food batches.</span>
                                </div>
                            ) : (
                                batches.map((batch) => {
                                    const foodCode = batch[3]
                                        .split(" ")
                                        .map((word) => word[0])
                                        .join("")
                                        .slice(0, 2)
                                        .toUpperCase();

                                    const expiry = new Date(batch[8]);

                                    return (
                                        <div className="batch-row" key={batch[0]}>

                                            <div className="food-name">
                                                <div className="food-code">{foodCode}</div>

                                                <div>
                                                    <strong>{batch[3]}</strong>
                                                    <span>Batch #{batch[0]}</span>
                                                </div>
                                            </div>

                                            <span>
                                                {batch[5]} {batch[6].toLowerCase()}
                                            </span>

<span>
    {batch[11]} {batch[6].toLowerCase()}
</span>

                                            <span>
                                                {expiry.toLocaleTimeString([], {
                                                    day: "2-digit",
        month: "short",
    
        hour: "2-digit",
        minute: "2-digit",
        hour12: true
                                                })}
                                            </span>

                                            <span className="batch-status available">
                                                {batch[10]}
                                            </span>

                                        </div>
                                    );
                                })
                            )}

                        </div>

                    </div>


                    {/* ADD FOOD */}

                    <div className="dashboard-card add-food-card">

                        <div className="card-heading">

                            <div>
                                <span>DONATION</span>
                                <h2>Add surplus food</h2>
                            </div>

                        </div>

                        <p>
                            Register a new food batch with quantity,
                            preparation time and expiry information.
                        </p>

                        <button
                            type="button"
                            className="primary-dashboard-button"
                            onClick={onAddFood}
                        >
                            + Add food batch
                        </button>

                        <div className="quick-info">

                            <div>
                                <strong>Food batch</strong>
                                <span>Tracked individually</span>
                            </div>

                            <div>
                                <strong>Expiry</strong>
                                <span>Automatically monitored</span>
                            </div>

                            <div>
                                <strong>Allocation</strong>
                                <span>Recorded in system</span>
                            </div>

                        </div>

                    </div>

                </section>
                {/* MATCHING NGO REQUESTS */}
                <section className="dashboard-card allocation-card">
                    <div className="card-heading">
    <div>
        <span>FOOD REDISTRIBUTION</span>
        <h2>Matching NGO requests</h2>
    </div>

    {matchingRequests.length > 5 && (
        <button
            type="button"
            className="outline-button"
            onClick={() =>
                setShowAllMatchingRequests((previous) => !previous)
            }
        >
            {showAllMatchingRequests ? "Show less" : "View all"}
        </button>
    )}
</div>
                    {acceptMessage && (
                        <p role="status" className="accept-success-message">
                            {acceptMessage}
                        </p>
                    )}

                    {acceptError && (
                        <p role="alert" className="accept-error-message">
                            {acceptError}
                        </p>
                    )}

                    {matchingLoading ? (
                        <p>Loading matching NGO requests...</p>
                    ) : matchingError ? (
                        <p>{matchingError}</p>
                    ) : matchingRequests.length === 0 ? (
                        <p className="matching-empty-message">
                            No matching NGO requests available right now.
                        </p>
                    ) : (
                        <div className="allocation-table matching-requests-table">
                            <div className="allocation-header">
                                <span>FOOD</span>
                                <span>NGO</span>
                                <span>REQUESTED</span>
                                <span>BATCH</span>
                                <span>AVAILABLE</span>
                                <span>ACTION</span>
                            </div>

                            {matchingRequests
    .slice(0, showAllMatchingRequests ? undefined : 5)
    .map((request) => (
                                <div
                                    className="allocation-row"
                                    key={`${request.requestItemId}-${request.batchId}`}
                                >
                                    <span className="allocation-food">
                                        {request.itemName}
                                    </span>

                                    <span>{request.ngoName}</span>

                                    <span>
                                        {request.remainingRequestQuantity}{" "}
                                        {request.unit.toLowerCase()}
                                    </span>

                                    <span>#{request.batchId}</span>

                                    <span>
                                        {request.batchAvailableQuantity}{" "}
                                        {request.unit.toLowerCase()}
                                    </span>
                                    <div className="accept-request-controls">
                                        <input
                                            type="number"
                                            min="0.01"
                                            step="0.01"
                                            max={Math.min(
                                                request.remainingRequestQuantity,
                                                request.batchAvailableQuantity
                                            )}
                                            placeholder="Qty"
                                            value={
                                                acceptQuantities[
                                                `${request.requestItemId}-${request.batchId}`
                                                ] ?? ""
                                            }
                                            onChange={(event) => {
                                                const key = `${request.requestItemId}-${request.batchId}`;

                                                setAcceptQuantities((previous) => ({
                                                    ...previous,
                                                    [key]: event.target.value
                                                }));
                                            }}
                                            className="accept-quantity-input"
                                        />

                                        <button
                                            type="button"
                                            className="primary-dashboard-button"
                                            disabled={
                                                acceptingRequest ===
                                                `${request.requestItemId}-${request.batchId}`
                                            }
                                            onClick={() => handleAcceptRequest(request)}
                                        >
                                            {acceptingRequest ===
                                                `${request.requestItemId}-${request.batchId}`
                                                ? "Accepting..."
                                                : "Accept"}
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </section>
                {/* ACCEPTED NGO REQUESTS */}
                <section className="dashboard-card allocation-card">
                    <div className="card-heading">
    <div>
        <span>FOOD REDISTRIBUTION</span>
        <h2>Accepted requests</h2>
    </div>

    {acceptedRequests.length > 5 && (
        <button
            type="button"
            className="outline-button"
            onClick={() =>
                setShowAllAcceptedRequests((previous) => !previous)
            }
        >
            {showAllAcceptedRequests ? "Show less" : "View all"}
        </button>
    )}
</div>
                    {acceptedLoading ? (
                        <p className="matching-empty-message">
                            Loading accepted requests...
                        </p>
                    ) : acceptedError ? (
                        <p className="accept-error-message">
                            {acceptedError}
                        </p>
                    ) : acceptedRequests.length === 0 ? (
                        <p className="matching-empty-message">
                            You haven't accepted any NGO requests yet.
                        </p>
                    ) : (
                        <div className="allocation-table">
                            <div className="allocation-header">
                                <span>FOOD</span>
                                <span>NGO</span>
                                <span>QUANTITY</span>
                                <span>BATCH</span>
                                <span>STATUS</span>
                            </div>

                            {[...acceptedRequests]
    .sort((a, b) => b.acceptanceId - a.acceptanceId)
    .slice(0, showAllAcceptedRequests ? undefined : 5)
    .map((request) => (
                                <div
                                    className="allocation-row"
                                    key={request.acceptanceId}
                                >
                                    <span className="allocation-food">
                                        {request.itemName}
                                    </span>

                                    <span>{request.ngoName}</span>

                                    <span>
                                        {request.acceptedQuantity}{" "}
                                        {request.unit.toLowerCase()}
                                    </span>

                                    <span>#{request.batchId}</span>

                                    <span className="allocation-status">
                                        {request.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </section>


                {/* ALLOCATION SECTION */}

                <section className="dashboard-card allocation-card">

                    <div className="card-heading">

                        <div>
                            <span>REDISTRIBUTION</span>
                            <h2>Recent allocations</h2>
                        </div>

                        <button
    type="button"
    className="outline-button"
    onClick={() =>
        setShowAllRecentAllocations((previous) => !previous)
    }
>
    {showAllRecentAllocations ? "Show less" : "View all"}
</button>

                    </div>


                    <div className="allocation-table">

                        <div className="allocation-header">
                            <span>FOOD</span>
                            <span>RECIPIENT</span>
                            <span>QUANTITY</span>
                            <span>DATE</span>
                            <span>STATUS</span>
                        </div>


                        {allocations.length === 0 ? (
                            <div className="allocation-row">
                                <span>No allocations recorded yet.</span>
                            </div>
                        ) : (
                            [...allocations]
    .sort((a, b) =>
        new Date(b.allocationDate) - new Date(a.allocationDate)
    )
    .slice(0, showAllRecentAllocations ? undefined : 5)
    .map((allocation) => (
                                <div
                                    className="allocation-row"
                                    key={allocation.allocationId}
                                >

                                    <span className="allocation-food">
                                        {allocation.itemName}
                                    </span>

                                    <span>
                                        {allocation.ngoName}
                                    </span>

                                    <span>
                                        {allocation.allocatedQuantity}{" "}
                                        {allocation.unit.toLowerCase()}
                                    </span>

                                    <span>
                                        {new Date(
                                            allocation.allocationDate
                                        ).toLocaleDateString("en-GB", {
                                            day: "2-digit",
                                            month: "short",
                                            year: "numeric"
                                        })}
                                    </span>

                                    <span className="allocation-status">
                                        {allocation.status}
                                    </span>

                                </div>
                            ))
                        )}

                    </div>

                </section>
                    </>
)}
{/* ALL FOOD BATCHES VIEW */}
{activeSection === "batches" && (
    <section className="dashboard-card batches-card">
        <div className="card-heading">
            <div>
                <span>FOOD INVENTORY</span>
                <h2>Food Batches</h2>
            </div>
        </div>

        <div className="batch-table">
            <div className="table-header">
                <span>FOOD</span>
                <span>QUANTITY</span>
                <span>EXPIRY</span>
                <span>STATUS</span>
            </div>

            {loading ? (
                <p className="matching-empty-message">
                    Loading food batches...
                </p>
            ) : batches.length === 0 ? (
                <p className="matching-empty-message">
                    No available food batches.
                </p>
            ) : (
                batches.map((batch) => (
                    <div className="batch-row" key={batch[0]}>
                        <div className="food-name">
                            <div className="food-code">
                                {batch[3]
                                    .split(" ")
                                    .map((word) => word[0])
                                    .join("")
                                    .slice(0, 2)
                                    .toUpperCase()}
                            </div>
                            <div>
                                <strong>{batch[3]}</strong>
                                <span>Batch #{batch[0]}</span>
                            </div>
                        </div>

                        <span>
                            {batch[5]} {batch[6].toLowerCase()}
                        </span>

                        <span>
                            {new Date(batch[8]).toLocaleString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                hour: "2-digit",
                                minute: "2-digit"
                            })}
                        </span>

                        <span className="batch-status available">
                            {batch[10]}
                        </span>
                    </div>
                ))
            )}
        </div>
    </section>
)}
{/* ALL ALLOCATIONS VIEW */}
{activeSection === "allocations" && (
    <section className="dashboard-card allocation-card">
        <div className="card-heading">
            <div>
                <span>FOOD REDISTRIBUTION</span>
                <h2>All Allocations</h2>
            </div>
        </div>

        <div className="allocation-table">
            <div className="allocation-header">
                <span>FOOD</span>
                <span>RECIPIENT</span>
                <span>QUANTITY</span>
                <span>DATE</span>
                <span>STATUS</span>
            </div>

            {loading ? (
                <p className="matching-empty-message">
                    Loading allocations...
                </p>
            ) : allocations.length === 0 ? (
                <p className="matching-empty-message">
                    No allocations recorded yet.
                </p>
            ) : (
                allocations.map((allocation) => (
                    <div
                        className="allocation-row"
                        key={allocation.allocationId}
                    >
                        <span className="allocation-food">
                            {allocation.itemName}
                        </span>

                        <span>{allocation.ngoName}</span>

                        <span>
                            {allocation.allocatedQuantity}{" "}
                            {allocation.unit.toLowerCase()}
                        </span>

                        <span>
                            {new Date(
                                allocation.allocationDate
                            ).toLocaleDateString("en-GB", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric"
                            })}
                        </span>

                        <span className="allocation-status">
                            {allocation.status}
                        </span>
                    </div>
                ))
            )}
        </div>
    </section>
)}
{/* DONOR ACCOUNT DETAILS VIEW */}
{activeSection === "account" && (
    <section className="dashboard-card allocation-card">
        <div className="card-heading">
            <div>
                <span>ORGANIZATION PROFILE</span>
                <h2>Account Details</h2>
            </div>
        </div>

        {accountLoading ? (
            <p className="matching-empty-message">
                Loading account details...
            </p>
        ) : accountError ? (
            <p className="accept-error-message" role="alert">
                {accountError}
            </p>
        ) : !accountDetails ? (
            <p className="matching-empty-message">
                Account details are not available.
            </p>
        ) : (
            <div className="donor-delivery-details" style={{ padding: "24px" }}>
                <div>
                    <span>ORGANIZATION NAME</span>
                    <strong>{accountDetails.organizationName || "—"}</strong>
                </div>

                <div>
                    <span>USERNAME</span>
                    <strong>{accountDetails.username || "—"}</strong>
                </div>

                <div>
                    <span>ACCOUNT ROLE</span>
                    <strong>{accountDetails.role || "—"}</strong>
                </div>

                <div>
                    <span>ACCOUNT STATUS</span>
                    <strong>{accountDetails.accountStatus || "—"}</strong>
                </div>

                <div>
                    <span>EMAIL</span>
                    <strong>{accountDetails.email || "—"}</strong>
                </div>

                <div>
                    <span>PHONE</span>
                    <strong>{accountDetails.phone || "—"}</strong>
                </div>

                <div>
                    <span>ADDRESS</span>
                    <strong>{accountDetails.address || "—"}</strong>
                </div>

                <div>
                    <span>REGISTRATION DATE</span>
                    <strong>
                        {accountDetails.registrationDate
                            ? new Date(
                                  accountDetails.registrationDate
                              ).toLocaleDateString("en-IN", {
                                  day: "2-digit",
                                  month: "long",
                                  year: "numeric"
                              })
                            : "—"}
                    </strong>
                </div>

                <div>
                    <span>APPROVAL STATUS</span>
                    <strong>{accountDetails.approvalStatus || "—"}</strong>
                </div>
            </div>
        )}
    </section>
)}
{/* DONOR DELIVERIES VIEW */}
{activeSection === "deliveries" && (
    <section className="dashboard-card allocation-card">
        <div className="card-heading">
            <div>
                <span>FOOD DISTRIBUTION</span>
                <h2>My Deliveries</h2>
            </div>

            <button
                type="button"
                className="outline-button"
                onClick={loadDeliveries}
                disabled={deliveriesLoading}
            >
                {deliveriesLoading ? "Refreshing..." : "Refresh"}
            </button>
        </div>

        {deliveriesLoading ? (
            <p className="matching-empty-message">
                Loading deliveries...
            </p>
        ) : deliveriesError ? (
            <p className="accept-error-message" role="alert">
                {deliveriesError}
            </p>
        ) : deliveries.length === 0 ? (
            <p className="matching-empty-message">
                No deliveries assigned yet. Deliveries will appear here
                when Admin arranges delivery of your donated food.
            </p>
        ) : (
            <div className="donor-deliveries-list">
                {deliveries.map((delivery) => (
                    <div
                        className="donor-delivery-card"
                        key={delivery.deliveryId}
                    >
                        <div className="donor-delivery-card-header">
                            <div>
                                <strong>{delivery.itemName}</strong>
                                <span>
                                    Delivery #{delivery.deliveryId}
                                    {" · "}
                                    Allocation #{delivery.allocationId}
                                </span>
                            </div>

                            <span
                                className={`donor-delivery-status ${
                                    delivery.status === "DELIVERED"
                                        ? "completed"
                                        : "active"
                                }`}
                            >
                                {delivery.status.replaceAll("_", " ")}
                            </span>
                        </div>

                        <div className="donor-delivery-details">
                            <div>
                                <span>QUANTITY</span>
                                <strong>
                                    {delivery.quantity} {delivery.unit}
                                </strong>
                            </div>

                            <div>
                                <span>RECIPIENT NGO</span>
                                <strong>{delivery.ngoName}</strong>
                            </div>

                            <div>
                                <span>DELIVERY PERSON</span>
                                <strong>
                                    {delivery.deliveryPerson || "Not assigned"}
                                </strong>
                            </div>

                            <div>
                                <span>CONTACT</span>
                                <strong>
                                    {delivery.deliveryPhone || "Not available"}
                                </strong>
                            </div>

                            <div>
                                <span>SCHEDULED DELIVERY</span>
                                <strong>
                                    {delivery.deliveryDate
                                        ? new Date(
                                              delivery.deliveryDate
                                          ).toLocaleString("en-IN")
                                        : "Not scheduled"}
                                </strong>
                            </div>

                            <div>
                                <span>DELIVERY STATUS</span>
                                <strong>
                                    {delivery.status.replaceAll("_", " ")}
                                </strong>
                            </div>
                        </div>

                        {delivery.status === "DELIVERED" && (
    <p className="donor-delivery-completed">
        {delivery.deliveredAt
            ? `Delivered on ${new Date(
                  delivery.deliveredAt
              ).toLocaleString("en-IN")}`
            : "Delivery completed successfully"}
    </p>
)}
                    </div>
                ))}
            </div>
        )}
    </section>
)}


                {/* FOOTER */}

                <footer className="dashboard-footer">
                    <span>FoodRescue Management System</span>
                    <span>Donor Portal</span>
                </footer>

            </main>

        </div>
    );
}

export default DonorDashboard;