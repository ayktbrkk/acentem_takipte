import os

pages_dir = os.path.join(os.path.dirname(__file__), '..', 'frontend', 'src', 'pages')

files = {
    'ClaimDetail.vue':  'claim.customer_name',
    'LeadDetail.vue':   'customer.full_name',
    'OfferDetail.vue':  'customer.full_name',
    'PolicyDetail.vue': 'customer.full_name',
    'PaymentDetail.vue': 'payment.customer_name',
}

auth_import = 'import { useAuthStore } from "../stores/auth";'
i18n_import = 'import { uppercaseText } from "../utils/i18n";'

for fname, var in files.items():
    path = os.path.join(pages_dir, fname)
    content = open(path, encoding='utf-8').read()

    # 1. Add uppercaseText import after useAuthStore import (only once)
    if i18n_import not in content:
        content = content.replace(
            auth_import,
            auth_import + '\n' + i18n_import,
            1
        )

    # 2. Replace hardcoded toLocaleUpperCase('tr-TR')
    old_str = f"({var} || \"?\").charAt(0).toLocaleUpperCase('tr-TR')"
    new_str = f"uppercaseText(({var} || \"?\").charAt(0), activeLocale)"
    content = content.replace(old_str, new_str, 1)

    open(path, 'w', encoding='utf-8').write(content)
    print(f'Updated: {fname}')
