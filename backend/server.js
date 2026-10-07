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
    let connection;

    try {
        connection = await getConnection();

        const result = await connection.execute(`
            SELECT
                fb.batch_id,
                d.donor_name,
                fi.item_name,
                fc.category_name,
                fb.quantity,
                fb.unit,
                fb.prepared_time,
                fb.expiry_time,
                fb.storage_condition,
                fb.status
            FROM FOOD_BATCH fb
            JOIN DONOR d
                ON fb.donor_id = d.donor_id
            JOIN FOOD_ITEM fi
                ON fb.item_id = fi.item_id
            JOIN FOOD_CATEGORY fc
                ON fi.category_id = fc.category_id
            WHERE fb.status = 'AVAILABLE'
            ORDER BY fb.expiry_time
        `);

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
            batchId,
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
                    :batchId,
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
                batchId,
                donorId,
                itemId,
                quantity,
                unit,
                preparedTime,
                expiryTime,
                storageCondition
            }
        );

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

app.listen(PORT, () => {
    console.log(`FoodRescue backend running on http://localhost:${PORT}`);
});