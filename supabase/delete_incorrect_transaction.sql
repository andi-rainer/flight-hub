-- Step 1: View all cost center transactions with positive amounts (likely incorrect)
-- Review these carefully before deleting
SELECT
    id,
    cost_center_id,
    flightlog_id,
    amount,
    description,
    created_at,
    created_by
FROM cost_center_transactions
WHERE amount > 0  -- Charges should be negative
ORDER BY created_at DESC;

-- Step 2: Once you've identified the incorrect transaction ID, uncomment and run this:
-- Replace 'TRANSACTION_ID_HERE' with the actual ID from the query above

-- DELETE FROM cost_center_transactions
-- WHERE id = 'TRANSACTION_ID_HERE';

-- Step 3: Verify the deletion
-- SELECT * FROM cost_center_transactions ORDER BY created_at DESC LIMIT 10;

-- IMPORTANT NOTES:
-- 1. First run the SELECT query to see which transactions are wrong
-- 2. Copy the ID of the transaction you want to delete
-- 3. Uncomment the DELETE statement and replace 'TRANSACTION_ID_HERE' with the actual ID
-- 4. Run the DELETE statement
-- 5. Run the verification SELECT to confirm it's gone
