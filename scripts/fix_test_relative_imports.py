import os, glob

base = '/mnt/c/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/src/domains'
fixes_total = 0

for f in glob.glob(base + '/*/pages/*.test.js'):
    with open(f, encoding='utf-8') as fh:
        content = fh.read()
    
    new_content = content
    for old, new in [
        ('../stores/', '../../../stores/'),
        ('../composables/', '../../../composables/'),
        ('../components/', '../../../components/'),
        ('../config/', '../../../config/'),
        ('../utils/', '../../../utils/'),
        ('../state/', '../../../state/'),
    ]:
        new_content = new_content.replace(old, new)
    
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(new_content)
        fixes_total += 1
        print('Fixed:', f.split('/')[-1])

# Also fix any remaining test files in old src/pages/ location
for f in glob.glob(base.replace('domains', 'pages') + '/*.test.js'):
    with open(f, encoding='utf-8') as fh:
        content = fh.read()
    
    new_content = content
    for old, new in [
        ('../stores/', '../../../stores/'),
        ('../composables/', '../../../composables/'),
    ]:
        new_content = new_content.replace(old, new)
    
    if new_content != content:
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(new_content)
        fixes_total += 1
        print('Fixed:', f.split('/')[-1])

print(f'\nTOTAL: {fixes_total} files fixed')
