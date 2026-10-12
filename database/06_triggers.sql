
  CREATE OR REPLACE EDITIONABLE TRIGGER "FOODRESCUE"."TRG_PREVENT_OVER_ALLOCATION"
FOR INSERT ON ALLOCATION
COMPOUND TRIGGER
    TYPE t_batch_ids IS TABLE OF NUMBER INDEX BY PLS_INTEGER;
    v_batch_ids t_batch_ids;
    v_count PLS_INTEGER := 0;
    AFTER EACH ROW IS
    BEGIN
        v_count := v_count + 1;
        v_batch_ids(v_count) := :NEW.batch_id;
    END AFTER EACH ROW;
    AFTER STATEMENT IS
        v_batch_quantity NUMBER;
        v_allocated_quantity NUMBER;
    BEGIN
        FOR i IN 1 .. v_count LOOP
            SELECT quantity
            INTO v_batch_quantity
            FROM FOOD_BATCH
            WHERE batch_id = v_batch_ids(i);
            SELECT NVL(SUM(allocated_quantity), 0)
            INTO v_allocated_quantity
            FROM ALLOCATION
            WHERE batch_id = v_batch_ids(i)
              AND status <> 'CANCELLED';
            IF v_allocated_quantity > v_batch_quantity THEN
                RAISE_APPLICATION_ERROR(
                    -20023,
                    'Allocation exceeds available batch quantity'
                );
            END IF;
        END LOOP;
    END AFTER STATEMENT;
END TRG_PREVENT_OVER_ALLOCATION;
/
ALTER TRIGGER "FOODRESCUE"."TRG_PREVENT_OVER_ALLOCATION" ENABLE;


  CREATE OR REPLACE EDITIONABLE TRIGGER "FOODRESCUE"."TRG_UPDATE_ALLOCATION_ON_DELIVERY"
AFTER UPDATE OF status ON DELIVERY
FOR EACH ROW
BEGIN
    IF :NEW.status = 'DELIVERED'
       AND :OLD.status <> 'DELIVERED' THEN

        UPDATE ALLOCATION
        SET status = 'DELIVERED'
        WHERE allocation_id = :NEW.allocation_id;

    END IF;
END;
/
ALTER TRIGGER "FOODRESCUE"."TRG_UPDATE_ALLOCATION_ON_DELIVERY" ENABLE;

