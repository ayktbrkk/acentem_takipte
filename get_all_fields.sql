SELECT TABLE_NAME, COLUMN_NAME FROM information_schema.COLUMNS 
WHERE TABLE_NAME IN ('tabAT Policy', 'tabAT Offer', 'tabAT Lead', 'tabAT Customer', 'tabAT Claim', 'tabAT Payment')
AND COLUMN_NAME NOT IN ('name', 'creation', 'modified', 'modified_by', 'owner', 'docstatus', 'parent', 'parentfield', 'parenttype', 'idx');
