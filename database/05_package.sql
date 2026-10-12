
  CREATE OR REPLACE EDITIONABLE PACKAGE "FOODRESCUE"."FOODRESCUE_PKG" AS
    FUNCTION GET_REMAINING_QUANTITY (
        p_batch_id IN NUMBER
    ) RETURN NUMBER;
    FUNCTION GET_AVAILABLE_BATCH_COUNT (
        p_donor_id IN NUMBER
    ) RETURN NUMBER;
    PROCEDURE ADD_FOOD_BATCH (
        p_donor_id IN NUMBER,
        p_item_id IN NUMBER,
        p_quantity IN NUMBER,
        p_unit IN VARCHAR2,
        p_prepared_time IN TIMESTAMP,
        p_expiry_time IN TIMESTAMP,
        p_storage_condition IN VARCHAR2
    );
    PROCEDURE ALLOCATE_FOOD (
        p_allocation_id IN NUMBER,
        p_request_item_id IN NUMBER,
        p_batch_id IN NUMBER,
        p_allocated_quantity IN NUMBER,
        p_acceptance_id IN NUMBER
    );
END FOODRESCUE_PKG;
/
CREATE OR REPLACE EDITIONABLE PACKAGE BODY "FOODRESCUE"."FOODRESCUE_PKG" AS
    FUNCTION GET_REMAINING_QUANTITY (
        p_batch_id IN NUMBER
    ) RETURN NUMBER
    IS
        v_batch_quantity NUMBER;
        v_allocated_quantity NUMBER;
    BEGIN
        SELECT quantity
        INTO v_batch_quantity
        FROM FOOD_BATCH
        WHERE batch_id = p_batch_id;
        SELECT NVL(SUM(allocated_quantity), 0)
        INTO v_allocated_quantity
        FROM ALLOCATION
        WHERE batch_id = p_batch_id
          AND status <> 'CANCELLED';
        RETURN v_batch_quantity - v_allocated_quantity;
    EXCEPTION
        WHEN NO_DATA_FOUND THEN
            RETURN NULL;
    END GET_REMAINING_QUANTITY;
    FUNCTION GET_AVAILABLE_BATCH_COUNT (
        p_donor_id IN NUMBER
    ) RETURN NUMBER
    IS
        v_count NUMBER;
    BEGIN
        SELECT COUNT(*)
        INTO v_count
        FROM FOOD_BATCH
        WHERE donor_id = p_donor_id
          AND status = 'AVAILABLE';
        RETURN v_count;
    END GET_AVAILABLE_BATCH_COUNT;
    PROCEDURE ADD_FOOD_BATCH (
        p_donor_id IN NUMBER,
        p_item_id IN NUMBER,
        p_quantity IN NUMBER,
        p_unit IN VARCHAR2,
        p_prepared_time IN TIMESTAMP,
        p_expiry_time IN TIMESTAMP,
        p_storage_condition IN VARCHAR2
    )
    IS
        v_count NUMBER;
        v_batch_id NUMBER;
    BEGIN
        SELECT COUNT(*)
        INTO v_count
        FROM DONOR
        WHERE donor_id = p_donor_id
          AND status = 'APPROVED';
        IF v_count = 0 THEN
            RAISE_APPLICATION_ERROR(-20001, 'Donor is not approved or does not exist');
        END IF;
        SELECT COUNT(*)
        INTO v_count
        FROM FOOD_ITEM
        WHERE item_id = p_item_id;
        IF v_count = 0 THEN
            RAISE_APPLICATION_ERROR(-20002, 'Food item does not exist');
        END IF;
        IF p_quantity IS NULL OR p_quantity <= 0 THEN
            RAISE_APPLICATION_ERROR(-20003, 'Quantity must be greater than zero');
        END IF;
        IF p_prepared_time IS NULL OR p_expiry_time IS NULL
           OR p_expiry_time <= p_prepared_time THEN
            RAISE_APPLICATION_ERROR(-20004, 'Expiry time must be after prepared time');
        END IF;
        v_batch_id := SEQ_FOOD_BATCH.NEXTVAL;
        INSERT INTO FOOD_BATCH (
            batch_id, donor_id, item_id, quantity,
            unit, prepared_time, expiry_time,
            storage_condition, status
        ) VALUES (
            v_batch_id, p_donor_id, p_item_id, p_quantity,
            p_unit, p_prepared_time, p_expiry_time,
            p_storage_condition, 'AVAILABLE'
        );
        COMMIT;
    END ADD_FOOD_BATCH;
    PROCEDURE ALLOCATE_FOOD (
        p_allocation_id IN NUMBER,
        p_request_item_id IN NUMBER,
        p_batch_id IN NUMBER,
        p_allocated_quantity IN NUMBER,
        p_acceptance_id IN NUMBER
    )
    IS
    BEGIN
        FOODRESCUE.ALLOCATE_FOOD(
            p_allocation_id,
            p_request_item_id,
            p_batch_id,
            p_allocated_quantity,
            p_acceptance_id
        );
    END ALLOCATE_FOOD;
END FOODRESCUE_PKG;
/
