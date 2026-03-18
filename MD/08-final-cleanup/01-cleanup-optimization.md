# Final: Cleanup ve Optimizasyon

## Görevler

### 1. CSS Temizliği
```bash
# Kullanılmayan CSS class'ları bul
grep -r "class=" frontend/src --include="*.vue" | \
  sed 's/.*class="//; s/".*//' | \
  tr ' ' '\n' | sort | uniq > used-classes.txt

# design-system.css'deki class'larla karşılaştır
```

### 2. Unused Imports Temizliği
```bash
# Her Vue dosyasında kullanılmayan import'ları bul
# ESLint ile otomatik temizleme:
npm run lint -- --fix
```

### 3. Frappe UI Kullanım Envanteri ve Azaltma
```bash
# Mevcut Frappe UI kullanımlarını listele
grep -r "from 'frappe-ui'" frontend/src | grep -v node_modules

# Not: Bu projede frappe-ui halen aktif kullanılıyor.
# Tam kaldırma hedefleniyorsa önce sayfa/component bazlı replacement planı çıkar.
```

### 4. Consistency Audit

**Tüm sayfalar için kontrol et:**

```js
// scripts/audit-design-system-complete.js
const fs = require('fs')
const path = require('path')

function getAllVueFiles(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true })
  const files = []
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name)
    if (entry.isDirectory()) files.push(...getAllVueFiles(fullPath))
    if (entry.isFile() && fullPath.endsWith('.vue')) files.push(fullPath)
  }
  return files
}

const checks = {
  hasPageShell: /class="page-shell"/,
  hasDetailTopbar: /class="detail-topbar"/,
  usesStatusBadge: /StatusBadge/,
  usesBtnClasses: /class=".*btn /,
  usesColorTokens: /text-brand-|bg-status-/,
}

function auditFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const results = {}
  
  for (const [check, regex] of Object.entries(checks)) {
    results[check] = regex.test(content)
  }
  
  return results
}

// Ana audit fonksiyonu
function auditAll() {
  const pagesDir = path.join(__dirname, '../frontend/src/pages')
  const files = getAllVueFiles(pagesDir)
  
  const report = files.map(file => ({
    file: file.replace(pagesDir, ''),
    ...auditFile(file)
  }))
  
  // Eksik olanları raporla
  const incomplete = report.filter(r => 
    !r.hasPageShell || !r.hasDetailTopbar
  )
  
  console.log('\n📊 Design System Migration Report\n')
  console.log(`Total files: ${report.length}`)
  console.log(`Complete: ${report.length - incomplete.length}`)
  console.log(`Incomplete: ${incomplete.length}\n`)
  
  if (incomplete.length > 0) {
    console.log('❌ Files needing attention:\n')
    incomplete.forEach(f => {
      console.log(`  ${f.file}`)
      Object.entries(f).forEach(([key, val]) => {
        if (key !== 'file' && !val) {
          console.log(`    - Missing: ${key}`)
        }
      })
    })
  } else {
    console.log('✅ All files migrated successfully!')
  }
}

auditAll()
```

### 5. Performance Optimizasyonu

**Lazy Loading:**
```js
// router/index.js
const routes = [
  {
    path: '/policies',
    component: () => import('@/pages/PolicyList.vue')
  },
  // Tüm rotalar için lazy load
]
```

**Component Code Splitting:**
```js
// Büyük komponentler için
const ReconciliationWorkbench = defineAsyncComponent(() =>
  import('@/pages/ReconciliationWorkbench.vue')
)
```

**Image Optimization:**
```bash
# public/assets içindeki görselleri optimize et
npm install -D imagemin imagemin-mozjpeg imagemin-pngquant
```

### 6. Accessibility Düzeltmeleri

**ARIA Labels:**
```html
<!-- Butonlar -->
<button class="btn-icon" aria-label="Düzenle" title="Düzenle">
  <IconEdit />
</button>

<!-- Form alanları -->
<label for="customer-name" class="form-label">Müşteri</label>
<input id="customer-name" class="form-input" />
```

**Keyboard Navigation:**
```css
/* Focus states */
.btn:focus-visible {
  @apply ring-2 ring-brand-500 ring-offset-2;
}

.form-input:focus-visible {
  @apply ring-2 ring-brand-500;
}
```

**Color Contrast:**
```bash
# WCAG AA standardına uygun mu kontrol et
# Chrome DevTools Lighthouse kullan
```

### 7. Documentation

**Component Storybook (opsiyonel):**
```bash
npm install -D @storybook/vue3
npx storybook init
```

**Design System Guide:**
```markdown
# docs/design-system.md

## Renkler
- Brand: `text-brand-600`, `bg-brand-50`
- Status: `status-active`, `status-cancel`

## Komponentler
- StatusBadge
- DetailCard
- HeroStrip
- FieldGroup
- StepBar

## Kullanım Örnekleri
...
```

### 8. Final Testing

**Manual Testing Checklist:**
- [ ] Tüm sayfalar açılıyor
- [ ] Filtreler çalışıyor
- [ ] Sorting çalışıyor
- [ ] Forms submit oluyor
- [ ] Dialoglar açılıp kapanıyor
- [ ] Responsive mobile'da düzgün
- [ ] Dark mode (varsa) çalışıyor

**Automated Testing:**
```bash
# Unit tests
npm run test:unit

# E2E tests
npm run e2e

# Visual regression (opsiyonel)
npm run test:visual
```

**Performance Audit:**
```bash
# Lighthouse CI
npm install -D @lhci/cli
npx lhci autorun
```

### 9. Git Cleanup

**Feature Branch Temizleme:**
```bash
git branch --list "*design-system*"
# Silmek icin tek tek:
# git branch -d branch-adi
```

**Commit Mesajı Standardı:**
```
design-system: migrate [Module] [Page] to new design system

- Updated template with page-shell and detail-topbar
- Replaced Frappe UI components with custom components
- Added StatusBadge and DetailCard
- Implemented responsive layout
```

### 10. Deployment Checklist

**Production Build Test:**
```bash
npm run build
npm run preview

# Bundle size kontrolü
npm run build -- --report
```

**Environment Variables:**
```bash
# .env.production kontrol et
# API endpoints doğru mu?
```

**Cache Invalidation:**
```bash
# Yeni CSS/JS için cache temizle
# Service worker güncelle (varsa)
```

## Final Sign-Off

- [ ] Tüm modüller migrate edildi
- [ ] CSS temizliği yapıldı
- [ ] Performance acceptable
- [ ] Accessibility AA standardında
- [ ] Documentation tamamlandı
- [ ] Tests passing
- [ ] Production build başarılı
- [ ] Deployment hazır

🎉 **Design System Migration Complete!**
