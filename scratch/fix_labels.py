import re
import os

path = r'c:\Users\Aykut\Documents\GitHub\acentem_takipte\frontend\src\config\quickCreate\registry.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

def replacer(match):
    original = match.group(1)
    mapping = {
        'Insurance Branch': 'branch',
        'Carrier Policy Number': 'carrier_policy_no',
        'Source Offer': 'source_offer',
        'Customer Type': 'customer_type',
        'Sales Entity': 'sales_entity',
        'Insurance Company': 'insurance_company',
        'Status': 'status',
        'Issue Date': 'issue_date',
        'Start Date': 'start_date',
        'End Date': 'end_date',
        'Currency': 'currency',
        'Gross Premium': 'gross_premium',
        'Net Premium': 'net_premium',
        'Tax Amount': 'tax_amount',
        'Commission Amount': 'commission_amount',
        'Notes': 'notes',
        'Customer': 'customer',
        'Phone': 'phone',
        'Email': 'email',
        'Tax ID': 'tax_id',
        'Birth Date': 'birth_date',
        'Full Name': 'full_name'
    }
    
    if original in mapping:
        return f'i18nLabel("{mapping[original]}")'
    
    if ' ' in original and original[0].isupper():
        snake = original.lower().replace(' ', '_')
        return f'i18nLabel("{snake}")'
        
    return match.group(0)

content = re.sub(r'i18nLabel\([\"\'](.*?)[\"\']\)', replacer, content)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
