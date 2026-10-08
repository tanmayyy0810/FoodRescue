const express = require("express");
const cors = require("cors");
const { getConnection } = require("./db");

const app = express();
const PORT = process.env.PORT || 5000;

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
            allocationId,
            requestItemId,
            batchId,
            allocatedQuantity
        } = req.body;

        connection = await getConnection();

        await connection.execute(
            `
            BEGIN
                FOODRESCUE_PKG.ALLOCATE_FOOD(
                    :allocationId,
                    :requestItemId,
                    :batchId,
                    :allocatedQuantity
                );
            END;
            `,
            {
                allocationId,
                requestItemId,
                batchId,
                allocatedQuantity
            }
        );

        res.status(201).json({
            message: "Food allocated successfully",
            allocationId
        });

    } catch (error) {
        console.error("Food allocation error:", error);

        res.status(400).json({
            message: "Failed to allocate food",
            error: error.message
        });

    } finally {
        if (connection) {
            await connection.close();
        }
    }
});
app.get("/api/admin/pending-organizations", async (req, res) => {
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
app.post("/api/admin/approve-organization", async (req, res) => {
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
app.post("/api/admin/reject-organization", async (req, res) => {
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
app.post("/api/admin/blacklist-organization", async (req, res) => {
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
app.post("/api/admin/unblacklist-organization", async (req, res) => {
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
app.get("/api/admin/organizations", async (req, res) => {
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

        res.json({
            message: "Login successful",
            userId,
            username: loggedInUsername,
            role,
            donorId,
            ngoId,
            status: accountStatus
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

app.listen(PORT, () => {
    console.log(`FoodRescue backend running on http://localhost:${PORT}`);
});