import "./DonorDashboard.css";
import { useEffect, useState } from "react";



function DonorDashboard({ onLogout, onAddFood, donorId }) {
    const [batches, setBatches] = useState([]);
    const [donor, setDonor] = useState(null);
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);
    const [allocations, setAllocations] = useState([]);

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

            {/* SIDEBAR */}

            <aside className="donor-sidebar">

                <div className="dashboard-brand">
                    <div className="dashboard-logo">F</div>

                    <div>
                        <strong>FoodRescue</strong>
                        <span>Donor Portal</span>
                    </div>
                </div>


                <nav className="dashboard-nav">

                    <p className="nav-label">MAIN</p>

                    <button className="nav-item active">
                        <span className="nav-icon">01</span>
                        Dashboard
                    </button>

                    <button className="nav-item">
                        <span className="nav-icon">02</span>
                        Food Batches
                    </button>

                    <button className="nav-item">
                        <span className="nav-icon">03</span>
                        Allocations
                    </button>

                    <button className="nav-item">
                        <span className="nav-icon">04</span>
                        Deliveries
                    </button>


                    <p className="nav-label nav-label-spaced">
                        ACCOUNT
                    </p>

                    <button className="nav-item">
                        <span className="nav-icon">05</span>
                        Organization
                    </button>

                    <button className="nav-item">
                        <span className="nav-icon">06</span>
                        Notifications
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


                {/* MAIN GRID */}

                <section className="dashboard-grid">

                    {/* RECENT BATCHES */}

                    <div className="dashboard-card batches-card">

                        <div className="card-heading">

                            <div>
                                <span>FOOD INVENTORY</span>
                                <h2>Recent batches</h2>
                            </div>

                            <button className="outline-button">
                                View all
                            </button>

                        </div>


                        <div className="batch-table">

                            <div className="table-header">
                                <span>FOOD</span>
                                <span>QUANTITY</span>
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
                                                {expiry.toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
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


                {/* ALLOCATION SECTION */}

                <section className="dashboard-card allocation-card">

                    <div className="card-heading">

                        <div>
                            <span>REDISTRIBUTION</span>
                            <h2>Recent allocations</h2>
                        </div>

                        <button className="outline-button">
                            View all
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
                            allocations.map((allocation) => (
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