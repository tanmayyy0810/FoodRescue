const express = require("express");
const cors = require("cors");
const { getConnection } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const {
    authenticateToken,
    requireRole
} = require("./authMiddleware");

app.use(cors());
app.use(express.json());

// Test Oracle connection
app.get("/", async (req, res) => {
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(
            `SELECT 'Oracle connection successful' AS MESSAGE FROM DUAL`
        );

        res.json({
            message: result.rows[0][0]
        });
    } catch (error) {
        console.error("Oracle connection error:", error);

        res.status(500).json({
            message: "Oracle connection failed",
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});

// Get available food batches
app.get("/api/food-batches", async (req, res) => {
    const donorId = req.query.donorId;
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(
            `
    SELECT
        fb.batch_id,
        fb.item_id,
        d.donor_name,
        fi.item_name,
        fc.category_name,
        fb.quantity,
        fb.unit,
        fb.prepared_time,
        fb.expiry_time,
        fb.storage_condition,
        fb.status,
        GET_REMAINING_QUANTITY(fb.batch_id) AS remaining_quantity
    FROM FOOD_BATCH fb
    JOIN DONOR d
        ON fb.donor_id = d.donor_id
    JOIN FOOD_ITEM fi
        ON fb.item_id = fi.item_id
    JOIN FOOD_CATEGORY fc
        ON fi.category_id = fc.category_id
    WHERE fb.status = 'AVAILABLE'
      AND GET_REMAINING_QUANTITY(fb.batch_id) > 0
      AND fb.expiry_time > SYSDATE
      AND (:donorId IS NULL OR fb.donor_id = :donorId)
    ORDER BY fb.expiry_time
`,
            {
                donorId: donorId ? Number(donorId) : null
            });

        res.json(result.rows);

    } catch (error) {
        console.error("Food batch query error:", error);

        res.status(500).json({
            message: "Failed to fetch food batches",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
// Add a new food batch
app.post("/api/food-batches", async (req, res) => {
    let connection;

    try {
        const {
            donorId,
            itemId,
            quantity,
            unit,
            preparedTime,
            expiryTime,
            storageCondition
        } = req.body;

        connection = await getConnection();

        await connection.execute(
            `
            BEGIN
                FOODRESCUE_PKG.ADD_FOOD_BATCH(
                    :donorId,
                    :itemId,
                    :quantity,
                    :unit,
                    TO_TIMESTAMP(:preparedTime, 'YYYY-MM-DD HH24:MI:SS'),
                    TO_TIMESTAMP(:expiryTime, 'YYYY-MM-DD HH24:MI:SS'),
                    :storageCondition
                );
            END;
            `,
            {
                donorId,
                itemId,
                quantity,
                unit,
                preparedTime,
                expiryTime,
                storageCondition
            }
        );

        const result = await connection.execute(`
            SELECT SEQ_FOOD_BATCH.CURRVAL AS batch_id
            FROM DUAL
        `);

        const batchId = result.rows[0][0];

        res.status(201).json({
            message: "Food batch added successfully",
            batchId
        });

    } catch (error) {
        console.error("Add food batch error:", error);

        res.status(400).json({
            message: "Failed to add food batch",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
app.get("/api/ngo-requests/:ngoId", async (req, res) => {
    let connection;

    try {
        const ngoId = Number(req.params.ngoId);

        if (!Number.isInteger(ngoId) || ngoId <= 0) {
            return res.status(400).json({
                message: "Invalid NGO ID"
            });
        }

        connection = await getConnection();
        // Automatically expire overdue requests that have not
// received any donor acceptances or food allocations.
await connection.execute(
    `
    UPDATE NGO_REQUEST nr
    SET nr.status = 'EXPIRED'
    WHERE nr.ngo_id = :ngoId
      AND nr.status = 'PENDING'
      AND nr.required_by < SYSDATE
      AND NOT EXISTS (
          SELECT 1
          FROM REQUEST_ITEM ri
          JOIN DONOR_ACCEPTANCE da
              ON da.request_item_id = ri.request_item_id
          WHERE ri.request_id = nr.request_id
      )
      AND NOT EXISTS (
          SELECT 1
          FROM REQUEST_ITEM ri
          JOIN ALLOCATION a
              ON a.request_item_id = ri.request_item_id
          WHERE ri.request_id = nr.request_id
      )
    `,
    { ngoId },
    { autoCommit: true }
);

        const result = await connection.execute(
            `
            SELECT
                nr.request_id,
                n.ngo_name,
                fi.item_name,
                ri.request_item_id,
                ri.requested_quantity,
                ri.unit,
                ri.allocated_quantity,
                nr.required_by,
                nr.status,
                nr.notes
            FROM NGO_REQUEST nr
            JOIN NGO n
                ON nr.ngo_id = n.ngo_id
            JOIN REQUEST_ITEM ri
                ON nr.request_id = ri.request_id
            JOIN FOOD_ITEM fi
                ON ri.item_id = fi.item_id
            WHERE nr.ngo_id = :ngoId
            ORDER BY nr.required_by
            `,
            { ngoId }
        );

        res.json(result.rows);

    } catch (error) {
        console.error("NGO request query error:", error);

        res.status(500).json({
            message: "Failed to fetch NGO requests",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
app.get("/api/ngo-requests", async (req, res) => {
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(`
            SELECT
                nr.request_id,
                n.ngo_name,
                fi.item_name,
                ri.request_item_id,
                ri.requested_quantity,
                ri.unit,
                ri.allocated_quantity,
                nr.required_by,
                nr.status,
                nr.notes
            FROM NGO_REQUEST nr
            JOIN NGO n
                ON nr.ngo_id = n.ngo_id
            JOIN REQUEST_ITEM ri
                ON nr.request_id = ri.request_id
            JOIN FOOD_ITEM fi
                ON ri.item_id = fi.item_id
            WHERE nr.status = 'PENDING'
            ORDER BY nr.required_by
        `);

        res.json(result.rows);

    } catch (error) {
        console.error("NGO request query error:", error);

        res.status(500).json({
            message: "Failed to fetch NGO requests",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
app.post("/api/ngo-requests", async (req, res) => {
    let connection;

    try {
        const {
            ngoId,
            itemId,
            quantity,
            unit,
            requiredBy,
            notes
        } = req.body;

        if (!ngoId || !itemId || !quantity || !unit || !requiredBy) {
            return res.status(400).json({
                message: "NGO, food item, quantity, unit and required-by date are required"
            });
        }

        connection = await getConnection();
        // Reject requests if this food item has no unexpired,
 // available batches with remaining quantity.
const availableFood = await connection.execute(
    `
    SELECT COUNT(*)
    FROM FOOD_BATCH fb
    WHERE fb.item_id = :itemId
      AND fb.status = 'AVAILABLE'
      AND fb.expiry_time > SYSDATE
      AND GET_REMAINING_QUANTITY(fb.batch_id) > 0
      AND fb.unit = :unit
    `,
    {
        itemId: Number(itemId),
        unit
    }
);

if (availableFood.rows[0][0] === 0) {
    return res.status(400).json({
        message: "This food is no longer available or has expired. Please refresh Available Food."
    });
}

        await connection.execute(
            `
            BEGIN
                CREATE_NGO_REQUEST(
                    :ngoId,
                    :itemId,
                    :quantity,
                    :unit,
                    TO_DATE(:requiredBy, 'YYYY-MM-DD HH24:MI'),
                    :notes
                );
            END;
            `,
            {
                ngoId,
                itemId,
                quantity,
                unit,
                requiredBy,
                notes: notes || null
            }
        );

        const result = await connection.execute(`
            SELECT SEQ_NGO_REQUEST.CURRVAL
            FROM DUAL
        `);

        res.status(201).json({
            message: "NGO request created successfully",
            requestId: result.rows[0][0]
        });

    } catch (error) {
        console.error("NGO request creation error:", error);

        res.status(400).json({
            message: "Failed to create NGO request",
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
app.post("/api/allocations", async (req, res) => {
    let connection;

    try {
        const {
            acceptanceId,
            requestItemId,
            batchId,
            allocatedQuantity
        } = req.body || {};

        const acceptance = Number(acceptanceId);
        const requestItem = Number(requestItemId);
        const batch = Number(batchId);
        const quantity = Number(allocatedQuantity);

        if (
            !Number.isInteger(acceptance) || acceptance <= 0 ||
            !Number.isInteger(requestItem) || requestItem <= 0 ||
            !Number.isInteger(batch) || batch <= 0 ||
            !Number.isFinite(quantity) || quantity <= 0
        ) {
            return res.status(400).json({
                message: "Valid acceptance ID, request item ID, batch ID and positive allocation quantity are required."
            });
        }

        connection = await getConnection();

        const result = await connection.execute(
            `DECLARE
                v_allocation_id NUMBER;
             BEGIN
                v_allocation_id := SEQ_ALLOCATION.NEXTVAL;

                FOODRESCUE_PKG.ALLOCATE_FOOD(
                    v_allocation_id,
                    :requestItemId,
                    :batchId,
                    :allocatedQuantity,
                    :acceptanceId
                );

                :allocationId := v_allocation_id;
             END;`,
            {
                requestItemId: requestItem,
                batchId: batch,
                allocatedQuantity: quantity,
                acceptanceId: acceptance,
                allocationId: {
                    dir: require("oracledb").BIND_OUT,
                    type: require("oracledb").NUMBER
                }
            }
        );

        res.status(201).json({
            message: "Food allocated successfully.",
            allocationId: result.outBinds.allocationId,
            acceptanceId: acceptance,
            allocatedQuantity: quantity
        });

    } catch (error) {
        console.error("Food allocation error:", error);

        if (error.errorNum >= 20010 && error.errorNum <= 20023) {
            return res.status(400).json({
                message: error.message
            });
        }

        res.status(500).json({
            message: "Failed to allocate food.",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
app.get("/api/admin/pending-organizations",authenticateToken, requireRole("ADMIN"), async (req, res) => {
    let connection;

    try {
        connection = await getConnection();

        const donorResult = await connection.execute(`
            SELECT
                donor_id,
                donor_name,
                email,
                phone,
                address,
                registration_date,
                status
            FROM DONOR
            WHERE status = 'PENDING'
            ORDER BY registration_date DESC
        `);

        const ngoResult = await connection.execute(`
            SELECT
                ngo_id,
                ngo_name,
                email,
                phone,
                address,
                registration_date,
                status
            FROM NGO
            WHERE status = 'PENDING'
            ORDER BY registration_date DESC
        `);

        res.json({
            donors: donorResult.rows,
            ngos: ngoResult.rows
        });

    } catch (error) {
        console.error("Pending organizations error:", error);

        res.status(500).json({
            message: "Failed to fetch pending organizations",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
app.post("/api/admin/approve-organization", authenticateToken, requireRole("ADMIN"),async (req, res) => {
    let connection;

    try {
        const {
            accountType,
            organizationId
        } = req.body;

        if (!accountType || !organizationId) {
            return res.status(400).json({
                message: "Account type and organization ID are required"
            });
        }

        connection = await getConnection();

        await connection.execute(
            `
            BEGIN
                APPROVE_ORGANIZATION(
                    :accountType,
                    :organizationId
                );
            END;
            `,
            {
                accountType,
                organizationId
            }
        );

        res.json({
            message: "Organization approved successfully"
        });

    } catch (error) {
        console.error("Approval error:", error);

        res.status(400).json({
            message: "Failed to approve organization",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
app.post("/api/admin/reject-organization", authenticateToken, requireRole("ADMIN"),async (req, res) => {
    let connection;

    try {
        const { accountType, organizationId } = req.body;

        if (!accountType || !organizationId) {
            return res.status(400).json({
                message: "Account type and organization ID are required"
            });
        }

        connection = await getConnection();

        await connection.execute(
            `
            BEGIN
                REJECT_ORGANIZATION(
                    :accountType,
                    :organizationId
                );
            END;
            `,
            {
                accountType,
                organizationId
            }
        );

        res.json({
            message: "Organization rejected successfully"
        });

    } catch (error) {
        console.error("Rejection error:", error);

        res.status(400).json({
            message: "Failed to reject organization",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
app.post("/api/admin/blacklist-organization", authenticateToken, requireRole("ADMIN"), async (req, res) => {
    let connection;

    try {
        const { accountType, organizationId } = req.body;

        if (!accountType || !organizationId) {
            return res.status(400).json({
                message: "Account type and organization ID are required"
            });
        }

        connection = await getConnection();

        await connection.execute(
            `
            BEGIN
                UPDATE_ORGANIZATION_ACCESS(
                    :accountType,
                    :organizationId,
                    'BLACKLIST'
                );
            END;
            `,
            {
                accountType,
                organizationId
            }
        );

        res.json({
            message: "Organization blacklisted successfully"
        });

    } catch (error) {
        console.error("Blacklist error:", error);

        res.status(400).json({
            message: "Failed to blacklist organization",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
app.post("/api/admin/unblacklist-organization",authenticateToken, requireRole("ADMIN"), async (req, res) => {
    let connection;

    try {
        const { accountType, organizationId } = req.body;

        if (!accountType || !organizationId) {
            return res.status(400).json({
                message: "Account type and organization ID are required"
            });
        }

        connection = await getConnection();

        await connection.execute(
            `
            BEGIN
                UPDATE_ORGANIZATION_ACCESS(
                    :accountType,
                    :organizationId,
                    'UNBLACKLIST'
                );
            END;
            `,
            {
                accountType,
                organizationId
            }
        );

        res.json({
            message: "Organization access restored successfully"
        });

    } catch (error) {
        console.error("Unblacklist error:", error);

        res.status(400).json({
            message: "Failed to restore organization access",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
app.get(
    "/api/admin/organizations",
    authenticateToken,
    requireRole("ADMIN"),
    async (req, res) => {
    let connection;

    try {
        connection = await getConnection();

        const donorResult = await connection.execute(`
            SELECT
                donor_id,
                donor_name,
                email,
                phone,
                address,
                registration_date,
                status
            FROM DONOR
            ORDER BY registration_date DESC
        `);

        const ngoResult = await connection.execute(`
            SELECT
                ngo_id,
                ngo_name,
                email,
                phone,
                address,
                registration_date,
                status
            FROM NGO
            ORDER BY registration_date DESC
        `);

        res.json({
            donors: donorResult.rows,
            ngos: ngoResult.rows
        });

    } catch (error) {
        console.error("Admin organizations error:", error);

        res.status(500).json({
            message: "Failed to fetch organizations",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
app.post("/api/ngo-requests/cancel", async (req, res) => {
    let connection;

    try {
        const { requestId, ngoId } = req.body;

        if (!requestId || !ngoId) {
            return res.status(400).json({
                message: "Request ID and NGO ID are required.",
            });
        }

        // connection = await oracledb.getConnection(dbConfig);
        connection = await getConnection();

        await connection.execute(
            `BEGIN
         CANCEL_NGO_REQUEST(
           :request_id,
           :ngo_id
         );
       END;`,
            {
                request_id: Number(requestId),
                ngo_id: Number(ngoId),
            }
        );

        res.json({
            message: "NGO request cancelled successfully.",
            requestId: Number(requestId),
            status: "CANCELLED",
        });
    } catch (error) {
        console.error("Cancel NGO request error:", error);

        if (error.errorNum === 20030 || error.errorNum === 20031) {
            return res.status(400).json({
                message: error.message,
            });
        }

        res.status(500).json({
            message: "Unable to cancel NGO request.",
            error: error.message,
        });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
app.post("/api/register", async (req, res) => {
    let connection;

    try {
        const {
            accountType,
            contactName,
            organizationName,
            email,
            phone,
            password,
            address,
            city,
            username
        } = req.body;

        if (
            !accountType ||
            !contactName ||
            !organizationName ||
            !email ||
            !phone ||
            !password ||
            !address ||
            !city ||
            !username
        ) {
            return res.status(400).json({
                message: "All registration fields are required"
            });
        }

        if (!["DONOR", "NGO"].includes(accountType)) {
            return res.status(400).json({
                message: "Invalid account type"
            });
        }

        connection = await getConnection();

        const result = await connection.execute(
            `
            DECLARE
                v_user_id NUMBER;
                v_organization_id NUMBER;
            BEGIN
                REGISTER_ORGANIZATION(
                    :accountType,
                    :contactName,
                    :organizationName,
                    :email,
                    :phone,
                    :password,
                    :address,
                    :city,
                    :username,
                    v_user_id,
                    v_organization_id
                );

                :userId := v_user_id;
                :organizationId := v_organization_id;
            END;
            `,
            {
                accountType,
                contactName,
                organizationName,
                email,
                phone,
                password,
                address,
                city,
                username,
                userId: {
                    dir: require("oracledb").BIND_OUT,
                    type: require("oracledb").NUMBER
                },
                organizationId: {
                    dir: require("oracledb").BIND_OUT,
                    type: require("oracledb").NUMBER
                }
            }
        );

        res.status(201).json({
            message: "Registration submitted successfully. Your account is pending admin approval.",
            userId: result.outBinds.userId,
            organizationId: result.outBinds.organizationId,
            status: "PENDING"
        });

    } catch (error) {
        console.error("Registration error:", error);

        res.status(400).json({
            message: "Registration failed",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});

// User login
app.post("/api/login", async (req, res) => {
    let connection;

    try {
        const { username, password } = req.body;

        if (!username || !password) {
            return res.status(400).json({
                message: "Username and password are required"
            });
        }

        connection = await getConnection();

        const result = await connection.execute(
            `
            SELECT
                u.user_id,
                u.username,
                u.role,
                u.donor_id,
                u.ngo_id,
                u.status,
                d.status AS donor_status,
                n.status AS ngo_status
            FROM USER_ACCOUNT u
            LEFT JOIN DONOR d
                ON u.donor_id = d.donor_id
            LEFT JOIN NGO n
                ON u.ngo_id = n.ngo_id
            WHERE u.username = :username
              AND u.password_hash = :password
              AND u.status = 'ACTIVE'
            `,
            {
                username,
                password
            }
        );

        if (result.rows.length === 0) {
            return res.status(401).json({
                message: "Invalid username or password"
            });
        }

        const user = result.rows[0];

        const userId = user[0];
        const loggedInUsername = user[1];
        const role = user[2];
        const donorId = user[3];
        const ngoId = user[4];
        const accountStatus = user[5];
        const donorStatus = user[6];
        const ngoStatus = user[7];

        if (role === "DONOR") {
            if (donorStatus === "PENDING") {
                return res.status(403).json({
                    message: "Your donor registration is pending admin approval."
                });
            }

            if (donorStatus === "REJECTED") {
                return res.status(403).json({
                    message: "Your donor registration has been rejected by the admin."
                });
            }

            if (donorStatus === "BLACKLISTED") {
                return res.status(403).json({
                    message: "Your donor account has been blacklisted. Please contact the administrator."
                });
            }

            if (donorStatus !== "APPROVED") {
                return res.status(403).json({
                    message: "Your donor account is not approved."
                });
            }
        }

        if (role === "NGO") {
            if (ngoStatus === "PENDING") {
                return res.status(403).json({
                    message: "Your NGO registration is pending admin approval."
                });
            }

            if (ngoStatus === "REJECTED") {
                return res.status(403).json({
                    message: "Your NGO registration has been rejected by the admin."
                });
            }

            if (ngoStatus === "BLACKLISTED") {
                return res.status(403).json({
                    message: "Your NGO account has been blacklisted. Please contact the administrator."
                });
            }

            if (ngoStatus !== "APPROVED") {
                return res.status(403).json({
                    message: "Your NGO account is not approved."
                });
            }
        }

        const token = jwt.sign(
    {
        userId,
        role,
        donorId,
        ngoId
    },
    process.env.JWT_SECRET,
    {
        expiresIn: "8h"
    }
);

res.json({
    message: "Login successful",
    userId,
    username: loggedInUsername,
    role,
    donorId,
    ngoId,
    status: accountStatus,
    token
});

    } catch (error) {
        console.error("Login error:", error);

        res.status(500).json({
            message: "Login failed",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
app.get("/api/donors/:donorId/allocations", async (req, res) => {
    let connection;

    try {
        const donorId = Number(req.params.donorId);

        if (!Number.isInteger(donorId) || donorId <= 0) {
            return res.status(400).json({
                message: "Invalid donor ID"
            });
        }

        connection = await getConnection();

        const result = await connection.execute(
            `
            SELECT
                a.allocation_id,
                fi.item_name,
                n.ngo_name,
                a.allocated_quantity,
                fb.unit,
                a.allocation_date,
                a.status
            FROM ALLOCATION a
            JOIN FOOD_BATCH fb
                ON a.batch_id = fb.batch_id
            JOIN FOOD_ITEM fi
                ON fb.item_id = fi.item_id
            JOIN REQUEST_ITEM ri
                ON a.request_item_id = ri.request_item_id
            JOIN NGO_REQUEST nr
                ON ri.request_id = nr.request_id
            JOIN NGO n
                ON nr.ngo_id = n.ngo_id
            WHERE fb.donor_id = :donorId
            ORDER BY a.allocation_date DESC
            `,
            { donorId }
        );

        const allocations = result.rows.map((row) => ({
            allocationId: row[0],
            itemName: row[1],
            ngoName: row[2],
            allocatedQuantity: row[3],
            unit: row[4],
            allocationDate: row[5],
            status: row[6]
        }));

        res.json(allocations);

    } catch (error) {
        console.error("Donor allocations error:", error);

        res.status(500).json({
            message: "Failed to fetch donor allocations",
            error: error.message
        });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
// Get donor dashboard data
app.get("/api/donors/:donorId/dashboard", async (req, res) => {
    let connection;

    try {
        const donorId = Number(req.params.donorId);

        if (!Number.isInteger(donorId) || donorId <= 0) {
            return res.status(400).json({
                message: "Invalid donor ID"
            });
        }

        connection = await getConnection();

        const donorResult = await connection.execute(
            `
            SELECT
                donor_id,
                donor_name,
                email,
                phone,
                address,
                status
            FROM DONOR
            WHERE donor_id = :donorId
            `,
            { donorId }
        );

        if (donorResult.rows.length === 0) {
            return res.status(404).json({
                message: "Donor not found"
            });
        }

        const donor = donorResult.rows[0];

        const statsResult = await connection.execute(
            `
            SELECT
                COUNT(*) AS total_batches,
                SUM(
                    CASE
                        WHEN status = 'AVAILABLE'
                         AND GET_REMAINING_QUANTITY(batch_id) > 0
                        THEN 1
                        ELSE 0
                    END
                ) AS active_batches,
                SUM(
                    CASE
                        WHEN expiry_time <= SYSTIMESTAMP + INTERVAL '24' HOUR
                         AND expiry_time > SYSTIMESTAMP
                         AND GET_REMAINING_QUANTITY(batch_id) > 0
                        THEN 1
                        ELSE 0
                    END
                ) AS expiring_soon
            FROM FOOD_BATCH
            WHERE donor_id = :donorId
            `,
            { donorId }
        );

        const allocationResult = await connection.execute(
            `
            SELECT
                NVL(SUM(a.allocated_quantity), 0) AS allocated_quantity
            FROM ALLOCATION a
            JOIN FOOD_BATCH fb
                ON a.batch_id = fb.batch_id
            WHERE fb.donor_id = :donorId
              AND a.status <> 'CANCELLED'
            `,
            { donorId }
        );

        res.json({
            donor: {
                donorId: donor[0],
                donorName: donor[1],
                email: donor[2],
                phone: donor[3],
                address: donor[4],
                status: donor[5]
            },
            stats: {
                totalBatches: statsResult.rows[0][0] || 0,
                activeBatches: statsResult.rows[0][1] || 0,
                expiringSoon: statsResult.rows[0][2] || 0,
                allocatedQuantity: allocationResult.rows[0][0] || 0
            }
        });

    } catch (error) {
        console.error("Donor dashboard error:", error);

        res.status(500).json({
            message: "Failed to fetch donor dashboard data",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
// Donor accepts an NGO food request
app.post("/api/donor-acceptances", async (req, res) => {
    let connection;

    try {
        const {
            donorId,
            requestItemId,
            batchId,
            quantity
        } = req.body || {};

        const donor = Number(donorId);
        const requestItem = Number(requestItemId);
        const batch = Number(batchId);
        const acceptedQuantity = Number(quantity);

        if (
            !Number.isInteger(donor) || donor <= 0 ||
            !Number.isInteger(requestItem) || requestItem <= 0 ||
            !Number.isInteger(batch) || batch <= 0 ||
            !Number.isFinite(acceptedQuantity) || acceptedQuantity <= 0
        ) {
            return res.status(400).json({
                message: "Valid donor ID, request item ID, batch ID and positive quantity are required."
            });
        }

        connection = await getConnection();

        await connection.execute(
            `BEGIN
                ACCEPT_NGO_REQUEST(
                    :donorId,
                    :requestItemId,
                    :batchId,
                    :quantity
                );
             END;`,
            {
                donorId: donor,
                requestItemId: requestItem,
                batchId: batch,
                quantity: acceptedQuantity
            }
        );

        res.status(201).json({
            message: "NGO food request accepted successfully.",
            donorId: donor,
            requestItemId: requestItem,
            batchId: batch,
            acceptedQuantity
        });

    } catch (error) {
        console.error("Donor acceptance error:", error);

        if (error.errorNum >= 20040 && error.errorNum <= 20047) {
            return res.status(400).json({
                message: error.message
            });
        }

        res.status(500).json({
            message: "Unable to accept NGO request.",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
// Get pending NGO requests matching a donor's available food
app.get("/api/donors/:donorId/matching-requests", async (req, res) => {
    let connection;

    try {
        const donorId = Number(req.params.donorId);

        if (!Number.isInteger(donorId) || donorId <= 0) {
            return res.status(400).json({
                message: "Invalid donor ID"
            });
        }

        connection = await getConnection();

        const result = await connection.execute(
    `
    WITH request_remaining AS (
        SELECT
            ri.request_item_id,
            ri.request_id,
            ri.item_id,
            ri.unit,
            ri.requested_quantity,
            NVL(ri.allocated_quantity, 0) AS allocated_quantity,
            NVL((
                SELECT SUM(
                    da.accepted_quantity -
                    NVL((
                        SELECT SUM(a.allocated_quantity)
                        FROM ALLOCATION a
                        WHERE a.acceptance_id = da.acceptance_id
                          AND a.status <> 'CANCELLED'
                    ), 0)
                )
                FROM DONOR_ACCEPTANCE da
                WHERE da.request_item_id = ri.request_item_id
                  AND da.status = 'ACCEPTED'
            ), 0) AS accepted_quantity
        FROM REQUEST_ITEM ri
        JOIN NGO_REQUEST nr
            ON nr.request_id = ri.request_id
        WHERE nr.status = 'PENDING'
    ),
    donor_batches AS (
        SELECT
            fb.batch_id,
            fb.item_id,
            fb.unit,
            fb.expiry_time,
            fb.quantity
                - NVL((
                    SELECT SUM(a.allocated_quantity)
                    FROM ALLOCATION a
                    WHERE a.batch_id = fb.batch_id
                      AND a.status <> 'CANCELLED'
                ), 0)
                - NVL((
                    SELECT SUM(
                        da.accepted_quantity -
                        NVL((
                            SELECT SUM(a.allocated_quantity)
                            FROM ALLOCATION a
                            WHERE a.acceptance_id = da.acceptance_id
                              AND a.status <> 'CANCELLED'
                        ), 0)
                    )
                    FROM DONOR_ACCEPTANCE da
                    WHERE da.batch_id = fb.batch_id
                      AND da.status = 'ACCEPTED'
                ), 0) AS available_quantity
        FROM FOOD_BATCH fb
        WHERE fb.donor_id = :donorId
          AND fb.status = 'AVAILABLE'
          AND fb.expiry_time > SYSTIMESTAMP
    )
    SELECT
        rr.request_id,
        rr.request_item_id,
        n.ngo_name,
        fi.item_name,
        rr.item_id,
        rr.unit,
        rr.requested_quantity,
        rr.allocated_quantity,
        rr.accepted_quantity,
        rr.requested_quantity
            - rr.allocated_quantity
            - rr.accepted_quantity AS remaining_request_quantity,
        db.batch_id,
        db.available_quantity AS batch_available_quantity,
        db.expiry_time,
        nr.required_by
    FROM request_remaining rr
    JOIN NGO_REQUEST nr
        ON nr.request_id = rr.request_id
    JOIN NGO n
        ON n.ngo_id = nr.ngo_id
    JOIN FOOD_ITEM fi
        ON fi.item_id = rr.item_id
    JOIN donor_batches db
        ON db.item_id = rr.item_id
       AND db.unit = rr.unit
    WHERE rr.requested_quantity
            - rr.allocated_quantity
            - rr.accepted_quantity > 0
      AND db.available_quantity > 0
    ORDER BY nr.required_by, db.expiry_time
    `,
    { donorId }
);
        const requests = result.rows.map((row) => ({
            requestId: row[0],
            requestItemId: row[1],
            ngoName: row[2],
            itemName: row[3],
            itemId: row[4],
            unit: row[5],
            requestedQuantity: row[6],
            allocatedQuantity: row[7],
            acceptedQuantity: row[8],
            remainingRequestQuantity: row[9],
            batchId: row[10],
            batchAvailableQuantity: row[11],
            expiryTime: row[12],
            requiredBy: row[13]
        }));

        res.json(requests);

    } catch (error) {
        console.error("Matching NGO requests error:", error);

        res.status(500).json({
            message: "Failed to fetch matching NGO requests",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
app.get("/api/donors/:donorId/accepted-requests", async (req, res) => {
    let connection;

    try {
        const donorId = Number(req.params.donorId);

        if (!Number.isInteger(donorId) || donorId <= 0) {
            return res.status(400).json({
                message: "Invalid donor ID"
            });
        }

        connection = await getConnection();

        const result = await connection.execute(
            `SELECT
                da.acceptance_id,
                nr.request_id,
                ri.request_item_id,
                n.ngo_name,
                fi.item_name,
                da.batch_id,
                da.accepted_quantity,
                ri.unit,
                da.acceptance_date,
                da.status
             FROM DONOR_ACCEPTANCE da
             JOIN REQUEST_ITEM ri
               ON ri.request_item_id = da.request_item_id
             JOIN NGO_REQUEST nr
               ON nr.request_id = ri.request_id
             JOIN NGO n
               ON n.ngo_id = nr.ngo_id
             JOIN FOOD_ITEM fi
               ON fi.item_id = ri.item_id
             WHERE da.donor_id = :donorId
             ORDER BY da.acceptance_date DESC, da.acceptance_id DESC`,
            { donorId }
        );

        res.json(
            result.rows.map((row) => ({
                acceptanceId: row[0],
                requestId: row[1],
                requestItemId: row[2],
                ngoName: row[3],
                itemName: row[4],
                batchId: row[5],
                acceptedQuantity: row[6],
                unit: row[7],
                acceptanceDate: row[8],
                status: row[9]
            }))
        );

    } catch (error) {
        console.error("Accepted requests error:", error);

        res.status(500).json({
            message: "Failed to fetch accepted requests",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
// Admin: list donor acceptances awaiting allocation
app.get("/api/admin/pending-allocations",authenticateToken, requireRole("ADMIN"), async (req, res) => {
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(`
            SELECT
                da.acceptance_id,
                nr.request_id,
                ri.request_item_id,
                n.ngo_name,
                d.donor_name,
                fi.item_name,
                da.batch_id,
                da.accepted_quantity,
                NVL((
                    SELECT SUM(a.allocated_quantity)
                    FROM ALLOCATION a
                    WHERE a.acceptance_id = da.acceptance_id
                      AND a.status <> 'CANCELLED'
                ), 0) AS allocated_quantity,
                da.accepted_quantity - NVL((
                    SELECT SUM(a.allocated_quantity)
                    FROM ALLOCATION a
                    WHERE a.acceptance_id = da.acceptance_id
                      AND a.status <> 'CANCELLED'
                ), 0) AS remaining_quantity,
                ri.unit,
                fb.expiry_time
            FROM DONOR_ACCEPTANCE da
            JOIN REQUEST_ITEM ri
                ON ri.request_item_id = da.request_item_id
            JOIN NGO_REQUEST nr
                ON nr.request_id = ri.request_id
            JOIN NGO n
                ON n.ngo_id = nr.ngo_id
            JOIN DONOR d
                ON d.donor_id = da.donor_id
            JOIN FOOD_ITEM fi
                ON fi.item_id = ri.item_id
            JOIN FOOD_BATCH fb
                ON fb.batch_id = da.batch_id
            WHERE da.status = 'ACCEPTED'
              AND nr.status IN ('PENDING', 'APPROVED')
              AND fb.status = 'AVAILABLE'
              AND fb.expiry_time > SYSTIMESTAMP
              AND da.accepted_quantity > NVL((
                  SELECT SUM(a.allocated_quantity)
                  FROM ALLOCATION a
                  WHERE a.acceptance_id = da.acceptance_id
                    AND a.status <> 'CANCELLED'
              ), 0)
            ORDER BY fb.expiry_time, da.acceptance_date
        `);

        res.json(result.rows.map((row) => ({
            acceptanceId: row[0],
            requestId: row[1],
            requestItemId: row[2],
            ngoName: row[3],
            donorName: row[4],
            itemName: row[5],
            batchId: row[6],
            acceptedQuantity: row[7],
            allocatedQuantity: row[8],
            remainingQuantity: row[9],
            unit: row[10],
            expiryTime: row[11]
        })));

    } catch (error) {
        console.error("Pending allocations error:", error);

        res.status(500).json({
            message: "Failed to fetch pending allocations",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
// Admin: assign delivery to an allocated food batch
app.post("/api/admin/deliveries", authenticateToken, requireRole("ADMIN"), async (req, res) => {
    let connection;

    try {
        const {
            allocationId,
            deliveryDate,
            pickupLocation,
            dropLocation,
            deliveryPerson,
            deliveryPhone,
            notes
        } = req.body || {};

        const allocation = Number(allocationId);

        if (!Number.isInteger(allocation) || allocation <= 0) {
            return res.status(400).json({
                message: "A valid allocation ID is required."
            });
        }

        if (
            !deliveryDate ||
            !pickupLocation?.trim() ||
            !dropLocation?.trim() ||
            !deliveryPerson?.trim() ||
            !deliveryPhone?.trim()
        ) {
            return res.status(400).json({
                message: "Delivery date, locations and contact details are required."
            });
        }

        connection = await getConnection();

        await connection.execute(
            `BEGIN
                ASSIGN_DELIVERY(
                    :allocationId,
                    TO_DATE(:deliveryDate, 'YYYY-MM-DD HH24:MI'),
                    :pickupLocation,
                    :dropLocation,
                    :deliveryPerson,
                    :deliveryPhone,
                    :notes
                );
            END;`,
            {
                allocationId: allocation,
                deliveryDate,
                pickupLocation: pickupLocation.trim(),
                dropLocation: dropLocation.trim(),
                deliveryPerson: deliveryPerson.trim(),
                deliveryPhone: deliveryPhone.trim(),
                notes: notes?.trim() || null
            }
        );

        const result = await connection.execute(
            `SELECT delivery_id
             FROM DELIVERY
             WHERE allocation_id = :allocationId`,
            { allocationId: allocation }
        );

        res.status(201).json({
            message: "Delivery assigned successfully.",
            deliveryId: result.rows[0][0],
            allocationId: allocation,
            status: "ASSIGNED"
        });

    } catch (error) {
        console.error("Delivery assignment error:", error);

        if (
            error.errorNum >= 20051 &&
            error.errorNum <= 20054
        ) {
            return res.status(400).json({
                message: error.message
            });
        }

        if (error.errorNum === 1) {
            return res.status(409).json({
                message: "This allocation already has a delivery."
            });
        }

        res.status(500).json({
            message: "Failed to assign delivery.",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
// Admin: update delivery status
app.patch("/api/admin/deliveries/:deliveryId/status", authenticateToken, requireRole("ADMIN"), async (req, res) => {
    let connection;

    try {
        const deliveryId = Number(req.params.deliveryId);
        const { status } = req.body || {};

        if (!Number.isInteger(deliveryId) || deliveryId <= 0) {
            return res.status(400).json({
                message: "A valid delivery ID is required."
            });
        }

        if (
            !["PICKED_UP", "IN_TRANSIT", "DELIVERED"].includes(status)
        ) {
            return res.status(400).json({
                message: "Invalid delivery status."
            });
        }

        connection = await getConnection();

        await connection.execute(
            `BEGIN
                UPDATE_DELIVERY_STATUS(
                    :deliveryId,
                    :newStatus
                );
            END;`,
            {
                deliveryId,
                newStatus: status
            }
        );

        res.json({
            message: "Delivery status updated successfully.",
            deliveryId,
            status
        });

    } catch (error) {
        console.error("Delivery status update error:", error);

        if (error.errorNum === 20055) {
            return res.status(400).json({
                message: "Invalid delivery status transition."
            });
        }

        if (error.errorNum === 20056) {
            return res.status(404).json({
                message: "Delivery not found."
            });
        }

        res.status(500).json({
            message: "Failed to update delivery status.",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
// Admin: list deliveries with donor, NGO and food information
app.get("/api/admin/deliveries", authenticateToken, requireRole("ADMIN"), async (req, res) => {
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(`
            SELECT
                d.delivery_id,
                d.allocation_id,
                don.donor_name,
                n.ngo_name,
                fi.item_name,
                a.allocated_quantity,
                fb.unit,
                d.delivery_date,
                d.pickup_location,
                d.drop_location,
                d.delivery_person,
                d.delivery_phone,
                d.status,
                d.delivered_at,
                d.notes
            FROM DELIVERY d
            JOIN ALLOCATION a
                ON a.allocation_id = d.allocation_id
            JOIN FOOD_BATCH fb
                ON fb.batch_id = a.batch_id
            JOIN DONOR don
                ON don.donor_id = fb.donor_id
            JOIN REQUEST_ITEM ri
                ON ri.request_item_id = a.request_item_id
            JOIN NGO_REQUEST nr
                ON nr.request_id = ri.request_id
            JOIN NGO n
                ON n.ngo_id = nr.ngo_id
            JOIN FOOD_ITEM fi
                ON fi.item_id = ri.item_id
            ORDER BY d.delivery_id DESC
        `);

        const deliveries = result.rows.map((row) => ({
            deliveryId: row[0],
            allocationId: row[1],
            donorName: row[2],
            ngoName: row[3],
            itemName: row[4],
            quantity: row[5],
            unit: row[6],
            deliveryDate: row[7],
            pickupLocation: row[8],
            dropLocation: row[9],
            deliveryPerson: row[10],
            deliveryPhone: row[11],
            status: row[12],
            deliveredAt: row[13],
            notes: row[14]
        }));

        res.json(deliveries);

    } catch (error) {
        console.error("Delivery listing error:", error);

        res.status(500).json({
            message: "Failed to fetch deliveries.",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
// Admin: list allocations awaiting delivery assignment
app.get("/api/admin/unassigned-deliveries", authenticateToken, requireRole("ADMIN"), async (req, res) => {
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(`
            SELECT
                a.allocation_id,
                fi.item_name,
                a.allocated_quantity,
                fb.unit,
                don.donor_name,
                don.address,
                n.ngo_name,
                n.address
            FROM ALLOCATION a
            JOIN FOOD_BATCH fb
                ON fb.batch_id = a.batch_id
            JOIN DONOR don
                ON don.donor_id = fb.donor_id
            JOIN FOOD_ITEM fi
                ON fi.item_id = fb.item_id
            JOIN REQUEST_ITEM ri
                ON ri.request_item_id = a.request_item_id
            JOIN NGO_REQUEST nr
                ON nr.request_id = ri.request_id
            JOIN NGO n
                ON n.ngo_id = nr.ngo_id
            WHERE a.status = 'ALLOCATED'
              AND NOT EXISTS (
                  SELECT 1
                  FROM DELIVERY d
                  WHERE d.allocation_id = a.allocation_id
              )
            ORDER BY a.allocation_id
        `);

        res.json(
            result.rows.map((row) => ({
                allocationId: row[0],
                itemName: row[1],
                quantity: row[2],
                unit: row[3],
                donorName: row[4],
                pickupLocation: row[5],
                ngoName: row[6],
                dropLocation: row[7]
            }))
        );

    } catch (error) {
        console.error("Unassigned deliveries error:", error);

        res.status(500).json({
            message: "Failed to fetch unassigned allocations.",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
// NGO: View incoming deliveries
app.get("/api/ngos/:ngoId/deliveries", async (req, res) => {
  let connection;

  try {
    const ngoId = Number(req.params.ngoId);

    if (!Number.isInteger(ngoId) || ngoId <= 0) {
      return res.status(400).json({
        message: "Invalid NGO ID."
      });
    }

    connection = await getConnection();

    const result = await connection.execute(
      `
      SELECT
        d.delivery_id,
        d.allocation_id,
        fi.item_name,
        a.allocated_quantity,
        fb.unit,
        don.donor_name,
        d.pickup_location,
        d.drop_location,
        d.delivery_date,
        d.delivery_person,
        d.delivery_phone,
        d.status,
        d.delivered_at
      FROM DELIVERY d
      JOIN ALLOCATION a
        ON a.allocation_id = d.allocation_id
      JOIN FOOD_BATCH fb
        ON fb.batch_id = a.batch_id
      JOIN DONOR don
        ON don.donor_id = fb.donor_id
      JOIN REQUEST_ITEM ri
        ON ri.request_item_id = a.request_item_id
      JOIN NGO_REQUEST nr
        ON nr.request_id = ri.request_id
      JOIN FOOD_ITEM fi
        ON fi.item_id = ri.item_id
      WHERE nr.ngo_id = :ngoId
      ORDER BY d.delivery_id DESC
      `,
      { ngoId }
    );

    const deliveries = result.rows.map((row) => ({
      deliveryId: row[0],
      allocationId: row[1],
      itemName: row[2],
      quantity: row[3],
      unit: row[4],
      donorName: row[5],
      pickupLocation: row[6],
      dropLocation: row[7],
      deliveryDate: row[8],
      deliveryPerson: row[9],
      deliveryPhone: row[10],
      status: row[11],
      deliveredAt: row[12]
    }));

    return res.json(deliveries);
  } catch (error) {
    console.error("Error fetching NGO deliveries:", error);

    return res.status(500).json({
      message: "Failed to fetch NGO deliveries.",
      error: error.message
    });
  } finally {
    if (connection) {
      await connection.close();
    }
  }
});
// Donor: View deliveries of donated food
app.get("/api/donors/:donorId/deliveries", async (req, res) => {
    let connection;

    try {
        const donorId = Number(req.params.donorId);

        if (!Number.isInteger(donorId) || donorId <= 0) {
            return res.status(400).json({
                message: "Invalid donor ID."
            });
        }

        connection = await getConnection();

        const result = await connection.execute(
            `
            SELECT
                d.delivery_id,
                d.allocation_id,
                fi.item_name,
                a.allocated_quantity,
                fb.unit,
                n.ngo_name,
                d.pickup_location,
                d.drop_location,
                d.delivery_date,
                d.delivery_person,
                d.delivery_phone,
                d.status,
                d.delivered_at
            FROM DELIVERY d
            JOIN ALLOCATION a
                ON a.allocation_id = d.allocation_id
            JOIN FOOD_BATCH fb
                ON fb.batch_id = a.batch_id
            JOIN FOOD_ITEM fi
                ON fi.item_id = fb.item_id
            JOIN REQUEST_ITEM ri
                ON ri.request_item_id = a.request_item_id
            JOIN NGO_REQUEST nr
                ON nr.request_id = ri.request_id
            JOIN NGO n
                ON n.ngo_id = nr.ngo_id
            WHERE fb.donor_id = :donorId
            ORDER BY d.delivery_id DESC
            `,
            { donorId }
        );

        const deliveries = result.rows.map((row) => ({
            deliveryId: row[0],
            allocationId: row[1],
            itemName: row[2],
            quantity: row[3],
            unit: row[4],
            ngoName: row[5],
            pickupLocation: row[6],
            dropLocation: row[7],
            deliveryDate: row[8],
            deliveryPerson: row[9],
            deliveryPhone: row[10],
            status: row[11],
            deliveredAt: row[12]
        }));

        return res.json(deliveries);
    } catch (error) {
        console.error("Error fetching donor deliveries:", error);

        return res.status(500).json({
            message: "Failed to fetch donor deliveries."
        });
    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
// Get NGO account details
app.get(
    "/api/ngos/:ngoId/account",
    authenticateToken,
    requireRole("NGO"),
    async (req, res) => {
    let connection;

    try {
        const ngoId = Number(req.params.ngoId);

        if (!Number.isInteger(ngoId) || ngoId <= 0) {
            return res.status(400).json({
                message: "Invalid NGO ID"
            });
        }
        if (Number(req.user.ngoId) !== ngoId) {
    return res.status(403).json({
        message: "You can only access your own NGO account details."
    });
}

        connection = await getConnection();

        const result = await connection.execute(
            `
            SELECT
                n.NGO_NAME,
                u.USERNAME,
                u.ROLE,
                u.STATUS AS ACCOUNT_STATUS,
                n.EMAIL,
                n.PHONE,
                n.ADDRESS,
                n.REGISTRATION_DATE,
                n.STATUS AS NGO_STATUS
            FROM NGO n
            JOIN USER_ACCOUNT u
                ON u.NGO_ID = n.NGO_ID
            WHERE n.NGO_ID = :ngoId
              AND u.ROLE = 'NGO'
            `,
            { ngoId }
        );

        if (result.rows.length === 0) {
            return res.status(404).json({
                message: "NGO account not found"
            });
        }

        const row = result.rows[0];

        res.json({
            organizationName: row[0],
            username: row[1],
            role: row[2],
            accountStatus: row[3],
            email: row[4],
            phone: row[5],
            address: row[6],
            registrationDate: row[7],
            approvalStatus: row[8]
        });

    } catch (error) {
        console.error("NGO account details error:", error);

        res.status(500).json({
            message: "Failed to load NGO account details"
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});

app.listen(PORT, () => {
    console.log(`FoodRescue backend running on http://localhost:${PORT}`);
});