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
                user_id,
                username,
                role,
                donor_id,
                ngo_id,
                status
            FROM USER_ACCOUNT
            WHERE username = :username
              AND password_hash = :password
              AND status = 'ACTIVE'
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

        res.json({
            message: "Login successful",
            userId: user[0],
            username: user[1],
            role: user[2],
            donorId: user[3],
            ngoId: user[4]
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