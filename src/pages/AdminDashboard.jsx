import { useEffect, useState } from "react";
import "./AdminDashboard.css";

function AdminDashboard({ onLogout, user }) {
  const [organizations, setOrganizations] = useState({
    donors: [],
    ngos: [],
  });

  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [organizationSearch, setOrganizationSearch] = useState("");
  const [showAllOrganizations, setShowAllOrganizations] = useState(false);
  const [unassignedSearch, setUnassignedSearch] = useState("");
  const [showAllUnassigned, setShowAllUnassigned] = useState(false);
  const [pendingAllocations, setPendingAllocations] = useState([]);
  const [allocationsLoading, setAllocationsLoading] = useState(true);
  const [allocationsError, setAllocationsError] = useState("");
  const [allocationQuantities, setAllocationQuantities] = useState({});
  const [allocatingId, setAllocatingId] = useState(null);
  const [allocationSuccess, setAllocationSuccess] = useState("");
  const [allocationActionError, setAllocationActionError] = useState("");
  const [allocationSearch, setAllocationSearch] = useState("");
const [showAllAllocations, setShowAllAllocations] = useState(false);
  // Delivery management
  const [deliveries, setDeliveries] = useState([]);
  const [deliverySearch, setDeliverySearch] = useState("");
  const [showAllDeliveries, setShowAllDeliveries] = useState(false);
  const [deliveriesLoading, setDeliveriesLoading] = useState(true);
  const [deliveriesError, setDeliveriesError] = useState("");
  const [unassignedAllocations, setUnassignedAllocations] = useState([]);
  const [unassignedLoading, setUnassignedLoading] = useState(true);
  const [unassignedError, setUnassignedError] = useState("");
  const [selectedDeliveryAllocation, setSelectedDeliveryAllocation] = useState(null);
  const [assigningDelivery, setAssigningDelivery] = useState(false);
  const [deliveryAssignmentSuccess, setDeliveryAssignmentSuccess] = useState("");
  const [deliveryAssignmentError, setDeliveryAssignmentError] = useState("");
  const [updatingDeliveryId, setUpdatingDeliveryId] = useState(null);
  const [deliveryStatusSuccess, setDeliveryStatusSuccess] = useState("");
  const [deliveryStatusError, setDeliveryStatusError] = useState("");
  const [deliveryForm, setDeliveryForm] = useState({
    deliveryDate: "",
    deliveryPerson: "",
    deliveryPhone: "",
    notes: ""
  });


  const fetchOrganizations = async () => {
    try {
      setLoading(true);
      setError("");

      const response = await fetch(
        "http://localhost:5000/api/admin/organizations",
        {
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
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
  const fetchDeliveries = async () => {
    try {
      setDeliveriesLoading(true);
      setDeliveriesError("");

      const response = await fetch(
        "http://localhost:5000/api/admin/deliveries",
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load deliveries"
        );
      }

      setDeliveries(data);
    } catch (error) {
      console.error("Admin deliveries error:", error);
      setDeliveriesError(error.message);
    } finally {
      setDeliveriesLoading(false);
    }
  };
  const fetchUnassignedAllocations = async () => {
    try {
      setUnassignedLoading(true);
      setUnassignedError("");

      const response = await fetch(
        "http://localhost:5000/api/admin/unassigned-deliveries",
        {
          cache: "no-store",
          headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to load unassigned allocations"
        );
      }

      setUnassignedAllocations(data);
    } catch (error) {
      console.error("Unassigned allocations error:", error);
      setUnassignedError(error.message);
    } finally {
      setUnassignedLoading(false);
    }
  };
  const handleAssignDelivery = async () => {
    if (!selectedDeliveryAllocation || assigningDelivery) {
      return;
    }

    setDeliveryAssignmentSuccess("");
    setDeliveryAssignmentError("");

    const { deliveryDate, deliveryPerson, deliveryPhone, notes } = deliveryForm;

    if (!deliveryDate || !deliveryPerson.trim() || !deliveryPhone.trim()) {
      setDeliveryAssignmentError(
        "Delivery date, delivery person and phone number are required."
      );
      return;
    }

    if (!/^[0-9]{10}$/.test(deliveryPhone.trim())) {
      setDeliveryAssignmentError("Enter a valid 10-digit phone number.");
      return;
    }

    const pickupLocation = selectedDeliveryAllocation.pickupLocation?.trim();
    const dropLocation = selectedDeliveryAllocation.dropLocation?.trim();

    if (!pickupLocation || !dropLocation) {
      setDeliveryAssignmentError(
        "Pickup and drop locations are required."
      );
      return;
    }

    try {
      setAssigningDelivery(true);

      const response = await fetch(
        "http://localhost:5000/api/admin/deliveries",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`
          },
          body: JSON.stringify({
            allocationId: selectedDeliveryAllocation.allocationId,
            deliveryDate: deliveryDate.replace("T", " "),
            pickupLocation,
            dropLocation,
            deliveryPerson: deliveryPerson.trim(),
            deliveryPhone: deliveryPhone.trim(),
            notes: notes.trim()
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to assign delivery."
        );
      }

      setDeliveryAssignmentSuccess(
        `Delivery #${data.deliveryId} assigned successfully.`
      );

      setSelectedDeliveryAllocation(null);
      setDeliveryForm({
        deliveryDate: "",
        deliveryPerson: "",
        deliveryPhone: "",
        notes: ""
      });

      await Promise.all([
        fetchDeliveries(),
        fetchUnassignedAllocations()
      ]);
    } catch (error) {
      console.error("Delivery assignment error:", error);
      setDeliveryAssignmentError(error.message);
    } finally {
      setAssigningDelivery(false);
    }
  };
  const getNextDeliveryStatus = (status) => {
    switch (status) {
      case "ASSIGNED":
        return "PICKED_UP";

      case "PICKED_UP":
        return "IN_TRANSIT";

      case "IN_TRANSIT":
        return "DELIVERED";

      default:
        return null;
    }
  };
  const handleUpdateDeliveryStatus = async (delivery) => {
    const nextStatus = getNextDeliveryStatus(delivery.status);

    if (!nextStatus || updatingDeliveryId !== null) {
      return;
    }

    setDeliveryStatusSuccess("");
    setDeliveryStatusError("");

    const confirmed = window.confirm(
      `Change Delivery #${delivery.deliveryId} from ${delivery.status} to ${nextStatus}?`
    );

    if (!confirmed) {
      return;
    }

    try {
      setUpdatingDeliveryId(delivery.deliveryId);

      const response = await fetch(
        `http://localhost:5000/api/admin/deliveries/${delivery.deliveryId}/status`,
        {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${user.token}`
          },
          body: JSON.stringify({
            status: nextStatus
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || "Failed to update delivery status."
        );
      }

      setDeliveryStatusSuccess(
        `Delivery #${delivery.deliveryId} updated to ${nextStatus.replace("_", " ")}.`
      );

      await fetchDeliveries();
    } catch (error) {
      console.error("Delivery status update error:", error);
      setDeliveryStatusError(error.message);
    } finally {
      setUpdatingDeliveryId(null);
    }
  };

  useEffect(() => {
    fetchOrganizations();
  }, []);
  useEffect(() => {
    fetchDeliveries();
  }, []);
  useEffect(() => {
    fetchUnassignedAllocations();
  }, []);
  useEffect(() => {
    const fetchPendingAllocations = async () => {
      try {
        setAllocationsLoading(true);
        setAllocationsError("");

        const response = await fetch(
          "http://localhost:5000/api/admin/pending-allocations",
          {
            headers: {
              Authorization: `Bearer ${user.token}`
            }
          }
        );

        const data = await response.json();

        if (!response.ok) {
          throw new Error(
            data.message || "Failed to load pending allocations"
          );
        }

        setPendingAllocations(data);

      } catch (error) {
        console.error("Pending allocations error:", error);
        setAllocationsError(error.message);
      } finally {
        setAllocationsLoading(false);
      }
    };

    fetchPendingAllocations();
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
            Authorization: `Bearer ${user.token}`
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
  const handleAllocateFood = async (allocation) => {
    const quantity = Number(
      allocationQuantities[allocation.acceptanceId]
    );

    setAllocationSuccess("");
    setAllocationActionError("");

    if (
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      quantity > allocation.remainingQuantity
    ) {
      setAllocationActionError(
        `Enter a quantity greater than 0 and up to ${allocation.remainingQuantity} ${allocation.unit.toLowerCase()}.`
      );
      return;
    }

    try {
      setAllocatingId(allocation.acceptanceId);

      const response = await fetch(
        "http://localhost:5000/api/allocations",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            acceptanceId: allocation.acceptanceId,
            requestItemId: allocation.requestItemId,
            batchId: allocation.batchId,
            allocatedQuantity: quantity
          })
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data.message || data.error || "Failed to allocate food"
        );
      }

      setAllocationSuccess(
        `Successfully allocated ${quantity} ${allocation.unit.toLowerCase()} to ${allocation.ngoName}.`
      );

      setAllocationQuantities((previous) => ({
        ...previous,
        [allocation.acceptanceId]: ""
      }));

      const refreshResponse = await fetch(
        "http://localhost:5000/api/admin/pending-allocations",
        {
          cache: "no-store", headers: {
            Authorization: `Bearer ${user.token}`
          }
        }
      );

      if (!refreshResponse.ok) {
        throw new Error(
          "Allocation succeeded, but refreshing the list failed."
        );
      }

      const refreshedData = await refreshResponse.json();
      setPendingAllocations(refreshedData);

    } catch (error) {
      console.error("Admin allocation error:", error);
      setAllocationActionError(error.message);
    } finally {
      setAllocatingId(null);
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
  const filteredOrganizations = [...allOrganizations]
    .sort((a, b) => {
      const dateDifference =
        new Date(b.registrationDate).getTime() -
        new Date(a.registrationDate).getTime();

      if (Number.isFinite(dateDifference) && dateDifference !== 0) {
        return dateDifference;
      }

      return Number(b.organizationId) - Number(a.organizationId);
    })
    .filter((organization) => {
      const search = organizationSearch.trim().toLowerCase();

      if (!search) return true;

      return (
        String(organization.name ?? "").toLowerCase().includes(search) ||
        String(organization.accountType ?? "").toLowerCase().includes(search) ||
        String(organization.organizationId ?? "").includes(search)
      );
    });

  const visibleOrganizations = showAllOrganizations
    ? filteredOrganizations
    : filteredOrganizations.slice(0, 5);

  const pendingCount = allOrganizations.filter(
    (organization) => organization.status === "PENDING"
  ).length;

  const approvedCount = allOrganizations.filter(
    (organization) => organization.status === "APPROVED"
  ).length;

  const blacklistedCount = allOrganizations.filter(
    (organization) => organization.status === "BLACKLISTED"
  ).length;


  // Filtering for Allocations Awaiting Delivery
  const filteredUnassigned = [...unassignedAllocations]
    .sort((a, b) => Number(b.allocationId) - Number(a.allocationId))
    .filter((allocation) => {
      const search = unassignedSearch.trim().toLowerCase();

      return (
        String(allocation.allocationId ?? "").includes(search) ||
        String(allocation.itemName ?? "").toLowerCase().includes(search) ||
        String(allocation.donorName ?? "").toLowerCase().includes(search) ||
        String(allocation.ngoName ?? "").toLowerCase().includes(search)
      );
    });

  const visibleUnassigned = showAllUnassigned
    ? filteredUnassigned
    : filteredUnassigned.slice(0, 5);

  // Delivery Management: sort newest first and filter search results
  const filteredDeliveries = [...deliveries]
    .sort((a, b) => Number(b.deliveryId) - Number(a.deliveryId))
    .filter((delivery) => {
      const search = deliverySearch.trim().toLowerCase();

      return (
        String(delivery.deliveryId ?? "").includes(search) ||
        String(delivery.allocationId ?? "").includes(search) ||
        String(delivery.itemName ?? "").toLowerCase().includes(search) ||
        String(delivery.donorName ?? "").toLowerCase().includes(search) ||
        String(delivery.ngoName ?? "").toLowerCase().includes(search) ||
        String(delivery.deliveryPerson ?? "").toLowerCase().includes(search) ||
        String(delivery.status ?? "").toLowerCase().includes(search)
      );
    });

  const visibleDeliveries = showAllDeliveries
    ? filteredDeliveries
    : filteredDeliveries.slice(0, 5);
  const filteredAllocations = [...pendingAllocations]
  .sort((a, b) => Number(b.acceptanceId) - Number(a.acceptanceId))
  .filter((allocation) => {
    const search = allocationSearch.trim().toLowerCase();

    return (
      String(allocation.itemName ?? "").toLowerCase().includes(search) ||
      String(allocation.donorName ?? "").toLowerCase().includes(search) ||
      String(allocation.ngoName ?? "").toLowerCase().includes(search) ||
      String(allocation.acceptanceId ?? "").includes(search) ||
      String(allocation.batchId ?? "").includes(search)
    );
  });

const visibleAllocations = showAllAllocations
  ? filteredAllocations
  : filteredAllocations.slice(0, 5);  
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

            <div className="admin-panel-actions">
              <button
                type="button"
                className="refresh-button"
                onClick={() => setShowAllOrganizations((previous) => !previous)}
              >
                {showAllOrganizations ? "Show less" : "View all"}
              </button>

              <button
                type="button"
                className="refresh-button"
                onClick={fetchOrganizations}
              >
                Refresh
              </button>
            </div>
            <div className="admin-search-toolbar">
              <input
                type="search"
                className="admin-search-input"
                placeholder="Search by name, Donor, NGO, or ID..."
                aria-label="Search registered organizations"
                value={organizationSearch}
                onChange={(event) => {
                  setOrganizationSearch(event.target.value);
                  setShowAllOrganizations(true);
                }}
              />

              <span className="admin-search-count">
                {filteredOrganizations.length} organization(s)
              </span>
            </div>

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

                  {visibleOrganizations.map((organization) => (

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
        {/* PENDING FOOD ALLOCATIONS */}
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span>FOOD REDISTRIBUTION</span>
              <h2>Pending food allocations</h2>
            </div>
            <div className="admin-panel-actions">
  <button
    type="button"
    className="refresh-button"
    onClick={() => setShowAllAllocations((previous) => !previous)}
  >
    {showAllAllocations ? "Show less" : "View all"}
  </button>

  <button
    type="button"
    className="refresh-button"
    onClick={() => window.location.reload()}
  >
    Refresh
  </button>
</div>
          </div>
          <div className="admin-search-toolbar">
  <input
    type="search"
    className="admin-search-input"
    placeholder="Search food, donor, NGO, batch or ID..."
    aria-label="Search pending food allocations"
    value={allocationSearch}
    onChange={(event) => {
      setAllocationSearch(event.target.value);
      setShowAllAllocations(true);
    }}
  />

  <span className="admin-search-count">
    {filteredAllocations.length} pending allocation(s)
  </span>
</div>
          {allocationSuccess && (
            <div className="admin-allocation-success" role="status">
              {allocationSuccess}
            </div>
          )}

          {allocationActionError && (
            <div className="admin-allocation-error" role="alert">
              {allocationActionError}
            </div>
          )}

          {allocationsLoading ? (
            <div className="admin-loading">
              Loading pending allocations...
            </div>
          ) : allocationsError ? (
            <div className="admin-error">
              {allocationsError}
            </div>
          ) : pendingAllocations.length === 0 ? (
            <div className="admin-empty">
              No donor-accepted food awaiting allocation.
            </div>
          ) : (
            <div className="organization-table-wrapper">
              <table className="organization-table">
                <thead>
                  <tr>
                    <th>Food</th>
                    <th>Donor</th>
                    <th>NGO</th>
                    <th>Batch</th>
                    <th>Accepted</th>
                    <th>Remaining</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleAllocations.map((allocation) => (
                    <tr key={allocation.acceptanceId}>
                      <td>
                        <strong>{allocation.itemName}</strong>
                      </td>

                      <td>{allocation.donorName}</td>

                      <td>{allocation.ngoName}</td>

                      <td>#{allocation.batchId}</td>

                      <td>
                        {allocation.acceptedQuantity}{" "}
                        {allocation.unit.toLowerCase()}
                      </td>

                      <td>
                        <strong>
                          {allocation.remainingQuantity}{" "}
                          {allocation.unit.toLowerCase()}
                        </strong>
                      </td>
                      <td>
                        <div className="admin-allocation-controls">
                          <input
                            type="number"
                            min="0.01"
                            step="0.01"
                            max={allocation.remainingQuantity}
                            placeholder="Qty"
                            className="admin-allocation-input"
                            value={allocationQuantities[allocation.acceptanceId] ?? ""}
                            onChange={(event) => {
                              setAllocationQuantities((previous) => ({
                                ...previous,
                                [allocation.acceptanceId]: event.target.value
                              }));
                            }}
                          />

                          <button
                            type="button"
                            className="approve-button"
                            disabled={allocatingId === allocation.acceptanceId}
                            onClick={() => handleAllocateFood(allocation)}
                          >
                            {allocatingId === allocation.acceptanceId
                              ? "Allocating..."
                              : "Allocate"}
                          </button>
                        </div>
                      </td>

                    </tr>

                  ))}
                </tbody>
              </table>
            </div>

          )}
        </section>
        {/* UNASSIGNED DELIVERY ALLOCATIONS */}

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span>DELIVERY ASSIGNMENT</span>
              <h2>Allocations awaiting delivery</h2>
            </div>

            <div className="admin-panel-actions">
              <button
                type="button"
                className="refresh-button"
                onClick={() =>
                  setShowAllUnassigned((previous) => !previous)
                }
              >
                {showAllUnassigned ? "Show less" : "View all"}
              </button>

              <button
                type="button"
                className="refresh-button"
                onClick={fetchUnassignedAllocations}
              >
                Refresh
              </button>
            </div>
          </div>
          <div className="admin-search-toolbar">
            <input
              type="search"
              className="admin-search-input"
              placeholder="Search allocation ID, food, donor or NGO..."
              aria-label="Search allocations awaiting delivery"
              value={unassignedSearch}
              onChange={(event) => {
                setUnassignedSearch(event.target.value);
                setShowAllUnassigned(true);
              }}
            />

            <span className="admin-search-count">
              {filteredUnassigned.length} allocation(s)
            </span>
          </div>
          {deliveryAssignmentSuccess && (
            <div className="admin-allocation-success" role="status">
              {deliveryAssignmentSuccess}
            </div>
          )}

          {deliveryAssignmentError && (
            <div className="admin-allocation-error" role="alert">
              {deliveryAssignmentError}
            </div>
          )}

          {unassignedLoading ? (
            <div className="admin-loading">
              Loading unassigned allocations...
            </div>
          ) : unassignedError ? (
            <div className="admin-error">
              {unassignedError}
            </div>
          ) : unassignedAllocations.length === 0 ? (
            <div className="admin-empty">
              All allocated food has been assigned for delivery.
            </div>
          ) : (
            <div className="organization-table-wrapper">
              <table className="organization-table">
                <thead>
                  <tr>
                    <th>Allocation</th>
                    <th>Food</th>
                    <th>Donor</th>
                    <th>NGO</th>
                    <th>Quantity</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleUnassigned.map((allocation) => (
                    <tr key={allocation.allocationId}>
                      <td>
                        <strong>#{allocation.allocationId}</strong>
                      </td>

                      <td>{allocation.itemName}</td>

                      <td>{allocation.donorName}</td>

                      <td>{allocation.ngoName}</td>

                      <td>
                        {allocation.quantity}{" "}
                        {allocation.unit?.toLowerCase()}
                      </td>
                      <td>
                        <button
                          type="button"
                          className="admin-assign-delivery-button"
                          onClick={() => setSelectedDeliveryAllocation(allocation)}
                        >
                          Assign Delivery
                        </button>
                      </td>

                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
        {/* DELIVERY ASSIGNMENT FORM */}

        {selectedDeliveryAllocation && (
          <div className="admin-delivery-form">
            <h3>
              Assign Delivery — Allocation #{selectedDeliveryAllocation.allocationId}
            </h3>

            <p>
              {selectedDeliveryAllocation.itemName} ·{" "}
              {selectedDeliveryAllocation.quantity}{" "}
              {selectedDeliveryAllocation.unit.toLowerCase()}
            </p>

            <div className="admin-delivery-form-grid">

              <label>
                Pickup Location
                <input
                  type="text"
                  value={selectedDeliveryAllocation.pickupLocation || ""}
                  readOnly
                />
              </label>

              <label>
                Drop Location
                <input
                  type="text"
                  value={selectedDeliveryAllocation.dropLocation || ""}
                  readOnly
                />
              </label>

              <label>
                Delivery Date
                <input
                  type="datetime-local"
                  value={deliveryForm.deliveryDate}
                  onChange={(event) =>
                    setDeliveryForm((previous) => ({
                      ...previous,
                      deliveryDate: event.target.value
                    }))
                  }
                />
              </label>

              <label>
                Delivery Person
                <input
                  type="text"
                  placeholder="Enter delivery person's name"
                  value={deliveryForm.deliveryPerson}
                  onChange={(event) =>
                    setDeliveryForm((previous) => ({
                      ...previous,
                      deliveryPerson: event.target.value
                    }))
                  }
                />
              </label>

              <label>
                Delivery Phone
                <input
                  type="tel"
                  placeholder="10-digit phone number"
                  value={deliveryForm.deliveryPhone}
                  onChange={(event) =>
                    setDeliveryForm((previous) => ({
                      ...previous,
                      deliveryPhone: event.target.value
                    }))
                  }
                />
              </label>

              <label>
                Notes (optional)
                <input
                  type="text"
                  placeholder="Delivery instructions"
                  value={deliveryForm.notes}
                  onChange={(event) =>
                    setDeliveryForm((previous) => ({
                      ...previous,
                      notes: event.target.value
                    }))
                  }
                />
              </label>

            </div>

            <div className="admin-delivery-form-actions">
              <button
                type="button"
                className="refresh-button"
                onClick={() => setSelectedDeliveryAllocation(null)}
              >
                Cancel
              </button>

              <button
                type="button"
                className="admin-assign-delivery-button"
                onClick={handleAssignDelivery}
                disabled={assigningDelivery}
              >
                {assigningDelivery ? "Assigning..." : "Confirm Assignment"}
              </button>
            </div>
          </div>
        )}
        {/* DELIVERY MANAGEMENT */}

        <section className="admin-panel">
          <div className="admin-panel-heading">
            <div>
              <span>FOOD DISTRIBUTION</span>
              <h2>Delivery management</h2>
            </div>

            <div className="admin-panel-actions">
              <button
                type="button"
                className="refresh-button"
                onClick={() => setShowAllDeliveries((previous) => !previous)}
              >
                {showAllDeliveries ? "Show less" : "View all"}
              </button>

              <button
                type="button"
                className="refresh-button"
                onClick={fetchDeliveries}
              >
                Refresh
              </button>
            </div>
          </div>
          <div className="admin-search-toolbar">
  <input
    type="search"
    className="admin-search-input"
    placeholder="Search delivery ID, food, donor, NGO or status..."
    aria-label="Search deliveries"
    value={deliverySearch}
    onChange={(event) => {
      setDeliverySearch(event.target.value);
      setShowAllDeliveries(true);
    }}
  />

  <span className="admin-search-count">
    {filteredDeliveries.length} delivery(s)
  </span>
</div>
          {deliveryStatusSuccess && (
            <div className="admin-allocation-success" role="status">
              {deliveryStatusSuccess}
            </div>
          )}

          {deliveryStatusError && (
            <div className="admin-allocation-error" role="alert">
              {deliveryStatusError}
            </div>
          )}

          {deliveriesLoading ? (
            <div className="admin-loading">
              Loading deliveries...
            </div>
          ) : deliveriesError ? (
            <div className="admin-error">
              {deliveriesError}
            </div>
          ) : deliveries.length === 0 ? (
            <div className="admin-empty">
              No deliveries have been assigned yet.
            </div>
          ) : (
            <div className="organization-table-wrapper">
              <table className="organization-table">
                <thead>
                  <tr>
                    <th>Delivery</th>
                    <th>Food</th>
                    <th>Donor</th>
                    <th>NGO</th>
                    <th>Quantity</th>
                    <th>Delivery person</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {visibleDeliveries.map((delivery) => (
                    <tr key={delivery.deliveryId}>
                      <td>
                        <strong>#{delivery.deliveryId}</strong>
                        <span>
                          Allocation #{delivery.allocationId}
                        </span>
                      </td>

                      <td>{delivery.itemName}</td>

                      <td>{delivery.donorName}</td>

                      <td>{delivery.ngoName}</td>

                      <td>
                        {delivery.quantity}{" "}
                        {delivery.unit?.toLowerCase()}
                      </td>

                      <td>
                        {delivery.deliveryPerson || "Not assigned"}
                      </td>

                      <td>
                        <span
                          className={`status-badge ${delivery.status === "DELIVERED"
                            ? "approved"
                            : "pending"
                            }`}
                        >
                          {delivery.status}
                        </span>
                      </td>
                      <td>
                        {getNextDeliveryStatus(delivery.status) ? (
                          <button
                            type="button"
                            className="admin-assign-delivery-button"
                            onClick={() => handleUpdateDeliveryStatus(delivery)}
                            disabled={updatingDeliveryId !== null}
                          >
                            {updatingDeliveryId === delivery.deliveryId
                              ? "Updating..."
                              : `Mark as ${getNextDeliveryStatus(delivery.status).replaceAll("_", " ")}`}
                          </button>
                        ) : (
                          <span className="no-action">
                            {delivery.status === "DELIVERED"
                              ? "Completed"
                              : "No action"}
                          </span>
                        )}
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