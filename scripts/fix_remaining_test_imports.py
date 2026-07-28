import os

base = '/mnt/c/Users/Aykut/Documents/GitHub/acentem_takipte/acentem_takipte/acentem_takipte/tests'
fixes = {
    'test_campaigns.py': ('from acentem_takipte.acentem_takipte.domains.communications.services.campaigns import campaigns as campaigns_service', 'import acentem_takipte.acentem_takipte.domains.communications.services.campaigns as campaigns_service'),
    'test_segments.py': ('from acentem_takipte.acentem_takipte.domains.communications.services.segments import segments as segments_module', 'import acentem_takipte.acentem_takipte.domains.communications.services.segments as segments_module'),
    'test_offer_office_branch.py': ('from acentem_takipte.acentem_takipte.doctype.at_offer import at_offer as offer_module', 'import acentem_takipte.acentem_takipte.doctype.at_offer as offer_module'),
    'test_sales_entity_pool_rules.py': ('from acentem_takipte.acentem_takipte.doctype.at_sales_entity import at_sales_entity as module', 'import acentem_takipte.acentem_takipte.doctype.at_sales_entity as module'),
}

for filename, (old, new) in fixes.items():
    path = os.path.join(base, filename)
    with open(path, encoding='utf-8') as f:
        content = f.read()
    if old in content:
        content = content.replace(old, new)
        with open(path, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f'Fixed: {filename}')
print('DONE')
