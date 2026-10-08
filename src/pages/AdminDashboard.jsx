import { useEffect, useState } from "react";
import "./AdminDashboard.css";

function AdminDashboard({ onLogout }) {
  const [organizations, setOrganizations] = useState({
    donors: [],
    ngos: [],
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost:5000/api/admin/organizations"
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || "Failed to load organizations");
      }

      setOrganizations(data);
    } catch (error) {
      console.error("Admin organizations error:", error);
      setError("Unable to load organizations.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);

  const handleAction = async (
    accountType,
    organizationId,
    action
  ) => {
    try {
      setError("");

      let endpoint = "";

      if (action === "approve") {
        endpoint = "/api/admin/approve-organization";
      } else if (action === "reject") {
        endpoint = "/api/admin/reject-organization";
      } else if (action === "blacklist") {
        endpoint = "/api/admin/blacklist-organization";
      } else if (action === "unblacklist") {
        endpoint = "/api/admin/unblacklist-organization";
      }

      const response = await fetch(
        `http://localhost:5000${endpoint}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            accountType,
            organizationId,
          }),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.error || data.message || "Action failed"
        );
      }

      await fetchOrganizations();
    } catch (error) {
      console.error("Admin action error:", error);
      setError(error.message || "Unable to complete action.");
    }
  };

  const allOrganizations = [
    ...organizations.donors.map((organization) => ({
      ...organization,
      organizationId: organization[0],
      name: organization[1],
      email: organization[2],
      phone: organization[3],
      address: organization[4],
      registrationDate: organization[5],
      status: organization[6],
      accountType: "DONOR",
    })),

    ...organizations.ngos.map((organization) => ({
      ...organization,
      organizationId: organization[0],
      name: organization[1],
      email: organization[2],
      phone: organization[3],
      address: organization[4],
      registrationDate: organization[5],
      status: organization[6],
      accountType: "NGO",
    })),
  ];

  const pendingCount = allOrganizations.filter(
    (organization) => organization.status === "PENDING"
  ).length;

  const approvedCount = allOrganizations.filter(
    (organization) => organization.status === "APPROVED"
  ).length;

  const blacklistedCount = allOrganizations.filter(
    (organization) => organization.status === "BLACKLISTED"
  ).length;

  return (
    <div className="admin-page">

      <header className="admin-header">

        <div className="site-logo">
          <div className="site-logo-mark">F</div>
          <span>FoodRescue</span>
        </div>

        <div className="admin-header-right">
          <span className="admin-label">
            ADMIN CONTROL CENTER
          </span>

          <button
            className="admin-logout"
            onClick={onLogout}
          >
            Logout
          </button>
        </div>

      </header>


      <main className="admin-content">

        <div className="admin-heading">

          <div>
            <p className="admin-eyebrow">
              SYSTEM MANAGEMENT
            </p>

            <h1>
              Admin Dashboard
            </h1>

            <p>
              Review organizations, manage platform access,
              and monitor registration activity.
            </p>
          </div>

        </div>


        <section className="admin-stats">

          <div className="admin-stat-card">
            <span>Total organizations</span>
            <strong>{allOrganizations.length}</strong>
          </div>

          <div className="admin-stat-card pending">
            <span>Pending approval</span>
            <strong>{pendingCount}</strong>
          </div>

          <div className="admin-stat-card approved">
            <span>Approved</span>
            <strong>{approvedCount}</strong>
          </div>

          <div className="admin-stat-card blacklisted">
            <span>Blacklisted</span>
            <strong>{blacklistedCount}</strong>
          </div>

        </section>


        <section className="admin-panel">

          <div className="admin-panel-heading">

            <div>
              <span>ORGANIZATION MANAGEMENT</span>
              <h2>
                Registered organizations
              </h2>
            </div>

            <button
              className="refresh-button"
              onClick={fetchOrganizations}
            >
              Refresh
            </button>

          </div>


          {error && (
            <div className="admin-error">
              {error}
            </div>
          )}


          {loading ? (
            <div className="admin-loading">
              Loading organizations...
            </div>
          ) : allOrganizations.length === 0 ? (
            <div className="admin-empty">
              No organizations registered yet.
            </div>
          ) : (
            <div className="organization-table-wrapper">

              <table className="organization-table">

                <thead>
                  <tr>
                    <th>Organization</th>
                    <th>Type</th>
                    <th>Email</th>
                    <th>Location</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>

                  {allOrganizations.map((organization) => (

                    <tr
                      key={`${organization.accountType}-${organization.organizationId}`}
                    >

                      <td>
                        <strong>
                          {organization.name}
                        </strong>

                        <span>
                          {organization.phone}
                        </span>
                      </td>

                      <td>
                        <span className="type-badge">
                          {organization.accountType}
                        </span>
                      </td>

                      <td>
                        {organization.email}
                      </td>

                      <td>
                        {organization.address}
                      </td>

                      <td>
                        <span
                          className={`status-badge ${organization.status.toLowerCase()}`}
                        >
                          {organization.status}
                        </span>
                      </td>

                      <td>

                        <div className="admin-actions">

                          {organization.status === "PENDING" && (
                            <>
                              <button
                                className="approve-button"
                                onClick={() =>
                                  handleAction(
                                    organization.accountType,
                                    organization.organizationId,
                                    "approve"
                                  )
                                }
                              >
                                Approve
                              </button>

                              <button
                                className="reject-button"
                                onClick={() =>
                                  handleAction(
                                    organization.accountType,
                                    organization.organizationId,
                                    "reject"
                                  )
                                }
                              >
                                Reject
                              </button>
                            </>
                          )}

                          {organization.status === "APPROVED" && (
                            <button
                              className="blacklist-button"
                              onClick={() =>
                                handleAction(
                                  organization.accountType,
                                  organization.organizationId,
                                  "blacklist"
                                )
                              }
                            >
                              Blacklist
                            </button>
                          )}

                          {organization.status === "BLACKLISTED" && (
                            <button
                              className="restore-button"
                              onClick={() =>
                                handleAction(
                                  organization.accountType,
                                  organization.organizationId,
                                  "unblacklist"
                                )
                              }
                            >
                              Restore
                            </button>
                          )}

                          {organization.status === "REJECTED" && (
                            <span className="no-action">
                              No action
                            </span>
                          )}

                        </div>

                      </td>

                    </tr>

                  ))}

                </tbody>

              </table>

            </div>
          )}

        </section>

      </main>

    </div>
  );
}

export default AdminDashboard;