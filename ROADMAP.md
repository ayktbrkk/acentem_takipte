# Acentem Takipte - Yol Haritasi (2026-03-16)

Bu dokuman, projeyi "calisiyor" seviyesinden "urunlesmis ve bakimi kolay" seviyesine tasimak icin
kalite kapilari, deploy sozlesmesi ve operasyonel olgunluk basliklarini netlestirir.

## Ilkeler

- Tek resmi Node surumu politikasi: Node.js 20+.
- Frontend build artifact'lari deploy sirasinda uretilir ve repoya commit edilmez.
- CI kalite kapilari: deterministik install (`npm ci`), lint, typecheck, unit test, build.
- E2E: her PR'da tum suite degil; en azindan smoke suite (ortam degiskenleri varsa).
- Scheduler/job'lar: idempotent olacak sekilde tasarlanir; hata ve tekrar calistirma stratejisi belgelidir.

## Oncelikli Milestone'lar

### M0 - Repo Hijyeni ve CI Sertlestirme

- Track edilmis artifact ve developer-local klasorlerini repodan cikart:
  - `frontend/playwright-report/`
  - `.playwright-cli/`, `.vscode/`, `.plan/`
- Frontend CI:
  - Node 20
  - `npm ci`
  - `npm run lint`
  - `npm run typecheck`
  - `npm run test:unit`
  - `npm run build`
  - Opsiyonel: `npm run e2e:smoke:ci`
- Vitest: test yoksa CI'da fail.

### M1 - Deploy Sozlesmesi

- README'de tek cumlelik sozlesme:
  - "Frontend build artifact'lari deployment sirasinda uretilir ve repoya commit edilmez."
- Deploy adimlari:
  - `frontend/` icinde `npm ci && npm run build`
  - `bench --site <site> clear-cache`
  - `bench restart`

### M2 - Operasyonel Olgunluk

- Scheduler/job'lar icin:
  - loglama standardi (success/failure, duration, payload ozeti)
  - idempotency kontrolu (aynı run'in tekrarinda zarar vermeme)
  - duplicate execution onleme (lock/flag)
  - retry/backoff stratejisi
  - alerting (en azindan e-posta veya webhook)

### M3 - Guvenlik ve Yetki Modeli

- Permission / has_permission / query conditions icin:
  - "kim, neyi gorebilir?" dokumani
  - kritik endpoint'ler icin test veya contract check

## Definition of Done (Release icin minimum)

- CI tam yesil (lint/typecheck/unit/build + smoke e2e kosullari net).
- README kurulumu 0'dan takip edilince calisiyor (Linux server + bench).
- Deploy sonrasi `/at` aciliyor ve temel akislarda kritik hata yok.
- Scheduler job failure durumunda izlenebilirlik var (log + tekrar calistirma proseduru).

