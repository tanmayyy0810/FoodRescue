import "./DonorDashboard.css";
import { useEffect, useState } from "react";



function DonorDashboard({ onLogout, onAddFood }) {
    const [batches, setBatches] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch("http://localhost:5000/api/food-batches")
            .then((response) => response.json())
            .then((data) => {
                setBatches(data);
                setLoading(false);
            })
            .catch((error) => {
                console.error("Failed to fetch food batches:", error);
                setLoading(false);
            });
    }, []);
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
                            <strong>Rahul Sharma</strong>
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

                        <h1>Good evening, Rahul.</h1>

                        <p>
                            Here's what's happening with your food donations.
                        </p>
                    </div>

                    <div className="header-date">
                        <span>Today</span>
                        <strong>07 October 2026</strong>
                    </div>

                </header>


                {/* STATISTICS */}

                <section className="dashboard-stats">

                    <div className="dashboard-stat-card">

                        <span>Total donated</span>

                        <strong>1,240</strong>

                        <small>
                            meals donated
                        </small>

                    </div>


                    <div className="dashboard-stat-card">

                        <span>Active batches</span>

                        <strong>8</strong>

                        <small>
                            currently available
                        </small>

                    </div>


                    <div className="dashboard-stat-card">

                        <span>Allocated</span>

                        <strong>1,080</strong>

                        <small>
                            meals redistributed
                        </small>

                    </div>


                    <div className="dashboard-stat-card warning">

                        <span>Expiring soon</span>

                        <strong>3</strong>

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


                        <div className="allocation-row">

                            <span className="allocation-food">
                                Vegetable Rice
                            </span>

                            <span>Hope Foundation</span>

                            <span>60 meals</span>

                            <span>07 Oct 2026</span>

                            <span className="allocation-status">
                                Confirmed
                            </span>

                        </div>


                        <div className="allocation-row">

                            <span className="allocation-food">
                                Chapati
                            </span>

                            <span>Vellore Community Kitchen</span>

                            <span>80 meals</span>

                            <span>07 Oct 2026</span>

                            <span className="allocation-status">
                                Delivered
                            </span>

                        </div>


                        <div className="allocation-row">

                            <span className="allocation-food">
                                Bread Loaf
                            </span>

                            <span>Care Shelter</span>

                            <span>20 units</span>

                            <span>06 Oct 2026</span>

                            <span className="allocation-status">
                                Delivered
                            </span>

                        </div>

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