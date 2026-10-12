
  CREATE OR REPLACE EDITIONABLE FUNCTION "FOODRESCUE"."GET_AVAILABLE_BATCH_COUNT" (
    p_donor_id IN NUMBER
)
RETURN NUMBER
IS
    v_count NUMBER;
BEGIN
    SELECT COUNT(*)
    INTO v_count
    FROM FOOD_BATCH
    WHERE donor_id = p_donor_id
      AND status = 'AVAILABLE';

    RETURN v_count;
END;
/


  CREATE OR REPLACE EDITIONABLE FUNCTION "FOODRESCUE"."GET_REMAINING_QUANTITY" (
    p_batch_id IN NUMBER
)
RETURN NUMBER
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
END;
/

