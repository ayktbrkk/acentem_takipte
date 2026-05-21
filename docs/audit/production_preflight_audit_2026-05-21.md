# Prodüksiyon Öncesi Audit Raporu

Tarih: 2026-05-21  
Kapsam: `acentem_takipte` yerel repo, CI-benzeri yerel doğrulama, WSL/Bench backend doğrulaması  
İncelenen branch/commit: `main` / `aae65e944b8e07843f1c73753bfd0e445a31a73a`  
Prod notu: Bu audit canlı production üzerinde curl, login, smoke, deploy veya veri işlemi yapmadı. Production site config, canlı SMTP, Sentry ve oturumlu prod kullanıcı akışları bu raporda doğrulanmış kabul edilmez.

## 1 Sayfalık Özet

Bu turda release kararını etkileyen yerel + CI doğrulama kapıları çalıştırıldı: frontend dependency audit, lint, typecheck, unit test, production build, localization guard, Docker/Coolify compose config, GitHub Actions pin/secret-gate incelemesi, WSL Bench backend test suite, local site config ve auth-mail preflight.

Yerel + CI kapsamında yeni bir Critical/High release blocker bulunmadı. Önceki `2026-05-20` raporundaki açık F-010 auth-mail riski local `at.localhost` için değişmiş durumda: `default_outgoing_configured=true`, 2 outgoing-enabled hesap ve 1 default outgoing hesap görünüyor. Buna rağmen canlı prod SMTP teslimatı bu kapsamda doğrulanmadı; ayrıca local `Email Queue` içinde 1 `Not Sent` kayıt ve eski auth-mail error log kayıtları duruyor. Bu nedenle auth-mail gerçek gönderim smoke testi prod release sign-off öncesi ayrı gate olarak kalmalı.

Doğrulama özeti:

- `npm audit --json`: 0 vulnerability, 629 dependency.
- `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run build`: geçti.
- `npm run test:unit`: 88 test file, 300 test passed; Node `--localstorage-file` uyarıları non-fatal.
- `bench --site at.localhost run-tests --app acentem_takipte`: 198 test geçti, 21 skip; CSS parser warning'leri non-fatal.
- `python tools/localization_guard.py`: TR karakter, bare `frappe.throw`, eksik EN key ve placeholder mismatch sayıları 0.
- Oturumlu iş rolü `/at` smoke: local E2E `AT Agent` (`e2e.agent@local.test`) ile payments, tasks, documents, reports, policy detail, customer detail ve safe report/export akışı geçti.
- Workflow action tag taraması: `uses: ...@v[0-9]` eşleşmesi yok; gerçek workflow action'ları full SHA pinli.
- `docker compose -f docs/examples/docker-compose.coolify.example.yml config`: gerekli env değerleri verilince geçti; env verilmeden `APP_IMAGE` ve `SITE_NAME` eksikliği beklenen şekilde fail ediyor.
- Local site config: `developer_mode=0`, `maintenance_mode=0`, `pause_scheduler=0`, `allow_tests=True`, `live_reload=True`; secret değerler raporda redakte edildi.

Release kararı: Yerel repo ve CI-benzeri validation seti uygulama kodu açısından prod hazırlık eşiğini geçiyor. Ancak canlı prod doğrulaması kapsam dışı olduğu için bu rapor production deploy sign-off yerine geçmez. Prod sign-off için canlı site config, SMTP gerçek gönderim, oturumlu iş rolü smoke ve log/Sentry kontrolleri ayrıca yapılmalıdır.

## Detaylı Bulgu Matrisi

| ID | Risk | Başlık | Dosya/Satır | Kanıt | Etki | Tekrar Üretim | Önerilen Aksiyon | Önerilen Test | Durum |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F-2026-05-21-001 | Medium | Auth-mail preflight localde düzeldi, gerçek teslimat ve prod durum doğrulanmadı | `acentem_takipte/acentem_takipte/api/smoke.py:36`, önceki rapor F-010 | `default_outgoing_configured=true`, `enabled_outgoing_account_count=2`, `default_outgoing_account_count=1`; local queue içinde 1 `Not Sent`, eski reset/welcome error log kayıtları var. | Yeni kullanıcı welcome/reset akışının local config preflight'i artık geçiyor; canlı SMTP teslimatı hâlâ kanıtlanmış değil. | `wsl bash -lc 'cd ~/frappe-bench && bench --site at.localhost execute acentem_takipte.acentem_takipte.api.smoke._get_mail_delivery_preflight_payload'` | Prod deploy sign-off öncesi canlı sitede gerçek reset/welcome mail smoke ve `Email Queue` kontrolü yapın. | Mail queue status + Error Log + gerçek test inbox kontrolü. | Takip aksiyonu |
| F-2026-05-21-002 | Low | Frontend dependency güncellik borcu var, advisory yok | `frontend/package.json`, `frontend/package-lock.json` | `npm audit` 0 vulnerability; `npm outdated --json` dev/tooling paketlerinde yeni major/minor sürümler gösterdi (`eslint`, `tailwindcss`, `typescript`, `vue-router`, `vite` vb.). | Bugünkü release için güvenlik blocker değil; ileride framework/toolchain upgrade işi birikiyor. | `cd frontend; npm outdated --json` | Upgrade'leri ayrı planla, özellikle Tailwind 4 / TypeScript 6 / Vue Router 5 major geçişlerini aynı release içinde karıştırma. | Upgrade branch'inde lint/typecheck/unit/build + görsel smoke. | Takip aksiyonu |
| F-2026-05-21-003 | Low | Vitest localstorage warning'leri test çıktısını gürültülü yapıyor | `frontend/tests/setup.js`, `frontend/vitest.config.js` | Unit suite geçti ama birçok kez `Warning: --localstorage-file was provided without a valid path` çıktı. | Test sonucu güvenilirliğini bozmadı; CI log okunabilirliğini düşürüyor. | `cd frontend; npm run test:unit` | Vitest/Node localstorage config kaynağını temizleyin veya warning'i bilinçli şekilde dokümante edin. | Full unit suite warning'siz veya beklenen warning notuyla çalışmalı. | Takip aksiyonu |
| F-2026-05-21-004 | Low | Docker/Coolify örneği env olmadan config üretmiyor | `docs/examples/docker-compose.coolify.example.yml` | Env olmadan `APP_IMAGE` ve sonra `SITE_NAME` eksikliğiyle fail; `APP_IMAGE`, `SITE_NAME`, `DB_PASSWORD`, `MYSQL_ROOT_PASSWORD`, `ADMIN_PASSWORD` verilince config geçti ve healthcheck/readiness göründü. | Deploy örneği doğru env kontratıyla çalışıyor; operatör env dosyası olmadan denediğinde hata alır. | `$env:APP_IMAGE=...; $env:SITE_NAME=...; $env:DB_PASSWORD=...; $env:MYSQL_ROOT_PASSWORD=...; $env:ADMIN_PASSWORD=...; docker compose -f docs/examples/docker-compose.coolify.example.yml config` | Deploy dokümanında zorunlu env listesini net tutun. | `docker compose config` env dosyasıyla CI/preflight gate'e alınabilir. | Takip aksiyonu |
| F-2026-05-21-005 | Info | Rol/permission drift için önceki gap'ler statik olarak kapanmış görünüyor | `frontend/src/router/index.js:59`, `acentem_takipte/acentem_takipte/setup_utils.py:218`, `acentem_takipte/hooks.py:161`, `acentem_takipte/acentem_takipte/doctype/at_document/at_document.py:98`, `frontend/tests/e2e/business-role-operational-smoke.spec.js:36` | `/payments`, `/tasks`, `/at-documents`, `/reports` özel yüzeyleri incelendi. `AT Payment Installment`, `AT Task`, `AT Document` permission matrix ve hooks içinde var; scheduled report frontend call `canManageScheduledReports` guard'ı arkasında, backend `System Manager`/`Administrator` istiyor. Ek olarak local E2E `AT Agent` ile browser smoke geçti. | Önceki matrix drift riski bu snapshot'ta release blocker değil. | `E2E_BASE_URL=http://at.localhost:8000`, `E2E_BUSINESS_USER=e2e.agent@local.test`, `E2E_BUSINESS_PASSWORD=<redacted>` ile Playwright smoke. | Prod/staging'de aynı iş rolü smoke çalıştırılmalı; canlı prod bu raporda doğrulanmadı. | Role-based E2E veya staging smoke. | Kapalı / prod smoke gerekli |
| F-2026-05-21-006 | Info | Frontend unsafe HTML taraması tek bootstrap fallback noktasına indi | `frontend/src/main.js:197` | `rg -n "innerHTML|v-html|dangerously" frontend/src` yalnızca bootstrap error fallback'ini buldu; interpolated değerler sabit TR/EN mesajlardan oluşuyor. | Kullanıcı girdisiyle XSS bulgusu görülmedi. | `rg -n "innerHTML|v-html|dangerously" frontend/src` | Yeni rich-text/HTML render yüzeyi eklenirse DOMPurify veya server-side sanitization şart koşulsun. | Unit/security regression test. | Kapalı |

## Statik Risk Haritası

Bu sayımlar tek başına bulgu değildir; audit yönlendirmesi olarak kullanıldı.

| Pattern | Sayı | Yorum |
| --- | ---: | --- |
| `@frappe.whitelist` | 132 | SPA ve admin API yüzeyi geniş; auth/role/permission helper kullanımı örnek dosyalarda doğrulandı. |
| `allow_guest` | 2 | Biri `allow_guest=False`, biri DocType JSON `allow_guest_to_view: 0`; guest endpoint riski görülmedi. |
| `ignore_permissions=True` | 111 | Setup, system job, notification/accounting/report generation ve test path'lerinde yoğunlaşıyor; kullanıcı tetikli document delete gibi path'ler guard'lı incelendi. |
| `frappe.db.sql(` | 189 | Reporting/dashboard/patch/permission query yüzeyleri yoğun; raw SQL sayımı manuel review gerektiren alanları işaret ediyor. |
| `innerHTML|v-html|dangerously` | 1 | `frontend/src/main.js` bootstrap fallback; kullanıcı girdisi yok. |

## Rol ve Permission Uyumu

`docs/AT_ROLE_PAGE_PERMISSION_MATRIX.md` özel olarak tekrar kullanıldı. Bu snapshot'ta matrixte önceki yüksek öncelikli gap olarak tarif edilen `/payments`, `/tasks`, `/at-documents`, `/reports` yüzeylerinde şu kanıtlar görüldü:

- `frontend/src/router/index.js` route aileleri `ROLE_ACCOUNTANT`, `ROLE_MANAGER`, `ROLE_SYSTEM` ayrımıyla açık.
- `AT Payment Installment` ve `AT Task`, operational role permission convergence içinde yer alıyor.
- `AT Document`, operational document access ile `AT Agent`, `AT Manager`, `AT Accountant` rollerine bağlanmış.
- `hooks.py`, `AT Payment Installment`, `AT Task` ve `AT Document` için permission query ve `has_permission` wiring içeriyor.
- `AT Document` scope modeli linked policy/customer/claim/reference permission veya unlinked owner fallback üzerinden çalışıyor.
- Reports scheduled config UI, `canManageScheduledReports` false ise backend çağrısını yapmıyor; backend yine `System Manager`/`Administrator` guard'ı taşıyor.

Kalan risk: Bunlar repo ve local Bench testleriyle desteklenen sonuçlardır; canlı veritabanındaki manuel `Custom DocPerm` drift'i veya production site özel override'ları bu audit kapsamı dışında kaldı.

## DevOps / CI Değerlendirmesi

- `backend-ci.yml`, fresh Frappe v15 bench/site kurup app install + backend test suite çalıştırıyor.
- `frontend-ci.yml`, Node 20.19.0 ile `npm ci`, lint, typecheck, unit, build çalıştırıyor; E2E job'ları credential/base URL yoksa clean skip ediyor.
- `desk-free-smoke.yml`, `preflight` job ile E2E koşullarını shell seviyesinde değerlendiriyor; `job_count=0` benzeri eski gate sorunu için doğru yapı korunmuş.
- Action kullanımları full commit SHA ile pinli; `uses: ...@v[0-9]` taraması çıktı üretmedi.
- Bu audit canlı GitHub run loglarını çekmedi; workflow değerlendirmesi yerel YAML + komut eşleşmesi üzerinden yapıldı.

## Komut Çıktıları

| Komut | Çalışma Dizini | Sonuç Özeti | Önemli Çıktı / Not | Exit |
| --- | --- | --- | --- | --- |
| `git status --short --branch` | repo root | Branch ve dirty state görüldü | `## main...origin/main`; `M AGENTS.md` benden önce vardı, dokunulmadı. | 0 |
| `git rev-parse HEAD` | repo root | Snapshot commit'i | `aae65e944b8e07843f1c73753bfd0e445a31a73a` | 0 |
| `git diff --stat` | repo root | Mevcut diff | `AGENTS.md | 12 ++++++++++++`; line-ending warning. | 0 |
| `git ls-files \| rg '(^frontend/playwright-report/\|\\.env$\|__pycache__\|public/frontend)'` | repo root | Takip edilen generated/secret artefact bulunmadı | Match yok; `rg` exit 1 beklenen "no match" durumu. | 1 |
| `npm audit --json` | `frontend` | Geçti | `vulnerabilities.total: 0`; dependency total 629. | 0 |
| `npm outdated --json` | `frontend` | Güncellik borcu var | Tooling/dev paketlerinde güncellemeler var; advisory değil. | 1 |
| `npm run lint` | `frontend` | Geçti | `eslint .` hata üretmedi. | 0 |
| `npm run typecheck` | `frontend` | Geçti | `tsc --noEmit -p tsconfig.json` hata üretmedi. | 0 |
| `npm run test:unit` | `frontend` | Geçti | 88 test file, 300 test passed; Node localstorage warning'leri non-fatal. | 0 |
| `npm run build` | `frontend` | Geçti | Vite 8.0.13 build; manifest ve assets üretildi; plugin timing uyarısı non-fatal. | 0 |
| `python tools/localization_guard.py` | repo root | Geçti | Turkish-char, bare throw, missing EN key, placeholder mismatch: 0. | 0 |
| `Select-String -Path .github/workflows/*.yml -Pattern 'uses: .+@v[0-9]'` | repo root | Geçti | Match yok; action tag pin kalmadı. | 0 |
| `docker compose -f docs/examples/docker-compose.coolify.example.yml config` | repo root | Env olmadan fail | `APP_IMAGE` ve `SITE_NAME` zorunlu env eksikliği görüldü. | 1 |
| Env verilmiş `docker compose ... config` | repo root | Geçti | Backend/frontend/websocket/MariaDB/Redis healthcheck ve `service_healthy` koşulları config çıktısında var. | 0 |
| `bench --site at.localhost run-tests --app acentem_takipte` | WSL `~/frappe-bench` | Geçti | 198 test passed, 21 skipped; CSS parser warning'leri non-fatal. | 0 |
| `bench --site at.localhost execute ..._get_mail_delivery_preflight_payload` | WSL `~/frappe-bench` | Preflight geçti | `default_outgoing_configured=true`; 1 default outgoing hesap; recent queue içinde 1 `Not Sent`. | 0 |
| Redakte edilmiş `bench --site at.localhost show-config` | WSL `~/frappe-bench` | Local config incelendi | `developer_mode=0`, `maintenance_mode=0`, `pause_scheduler=0`, `allow_tests=True`, `live_reload=True`; secrets redakte. | 0 |
| `npx playwright test business-role-operational-smoke.spec.js --reporter=line` | `frontend` | Geçti | `AT Agent` ile `/at/payments`, `/at/tasks`, `/at/at-documents`, `/at/reports`, policy detail, customer detail, policy report ve XLSX export response doğrulandı. | 0 |

## Önceki Audit'e Göre Drift

- Önceki raporda backend suite `196 passed, 21 skipped` idi; bu snapshot'ta `198 passed, 21 skipped`.
- Önceki açık F-010 local mail preflight `default_outgoing_configured=false` idi; bu snapshot'ta `true`.
- Önceki dependency remediation durumu korunuyor: `npm audit` yine 0 vulnerability.
- Permission matrixte önceki yüksek öncelikli doğrudan okuma gap'leri repo dosyalarında kapanmış görünüyor.
- Canlı prod smoke ve header doğrulaması bu turda bilerek yapılmadı; önceki prod kanıtları bu raporun güncel doğrulaması sayılmamalı.

## Deferred / Doğrulanamadı

- Canlı production site config, production SMTP ve gerçek mail teslimatı.
- Sentry/monitoring konfigürasyonu ve son production error event'leri.
- Oturumlu `AT Accountant`, `AT Manager`, `AT System Manager` prod/staging browser smoke.
- Oturumlu `AT Agent` local browser smoke geçti; canlı prod/staging karşılığı doğrulanmadı.
- GitHub Actions son run logları; yerel YAML ve komut eşleşmesi doğrulandı.
- Production rate-limit ve reverse-proxy header davranışı; canlı curl yapılmadı.

## Release Kararı

Yerel + CI kapsamına göre yeni Critical/High blocker yok. Uygulama kodu, frontend build ve backend test suite bu snapshot'ta release hazırlık eşiğini geçiyor.

Yine de release sign-off için şu iki kapı ayrı kapatılmalı:

1. Prod veya staging ortamında gerçek auth-mail gönderim smoke testi.
2. Prod veya staging ortamında iş rolüyle oturumlu `/at` smoke: payments, tasks, documents, reports, policy/customer detail ve safe report/export flow.
