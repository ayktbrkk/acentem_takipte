import os, glob

base = '/mnt/c/Users/Aykut/Documents/GitHub/acentem_takipte/frontend/src/domains'
for f in glob.glob(base + '/*/pages/*.vue'):
    with open(f, encoding='utf-8') as fh:
        content = fh.read()
    if '../pinia' in content:
        content = content.replace('../pinia', '../../../pinia')
        with open(f, 'w', encoding='utf-8') as fh:
            fh.write(content)
        print('Fixed:', os.path.basename(f))
print('DONE')
