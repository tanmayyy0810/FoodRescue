
  CREATE OR REPLACE EDITIONABLE PROCEDURE "FOODRESCUE"."ACCEPT_NGO_REQUEST" (
    p_donor_id IN NUMBER,
    p_request_item_id IN NUMBER,
    p_batch_id IN NUMBER,
    p_quantity IN NUMBER
)
IS
    v_donor_status VARCHAR2(20);
    v_request_status VARCHAR2(20);
    v_request_item_id NUMBER;
    v_request_quantity NUMBER;
    v_request_allocated NUMBER;
    v_request_unit VARCHAR2(20);
    v_request_item NUMBER;
    v_batch_donor NUMBER;
    v_batch_item NUMBER;
    v_batch_unit VARCHAR2(20);
    v_batch_status VARCHAR2(20);
    v_batch_expiry TIMESTAMP;
    v_batch_quantity NUMBER;
    v_existing_allocations NUMBER;
    v_existing_acceptances NUMBER;
    v_request_acceptances NUMBER;
BEGIN
    IF p_quantity IS NULL OR p_quantity <= 0 THEN
        RAISE_APPLICATION_ERROR(-20040, 'Accepted quantity must be positive');
    END IF;
    SELECT status INTO v_donor_status
    FROM DONOR
    WHERE donor_id = p_donor_id;
    IF v_donor_status <> 'APPROVED' THEN
        RAISE_APPLICATION_ERROR(-20041, 'Only approved donors can accept requests');
    END IF;
    SELECT ri.request_item_id, ri.item_id, ri.unit,
           ri.requested_quantity, NVL(ri.allocated_quantity, 0), nr.status
    INTO v_request_item_id, v_request_item, v_request_unit,
         v_request_quantity, v_request_allocated, v_request_status
    FROM REQUEST_ITEM ri
    JOIN NGO_REQUEST nr ON nr.request_id = ri.request_id
    WHERE ri.request_item_id = p_request_item_id
    FOR UPDATE OF ri.requested_quantity;
    IF v_request_status <> 'PENDING' THEN
        RAISE_APPLICATION_ERROR(-20042, 'Only pending requests can be accepted');
    END IF;
    SELECT donor_id, item_id, unit, status, expiry_time, quantity
    INTO v_batch_donor, v_batch_item, v_batch_unit,
         v_batch_status, v_batch_expiry, v_batch_quantity
    FROM FOOD_BATCH
    WHERE batch_id = p_batch_id
    FOR UPDATE;
    IF v_batch_donor <> p_donor_id THEN
        RAISE_APPLICATION_ERROR(-20043, 'This food batch does not belong to the donor');
    END IF;
    IF v_batch_item <> v_request_item OR v_batch_unit <> v_request_unit THEN
        RAISE_APPLICATION_ERROR(-20044, 'Food item or unit does not match the request');
    END IF;
    IF v_batch_status <> 'AVAILABLE' OR v_batch_expiry <= SYSTIMESTAMP THEN
        RAISE_APPLICATION_ERROR(-20045, 'Food batch is unavailable or expired');
    END IF;
    SELECT NVL(SUM(allocated_quantity), 0)
    INTO v_existing_allocations
    FROM ALLOCATION
    WHERE batch_id = p_batch_id
      AND status <> 'CANCELLED';
    SELECT NVL(SUM(
        da.accepted_quantity -
        NVL((
            SELECT SUM(a.allocated_quantity)
            FROM ALLOCATION a
            WHERE a.acceptance_id = da.acceptance_id
              AND a.status <> 'CANCELLED'
        ), 0)
    ), 0)
    INTO v_existing_acceptances
    FROM DONOR_ACCEPTANCE da
    WHERE da.batch_id = p_batch_id
      AND da.status = 'ACCEPTED';
    IF p_quantity > v_batch_quantity - v_existing_allocations - v_existing_acceptances THEN
        RAISE_APPLICATION_ERROR(-20046, 'Not enough unreserved food in this batch');
    END IF;
    SELECT NVL(SUM(
        da.accepted_quantity -
        NVL((
            SELECT SUM(a.allocated_quantity)
            FROM ALLOCATION a
            WHERE a.acceptance_id = da.acceptance_id
              AND a.status <> 'CANCELLED'
        ), 0)
    ), 0)
    INTO v_request_acceptances
    FROM DONOR_ACCEPTANCE da
    WHERE da.request_item_id = p_request_item_id
      AND da.status = 'ACCEPTED';
    IF p_quantity > v_request_quantity - v_request_allocated - v_request_acceptances THEN
        RAISE_APPLICATION_ERROR(-20047, 'Accepted quantity exceeds the remaining request');
    END IF;
    INSERT INTO DONOR_ACCEPTANCE (
        acceptance_id, request_item_id, batch_id,
        donor_id, accepted_quantity, status
    ) VALUES (
        SEQ_DONOR_ACCEPTANCE.NEXTVAL, p_request_item_id,
        p_batch_id, p_donor_id, p_quantity, 'ACCEPTED'
    );
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END;
/


  CREATE OR REPLACE EDITIONABLE PROCEDURE "FOODRESCUE"."ADD_FOOD_BATCH" (
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

    IF p_quantity <= 0 THEN
        RAISE_APPLICATION_ERROR(-20003, 'Quantity must be greater than zero');
    END IF;

    IF p_expiry_time <= p_prepared_time THEN
        RAISE_APPLICATION_ERROR(-20004, 'Expiry time must be after prepared time');
    END IF;

    v_batch_id := SEQ_FOOD_BATCH.NEXTVAL;

    INSERT INTO FOOD_BATCH (
        batch_id,
        donor_id,
        item_id,
        quantity,
        unit,
        prepared_time,
        expiry_time,
        storage_condition,
        status
    )
    VALUES (
        v_batch_id,
        p_donor_id,
        p_item_id,
        p_quantity,
        p_unit,
        p_prepared_time,
        p_expiry_time,
        p_storage_condition,
        'AVAILABLE'
    );

    COMMIT;
END;
/


  CREATE OR REPLACE EDITIONABLE PROCEDURE "FOODRESCUE"."ALLOCATE_FOOD" (
    p_allocation_id IN NUMBER,
    p_request_item_id IN NUMBER,
    p_batch_id IN NUMBER,
    p_allocated_quantity IN NUMBER,
    p_acceptance_id IN NUMBER
)
IS
    v_item_id NUMBER;
    v_unit VARCHAR2(20);
    v_requested NUMBER;
    v_allocated NUMBER;
    v_request_id NUMBER;
    v_request_status VARCHAR2(20);
    v_batch_item NUMBER;
    v_batch_unit VARCHAR2(20);
    v_batch_quantity NUMBER;
    v_batch_expiry TIMESTAMP;
    v_batch_status VARCHAR2(20);
    v_batch_donor NUMBER;
    v_accept_item NUMBER;
    v_accept_batch NUMBER;
    v_accept_donor NUMBER;
    v_accept_qty NUMBER;
    v_accept_status VARCHAR2(20);
    v_already_from_acceptance NUMBER;
    v_total_batch_allocated NUMBER;
    v_remaining_items NUMBER;
BEGIN
    IF p_allocated_quantity IS NULL OR p_allocated_quantity <= 0 THEN
        RAISE_APPLICATION_ERROR(-20010, 'Allocation quantity must be positive');
    END IF;
    IF p_acceptance_id IS NULL THEN
        RAISE_APPLICATION_ERROR(-20015, 'Donor acceptance is required');
    END IF;
    SELECT ri.item_id, ri.unit, ri.requested_quantity,
           NVL(ri.allocated_quantity, 0), ri.request_id, nr.status
    INTO v_item_id, v_unit, v_requested,
         v_allocated, v_request_id, v_request_status
    FROM REQUEST_ITEM ri
    JOIN NGO_REQUEST nr ON nr.request_id = ri.request_id
    WHERE ri.request_item_id = p_request_item_id
    FOR UPDATE OF ri.allocated_quantity;
    IF v_request_status NOT IN ('PENDING', 'APPROVED') THEN
        RAISE_APPLICATION_ERROR(-20016, 'Request is not eligible for allocation');
    END IF;
    SELECT item_id, unit, quantity, expiry_time, status, donor_id
    INTO v_batch_item, v_batch_unit, v_batch_quantity,
         v_batch_expiry, v_batch_status, v_batch_donor
    FROM FOOD_BATCH
    WHERE batch_id = p_batch_id
    FOR UPDATE;
    IF v_batch_status <> 'AVAILABLE' OR v_batch_expiry <= SYSTIMESTAMP THEN
        RAISE_APPLICATION_ERROR(-20017, 'Food batch is unavailable or expired');
    END IF;
    IF v_item_id <> v_batch_item OR v_unit <> v_batch_unit THEN
        RAISE_APPLICATION_ERROR(-20018, 'Food item or unit does not match');
    END IF;
    SELECT request_item_id, batch_id, donor_id,
           accepted_quantity, status
    INTO v_accept_item, v_accept_batch, v_accept_donor,
         v_accept_qty, v_accept_status
    FROM DONOR_ACCEPTANCE
    WHERE acceptance_id = p_acceptance_id
    FOR UPDATE;
    IF v_accept_status <> 'ACCEPTED'
       OR v_accept_item <> p_request_item_id
       OR v_accept_batch <> p_batch_id
       OR v_accept_donor <> v_batch_donor THEN
        RAISE_APPLICATION_ERROR(-20019, 'Acceptance does not match this allocation');
    END IF;
    SELECT NVL(SUM(allocated_quantity), 0)
    INTO v_already_from_acceptance
    FROM ALLOCATION
    WHERE acceptance_id = p_acceptance_id
      AND status <> 'CANCELLED';
    IF v_already_from_acceptance + p_allocated_quantity > v_accept_qty THEN
        RAISE_APPLICATION_ERROR(-20020, 'Allocation exceeds accepted quantity');
    END IF;
    IF v_allocated + p_allocated_quantity > v_requested THEN
        RAISE_APPLICATION_ERROR(-20021, 'Allocation exceeds requested quantity');
    END IF;
    SELECT NVL(SUM(allocated_quantity), 0)
    INTO v_total_batch_allocated
    FROM ALLOCATION
    WHERE batch_id = p_batch_id
      AND status <> 'CANCELLED';
    IF v_total_batch_allocated + p_allocated_quantity > v_batch_quantity THEN
        RAISE_APPLICATION_ERROR(-20022, 'Insufficient batch quantity');
    END IF;
    INSERT INTO ALLOCATION (
        allocation_id, request_item_id, batch_id,
        allocated_quantity, allocation_date, status, acceptance_id
    ) VALUES (
        p_allocation_id, p_request_item_id, p_batch_id,
        p_allocated_quantity, SYSDATE, 'ALLOCATED', p_acceptance_id
    );
    UPDATE REQUEST_ITEM
    SET allocated_quantity = NVL(allocated_quantity, 0) + p_allocated_quantity
    WHERE request_item_id = p_request_item_id;
    IF v_total_batch_allocated + p_allocated_quantity = v_batch_quantity THEN
        UPDATE FOOD_BATCH
        SET status = 'ALLOCATED'
        WHERE batch_id = p_batch_id;
    END IF;
    SELECT COUNT(*)
    INTO v_remaining_items
    FROM REQUEST_ITEM
    WHERE request_id = v_request_id
      AND NVL(allocated_quantity, 0) < requested_quantity;
    IF v_remaining_items = 0 THEN
        UPDATE NGO_REQUEST
        SET status = 'ALLOCATED'
        WHERE request_id = v_request_id;
    END IF;
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END;
/


  CREATE OR REPLACE EDITIONABLE PROCEDURE "FOODRESCUE"."APPROVE_ORGANIZATION" (
    p_account_type IN VARCHAR2,
    p_organization_id IN NUMBER
)
IS
BEGIN
    IF UPPER(p_account_type) = 'DONOR' THEN

        UPDATE DONOR
        SET status = 'APPROVED'
        WHERE donor_id = p_organization_id
          AND status = 'PENDING';

        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(
                -20050,
                'Donor does not exist or is not pending approval'
            );
        END IF;

    ELSIF UPPER(p_account_type) = 'NGO' THEN

        UPDATE NGO
        SET status = 'APPROVED'
        WHERE ngo_id = p_organization_id
          AND status = 'PENDING';

        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(
                -20051,
                'NGO does not exist or is not pending approval'
            );
        END IF;

    ELSE
        RAISE_APPLICATION_ERROR(
            -20052,
            'Invalid account type'
        );
    END IF;

    COMMIT;
END;
/


  CREATE OR REPLACE EDITIONABLE PROCEDURE "FOODRESCUE"."ASSIGN_DELIVERY" (
    p_allocation_id   IN NUMBER,
    p_delivery_date   IN DATE,
    p_pickup_location IN VARCHAR2,
    p_drop_location   IN VARCHAR2,
    p_delivery_person IN VARCHAR2,
    p_delivery_phone  IN VARCHAR2,
    p_notes           IN VARCHAR2 DEFAULT NULL
)
AS
    v_allocation_status ALLOCATION.STATUS%TYPE;
    v_delivery_count    NUMBER;
BEGIN
    SELECT status
    INTO v_allocation_status
    FROM ALLOCATION
    WHERE allocation_id = p_allocation_id
    FOR UPDATE;

    IF v_allocation_status <> 'ALLOCATED' THEN
        RAISE_APPLICATION_ERROR(
            -20051,
            'Only allocated food can be assigned for delivery.'
        );
    END IF;

    SELECT COUNT(*)
    INTO v_delivery_count
    FROM DELIVERY
    WHERE allocation_id = p_allocation_id;

    IF v_delivery_count > 0 THEN
        RAISE_APPLICATION_ERROR(
            -20052,
            'This allocation already has a delivery.'
        );
    END IF;

    IF TRIM(p_pickup_location) IS NULL
       OR TRIM(p_drop_location) IS NULL
       OR TRIM(p_delivery_person) IS NULL
       OR TRIM(p_delivery_phone) IS NULL THEN
        RAISE_APPLICATION_ERROR(
            -20053,
            'Delivery contact and location details are required.'
        );
    END IF;

    INSERT INTO DELIVERY (
        delivery_id,
        allocation_id,
        delivery_date,
        pickup_location,
        drop_location,
        delivery_person,
        delivery_phone,
        status,
        notes
    )
    VALUES (
        SEQ_DELIVERY.NEXTVAL,
        p_allocation_id,
        p_delivery_date,
        p_pickup_location,
        p_drop_location,
        p_delivery_person,
        p_delivery_phone,
        'ASSIGNED',
        p_notes
    );

    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(
            -20054,
            'Allocation not found.'
        );
END ASSIGN_DELIVERY;
/


  CREATE OR REPLACE EDITIONABLE PROCEDURE "FOODRESCUE"."CANCEL_NGO_REQUEST" (
    p_request_id IN NUMBER,
    p_ngo_id IN NUMBER
)
IS
    v_ngo_id NUMBER;
    v_status VARCHAR2(20);
    v_allocated_count NUMBER;
    v_accepted_count NUMBER;
BEGIN
    SELECT ngo_id, status
    INTO v_ngo_id, v_status
    FROM NGO_REQUEST
    WHERE request_id = p_request_id
    FOR UPDATE;
    IF v_ngo_id <> p_ngo_id THEN
        RAISE_APPLICATION_ERROR(-20030, 'You are not authorized to cancel this request');
    END IF;
    IF v_status <> 'PENDING' THEN
        RAISE_APPLICATION_ERROR(-20031, 'Only pending requests can be cancelled');
    END IF;
    SELECT COUNT(*)
    INTO v_allocated_count
    FROM REQUEST_ITEM ri
    LEFT JOIN ALLOCATION a
        ON a.request_item_id = ri.request_item_id
        AND a.status <> 'CANCELLED'
    WHERE ri.request_id = p_request_id
      AND (NVL(ri.allocated_quantity, 0) > 0 OR a.allocation_id IS NOT NULL);
    IF v_allocated_count > 0 THEN
        RAISE_APPLICATION_ERROR(-20032, 'Cannot cancel a request that already has food allocated');
    END IF;
    SELECT COUNT(*)
    INTO v_accepted_count
    FROM REQUEST_ITEM ri
    JOIN DONOR_ACCEPTANCE da
        ON da.request_item_id = ri.request_item_id
    WHERE ri.request_id = p_request_id
      AND da.status = 'ACCEPTED';
    IF v_accepted_count > 0 THEN
        RAISE_APPLICATION_ERROR(-20033, 'Cannot cancel a request that has donor-accepted food');
    END IF;
    UPDATE NGO_REQUEST
    SET status = 'CANCELLED'
    WHERE request_id = p_request_id;
    COMMIT;
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END;
/


  CREATE OR REPLACE EDITIONABLE PROCEDURE "FOODRESCUE"."CREATE_NGO_REQUEST" (
    p_ngo_id IN NUMBER,
    p_item_id IN NUMBER,
    p_requested_quantity IN NUMBER,
    p_unit IN VARCHAR2,
    p_required_by IN DATE,
    p_notes IN VARCHAR2
)
IS
    v_count NUMBER;
    v_request_id NUMBER;
    v_request_item_id NUMBER;
BEGIN
    -- Check that the NGO exists and is approved
    SELECT COUNT(*)
    INTO v_count
    FROM NGO
    WHERE ngo_id = p_ngo_id
      AND status = 'APPROVED';
    IF v_count = 0 THEN
        RAISE_APPLICATION_ERROR(
            -20030,
            'NGO is not approved or does not exist'
        );
    END IF;
    -- Check that the food item exists
    SELECT COUNT(*)
    INTO v_count
    FROM FOOD_ITEM
    WHERE item_id = p_item_id;
    IF v_count = 0 THEN
        RAISE_APPLICATION_ERROR(
            -20031,
            'Food item does not exist'
        );
    END IF;
    -- Validate quantity
    IF p_requested_quantity <= 0 THEN
        RAISE_APPLICATION_ERROR(
            -20032,
            'Requested quantity must be greater than zero'
        );
    END IF;
    -- Validate required-by date
    IF p_required_by <= SYSDATE THEN
        RAISE_APPLICATION_ERROR(
            -20033,
            'Required-by date must be in the future'
        );
    END IF;
    -- Generate IDs
    v_request_id := SEQ_NGO_REQUEST.NEXTVAL;
    v_request_item_id := SEQ_REQUEST_ITEM.NEXTVAL;
    -- Create NGO request
    INSERT INTO NGO_REQUEST (
        request_id,
        ngo_id,
        request_date,
        required_by,
        status,
        notes
    )
    VALUES (
        v_request_id,
        p_ngo_id,
        SYSDATE,
        p_required_by,
        'PENDING',
        p_notes
    );
    -- Add requested food item
    INSERT INTO REQUEST_ITEM (
        request_item_id,
        request_id,
        item_id,
        requested_quantity,
        unit,
        allocated_quantity
    )
    VALUES (
        v_request_item_id,
        v_request_id,
        p_item_id,
        p_requested_quantity,
        p_unit,
        0
    );
    COMMIT;
    DBMS_OUTPUT.PUT_LINE(
        'NGO request created successfully.'
    );
    DBMS_OUTPUT.PUT_LINE(
        'Request ID: ' || v_request_id
    );
    DBMS_OUTPUT.PUT_LINE(
        'Request Item ID: ' || v_request_item_id
    );
EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END;
/


  CREATE OR REPLACE EDITIONABLE PROCEDURE "FOODRESCUE"."REGISTER_ORGANIZATION" (
    p_account_type      IN VARCHAR2,
    p_contact_name      IN VARCHAR2,
    p_organization_name IN VARCHAR2,
    p_email             IN VARCHAR2,
    p_phone             IN VARCHAR2,
    p_password          IN VARCHAR2,
    p_address           IN VARCHAR2,
    p_city              IN VARCHAR2,
    p_username          IN VARCHAR2,
    p_user_id           OUT NUMBER,
    p_organization_id   OUT NUMBER
)
IS
    v_count NUMBER;
BEGIN
    IF UPPER(p_account_type) NOT IN ('DONOR', 'NGO') THEN
        RAISE_APPLICATION_ERROR(-20040, 'Invalid account type');
    END IF;

    SELECT COUNT(*)
    INTO v_count
    FROM USER_ACCOUNT
    WHERE username = LOWER(p_username);

    IF v_count > 0 THEN
        RAISE_APPLICATION_ERROR(-20041, 'Username already exists');
    END IF;

    IF p_account_type = 'DONOR' THEN

        SELECT COUNT(*)
        INTO v_count
        FROM DONOR
        WHERE LOWER(email) = LOWER(p_email);

        IF v_count > 0 THEN
            RAISE_APPLICATION_ERROR(-20042, 'Donor email already registered');
        END IF;

        SELECT NVL(MAX(donor_id), 0) + 1
        INTO p_organization_id
        FROM DONOR;

        INSERT INTO DONOR (
            donor_id,
            donor_name,
            email,
            phone,
            address,
            registration_date,
            status
        )
        VALUES (
            p_organization_id,
            p_organization_name,
            p_email,
            p_phone,
            p_address || ', ' || p_city,
            SYSDATE,
            'PENDING'
        );

        SELECT SEQ_USER_ACCOUNT.NEXTVAL
        INTO p_user_id
        FROM DUAL;

        INSERT INTO USER_ACCOUNT (
            user_id,
            username,
            password_hash,
            role,
            donor_id,
            ngo_id,
            status
        )
        VALUES (
            p_user_id,
            LOWER(p_username),
            p_password,
            'DONOR',
            p_organization_id,
            NULL,
            'ACTIVE'
        );

    ELSE

        SELECT COUNT(*)
        INTO v_count
        FROM NGO
        WHERE LOWER(email) = LOWER(p_email);

        IF v_count > 0 THEN
            RAISE_APPLICATION_ERROR(-20043, 'NGO email already registered');
        END IF;

        SELECT NVL(MAX(ngo_id), 0) + 1
        INTO p_organization_id
        FROM NGO;

        INSERT INTO NGO (
            ngo_id,
            ngo_name,
            email,
            phone,
            address,
            registration_date,
            status
        )
        VALUES (
            p_organization_id,
            p_organization_name,
            p_email,
            p_phone,
            p_address || ', ' || p_city,
            SYSDATE,
            'PENDING'
        );

        SELECT SEQ_USER_ACCOUNT.NEXTVAL
        INTO p_user_id
        FROM DUAL;

        INSERT INTO USER_ACCOUNT (
            user_id,
            username,
            password_hash,
            role,
            donor_id,
            ngo_id,
            status
        )
        VALUES (
            p_user_id,
            LOWER(p_username),
            p_password,
            'NGO',
            NULL,
            p_organization_id,
            'ACTIVE'
        );

    END IF;

    COMMIT;

EXCEPTION
    WHEN OTHERS THEN
        ROLLBACK;
        RAISE;
END;
/


  CREATE OR REPLACE EDITIONABLE PROCEDURE "FOODRESCUE"."REJECT_ORGANIZATION" (
    p_account_type IN VARCHAR2,
    p_organization_id IN NUMBER
)
IS
BEGIN
    IF UPPER(p_account_type) = 'DONOR' THEN

        UPDATE DONOR
        SET status = 'REJECTED'
        WHERE donor_id = p_organization_id
          AND status = 'PENDING';

        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(
                -20053,
                'Donor does not exist or is not pending approval'
            );
        END IF;

    ELSIF UPPER(p_account_type) = 'NGO' THEN

        UPDATE NGO
        SET status = 'REJECTED'
        WHERE ngo_id = p_organization_id
          AND status = 'PENDING';

        IF SQL%ROWCOUNT = 0 THEN
            RAISE_APPLICATION_ERROR(
                -20054,
                'NGO does not exist or is not pending approval'
            );
        END IF;

    ELSE
        RAISE_APPLICATION_ERROR(
            -20055,
            'Invalid account type'
        );
    END IF;

    COMMIT;
END;
/


  CREATE OR REPLACE EDITIONABLE PROCEDURE "FOODRESCUE"."SHOW_AVAILABLE_BATCHES"
IS
    CURSOR batch_cursor IS
        SELECT
            fb.batch_id,
            d.donor_name,
            fi.item_name,
            fb.quantity,
            fb.unit,
            fb.expiry_time
        FROM FOOD_BATCH fb
        JOIN DONOR d
            ON fb.donor_id = d.donor_id
        JOIN FOOD_ITEM fi
            ON fb.item_id = fi.item_id
        WHERE fb.status = 'AVAILABLE'
        ORDER BY fb.expiry_time;

    v_batch_id FOOD_BATCH.batch_id%TYPE;
    v_donor_name DONOR.donor_name%TYPE;
    v_item_name FOOD_ITEM.item_name%TYPE;
    v_quantity FOOD_BATCH.quantity%TYPE;
    v_unit FOOD_BATCH.unit%TYPE;
    v_expiry_time FOOD_BATCH.expiry_time%TYPE;
BEGIN
    DBMS_OUTPUT.PUT_LINE('AVAILABLE FOOD BATCHES');
    DBMS_OUTPUT.PUT_LINE('---------------------');

    OPEN batch_cursor;

    LOOP
        FETCH batch_cursor
        INTO
            v_batch_id,
            v_donor_name,
            v_item_name,
            v_quantity,
            v_unit,
            v_expiry_time;

        EXIT WHEN batch_cursor%NOTFOUND;

        DBMS_OUTPUT.PUT_LINE(
            'Batch: ' || v_batch_id ||
            ' | Donor: ' || v_donor_name ||
            ' | Food: ' || v_item_name ||
            ' | Quantity: ' || v_quantity || ' ' || v_unit ||
            ' | Expiry: ' ||
            TO_CHAR(v_expiry_time, 'DD-MON-YYYY HH24:MI')
        );
    END LOOP;

    CLOSE batch_cursor;
END;
/


  CREATE OR REPLACE EDITIONABLE PROCEDURE "FOODRESCUE"."UPDATE_DELIVERY_STATUS" (
    p_delivery_id IN NUMBER,
    p_new_status  IN VARCHAR2
)
AS
    v_old_status DELIVERY.STATUS%TYPE;
BEGIN
    SELECT status
    INTO v_old_status
    FROM DELIVERY
    WHERE delivery_id = p_delivery_id
    FOR UPDATE;

    IF NOT (
        (v_old_status = 'ASSIGNED' AND p_new_status = 'PICKED_UP')
        OR
        (v_old_status = 'PICKED_UP' AND p_new_status = 'IN_TRANSIT')
        OR
        (v_old_status = 'IN_TRANSIT' AND p_new_status = 'DELIVERED')
    ) THEN
        RAISE_APPLICATION_ERROR(
            -20055,
            'Invalid delivery status transition.'
        );
    END IF;

    UPDATE DELIVERY
    SET status = p_new_status,
        delivered_at = CASE
            WHEN p_new_status = 'DELIVERED'
            THEN LOCALTIMESTAMP
            ELSE delivered_at
        END
    WHERE delivery_id = p_delivery_id;

    COMMIT;
EXCEPTION
    WHEN NO_DATA_FOUND THEN
        RAISE_APPLICATION_ERROR(
            -20056,
            'Delivery not found.'
        );
END UPDATE_DELIVERY_STATUS;
/


  CREATE OR REPLACE EDITIONABLE PROCEDURE "FOODRESCUE"."UPDATE_ORGANIZATION_ACCESS" (
    p_account_type IN VARCHAR2,
    p_organization_id IN NUMBER,
    p_action IN VARCHAR2
)
IS
BEGIN
    IF UPPER(p_account_type) = 'DONOR' THEN

        IF UPPER(p_action) = 'BLACKLIST' THEN

            UPDATE DONOR
            SET status = 'BLACKLISTED'
            WHERE donor_id = p_organization_id
              AND status = 'APPROVED';

            IF SQL%ROWCOUNT = 0 THEN
                RAISE_APPLICATION_ERROR(
                    -20056,
                    'Donor does not exist or is not approved'
                );
            END IF;

        ELSIF UPPER(p_action) = 'UNBLACKLIST' THEN

            UPDATE DONOR
            SET status = 'APPROVED'
            WHERE donor_id = p_organization_id
              AND status = 'BLACKLISTED';

            IF SQL%ROWCOUNT = 0 THEN
                RAISE_APPLICATION_ERROR(
                    -20057,
                    'Donor does not exist or is not blacklisted'
                );
            END IF;

        ELSE
            RAISE_APPLICATION_ERROR(
                -20058,
                'Invalid access action'
            );
        END IF;

    ELSIF UPPER(p_account_type) = 'NGO' THEN

        IF UPPER(p_action) = 'BLACKLIST' THEN

            UPDATE NGO
            SET status = 'BLACKLISTED'
            WHERE ngo_id = p_organization_id
              AND status = 'APPROVED';

            IF SQL%ROWCOUNT = 0 THEN
                RAISE_APPLICATION_ERROR(
                    -20059,
                    'NGO does not exist or is not approved'
                );
            END IF;

        ELSIF UPPER(p_action) = 'UNBLACKLIST' THEN

            UPDATE NGO
            SET status = 'APPROVED'
            WHERE ngo_id = p_organization_id
              AND status = 'BLACKLISTED';

            IF SQL%ROWCOUNT = 0 THEN
                RAISE_APPLICATION_ERROR(
                    -20060,
                    'NGO does not exist or is not blacklisted'
                );
            END IF;

        ELSE
            RAISE_APPLICATION_ERROR(
                -20061,
                'Invalid access action'
            );
        END IF;

    ELSE
        RAISE_APPLICATION_ERROR(
            -20062,
            'Invalid account type'
        );
    END IF;

    COMMIT;
END;
/

