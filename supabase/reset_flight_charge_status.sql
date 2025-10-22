-- Step 1: Find flights that are marked as charged but have no transaction
-- These are likely the flights you need to reset
SELECT
    f.id,
    f.pilot_id,
    f.block_off,
    f.block_on,
    f.charged,
    f.locked,
    f.charged_at,
    p.tail_number,
    pilot.name || ' ' || pilot.surname AS pilot_name
FROM flightlog f
JOIN planes p ON f.plane_id = p.id
JOIN users pilot ON f.pilot_id = pilot.id
WHERE f.charged = true
    AND f.id NOT IN (
        SELECT DISTINCT flightlog_id
        FROM cost_center_transactions
        WHERE flightlog_id IS NOT NULL
    )
ORDER BY f.block_off DESC;

-- Step 2: Reset the flight status
-- Replace 'FLIGHT_ID_HERE' with the actual flight ID from the query above

-- UPDATE flightlog
-- SET
--     charged = false,
--     locked = false,
--     charged_by = NULL,
--     charged_at = NULL
-- WHERE id = 'FLIGHT_ID_HERE';

-- Step 3: Verify the reset
-- SELECT id, charged, locked, charged_by, charged_at
-- FROM flightlog
-- WHERE id = 'FLIGHT_ID_HERE';
