# Prodüksiyon Öncesi Audit Raporu

Tarih: 2026-05-20
Kapsam: `acentem_takipte` yerel repo, remediation düzeltmeleri ve pasif local/prod URL kontrolleri
İncelenen branch/commit: `main` / `1cbed0d16d7cb0bb18387d83d708a247319f37fb`
Not: İlk planda geçen `c7a9174782171182e9ca0039e1d5030b1244c6d7` ve ilk audit snapshot'ındaki `dabbded7573b0da4e7f9ede97bc283a488b802ba` artık güncel `main` değildir. Yerel ve remote `main` remediation commit'i olan `1cbed0d16d7cb0bb18387d83d708a247319f37fb` üzerindedir.

## 1 Sayfalık Özet

İlk audit pasif/statik inceleme, dependency sorguları, test/build komutları, Bench test denemesi ve local/prod üzerinde pasif `HEAD/GET` kontrolleriyle yürütüldü. Daha sonra Frappe auth/mail akışı özelinde ek bir preflight turu yapılarak yeni kullanıcı welcome e-postası ve şifre sıfırlama e-postası da incelendi. Canlı sistemde exploit, veri değiştirme, brute force, destructive işlem veya aktif saldırı testi yapılmadı.

Remediation turu sonunda doğrulanmış Critical/High release blocker bırakılmadı. Kapatılan ana riskler:

- `get_document_context` IDOR/PII riski kapatıldı; doctype allowlist, doküman read permission kontrolü ve müşteri kimliği maskesi eklendi.
- Eksik `share_document` backend kontratı güvenli POST/read-permission/private-file guard'larıyla geri getirildi; backend suite artık çalışıyor.
- Frontend dependency audit sıfır advisory durumuna indirildi.
- Ops alert Slack/Telegram secret'ları API/UI response'larında maskeli hale getirildi; boş form submission mevcut secret'ı silmiyor.
- Nginx/Coolify örneklerine temel security header'lar eklendi.
- Docker/Coolify örneklerine backend/frontend/websocket/DB/Redis healthcheck ve `service_healthy` readiness koşulları eklendi.
- GitHub Actions gerçek workflow'ları ve Coolify örnek workflow'u full commit SHA ile pinlendi.
- Eski ve çelişkili audit artefact'ları kaldırıldı; güncel audit source-of-truth bu dosyadır.
- Ek Frappe mail preflight incelemesinde local `at.localhost` sitesinde varsayılan outgoing `Email Account` olmadığı doğrulandı; bu nedenle yeni kullanıcı welcome/reset e-postaları `Email Queue` oluşmadan `OutgoingEmailError` ile düşüyor. Bu bulgu uygulama kodundan değil site konfigürasyonundan kaynaklanıyor.

Doğrulama özeti:

- `npm audit --json`: 0 vulnerability.
- `npm run lint`, `npm run typecheck`, `npm run test:unit`, `npm run build`: geçti.
- `bench --site at.localhost run-tests --app acentem_takipte`: 196 test geçti, 21 skip.
- `docker compose -f docs/examples/docker-compose.coolify.example.yml config`: geçti.
- `git ls-files` generated/secret artifact taraması: takip edilen riskli build/cache/env artefact yok.
- `bench --site at.localhost execute acentem_takipte.acentem_takipte.api.smoke._get_mail_delivery_preflight_payload`: `default_outgoing_configured=false`; recent error log kayıtları şifre sıfırlama ve welcome mail akışının Frappe `OutgoingEmailError` ile düştüğünü doğruladı.

Prod ortamına uygulama notu: Remediation commit'i 2026-05-20 tarihinde GHCR image olarak yayınlandı ve Coolify stack'e uygulandı. Prod smoke testte `/api/method/ping` 200 döndü, `/at/` login redirect'i çalıştı ve security header'lar response'ta göründü.

## 7 Günlük Acil Aksiyon Listesi

1. Gün 1: Kapatıldı. F-008 için allowlist + permission + PII masking eklendi.
2. Gün 1: Kapatıldı. `share_document` güvenli endpoint olarak geri getirildi ve backend suite geçti.
3. Gün 1-2: Kapatıldı. `npm audit` 0 vulnerability.
4. Gün 2: Kapatıldı. Ops alert secret response'ları maskeli; UI secret input'ları boş.
5. Gün 3: Kapatıldı. Nginx/Coolify örneklerine minimum security header seti eklendi.
6. Gün 4: Kapatıldı. Sidebar testleri güncel davranışa hizalandı; unit suite geçti.
7. Gün 5: Kapatıldı. Docker/Coolify healthcheck ve readiness koşulları eklendi.
8. Gün 6: Kapatıldı. Workflow action'ları full commit SHA ile pinlendi.
9. Gün 7: Kapatıldı. Yerel release validation seti geçti; uzak prod deploy sonrası `/at/` smoke ve header kontrolü tekrar edilmeli.
10. Gün 7: Açık. Frappe `Email Account` konfigürasyonunda en az bir `default_outgoing=1` hesap tanımlanmalı; ardından yeni kullanıcı welcome mail ve `reset_password` smoke testi tekrar edilmeli.

## Detaylı Bulgu Matrisi

| ID | Risk | Başlık | Dosya/Satır | Kanıt | Etki | Tekrar Üretim | Düzeltme Önerisi | Önerilen Test | Durum |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| F-001 | High | Backend test suite başlamıyor | `api/documents.py:327`, `tests/test_documents_api.py:160` | `share_document` güvenli POST endpoint olarak eklendi; Bench full suite `Ran 196 tests ... OK`. | Backend release gate yeniden güvenilir hale geldi. | `wsl bash -lc 'cd ~/frappe-bench && bench --site at.localhost run-tests --app acentem_takipte'` | Endpoint POST/read-permission/sensitive/private-file guard'larını koruyun. | Sensitive/private file rejection ve permission testleri eklendi/geçti. | Kapalı |
| F-002 | High | Frontend dependency audit High advisory döndürüyor | `frontend/package.json`, `frontend/package-lock.json` | `npm audit --json`: `total: 0`; `frappe-ui`, `vue`, `postcss`, `vite`, `vitest`, `jsdom`, Playwright güncellendi; `dompurify` override güncellendi. | Bilinen npm advisory release blocker'ı kapandı. | `cd frontend; npm audit --json` | Upgrade seti lockfile ile korunmalı; CI audit gate kalmalı. | `npm audit`, lint, typecheck, unit, build geçti. | Kapalı |
| F-003 | Medium | Ops alert secret'ları API/UI'ye düz metin dönüyor | `api/reports.py:320`, `services/ops_alert_settings.py:63`, `AdminAlertChannelsSettings.vue:58`, `ReportsAlertChannelsSection.vue:39` | Response artık raw Slack webhook/Telegram token döndürmüyor; mask/configured alanları dönüyor; blank submit mevcut secret'ı koruyor. | Privileged browser/log/screen secret exposure riski azaltıldı. | System Manager ile alert settings load/save; password input value boş kalır. | Secret clear işlemi gerekiyorsa explicit `clear_*` flag kullanılmalı. | Backend sanitizer testi ve frontend admin alert channel testi geçti. | Kapalı |
| F-004 | Medium | Prod/local security headers eksik | `docs/examples/nginx.default.conf.coolify.example.template:16-21` | Coolify Nginx örneğine HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy eklendi ve prod response'ta doğrulandı. | Deploy edilen stack'te clickjacking/MIME/HSTS hardening sağlanır. | `curl.exe -I -L https://kipsigorta.acentemtakipte.com/at/`. | Header seti yeni deploy'larda korunmalı. | Header smoke testi prod deploy sonrası geçti. | Kapalı |
| F-005 | Medium | Frontend unit test release gate kırık | `frontend/src/components/Sidebar.test.js:58-60`, `:118-120` | Sidebar TR/EN beklentileri güncel Agent menüsüne hizalandı; `npm run test:unit`: 88 file, 292 test passed. | CI gate tekrar güvenilir. | `cd frontend; npm run test:unit` | Testler gerçek role navigation kontratını takip etmeli. | Full frontend unit suite geçti. | Kapalı |
| F-006 | Medium | Docker/Coolify healthcheck/readiness yok | `docs/examples/docker-compose.coolify.example.yml:20`, `:50`, `:66`, `:145-173` | Backend/frontend/websocket/MariaDB/Redis healthcheck ve `service_healthy` readiness koşulları eklendi; `docker compose config` geçti. | Deploy readiness ve rollback sinyali iyileşti. | `docker compose -f docs/examples/docker-compose.coolify.example.yml config` | Staging/prod restart sırasında health transition gözlenmeli. | Compose config validasyonu geçti. | Kapalı |
| F-007 | Medium | GitHub Actions tag ile pinlenmiş | `.github/workflows/*.yml`, `docs/examples/github-actions.ghcr.coolify-image.example.yml` | `uses: ...@v*` taraması gerçek workflow'larda boş; action'lar full commit SHA ile pinlendi. | Supply-chain tag hareketi riski azaltıldı. | `Select-String -Path .github/workflows/*.yml -Pattern 'uses: .+@v[0-9]'` | Dependabot action update PR akışı ayrıca eklenebilir. | Workflow tag taraması geçti. | Kapalı |
| F-008 | High | `get_document_context` doc permission olmadan PII/bağlam döndürüyor | `api/documents.py:581-640`, `tests/test_documents_api.py:205-225` | Fonksiyon doctype/docname normalize ediyor, allowlist + `assert_doc_permission(doctype, docname, "read")` çağırıyor; `tax_id` yerine `masked_tax_id` veya doc name dönüyor. | Branch dışı müşteri/poliçe/hasar bağlamı ve raw PII sızıntısı kapandı. | Login olmuş düşük yetkili kullanıcıyla yetkisiz doctype/docname çağrısı permission error döner. | Bu pattern tüm context/helper endpoint'leri için korunmalı. | Permission-before-query ve masked customer identity testleri eklendi/geçti. | Kapalı |
| F-009 | Low | Eski audit dokümanı güncel kanıtla çelişiyor | Eski `docs/AUDIT_PROGRESS.md` ve eski `docs/audit/*` raporları kaldırıldı; `docs/README.md` güncel rapora yönlendirildi. | Release kararlarında yanlış güven hissi yaratma riski azaltıldı. | `rg -n "AUDIT_PROGRESS|PRODUCTION_AUDIT_REPORT|production_health_audit" docs README.md` | Güncel audit source-of-truth olarak bu dosya kullanılmalı. | Docs link check; release checklist yeni rapora referans veriyor. | Kapalı |
| F-010 | High | Frappe auth e-postaları için varsayılan outgoing mail hesabı yok | `apps/frappe/frappe/core/doctype/user/user.py:366-488,1059`, `acentem_takipte/api/smoke.py`, `Error Log` | `Password reset email could not be sent` ve `Unable to send new password notification` trace'leri `OutgoingEmailError: Please setup default outgoing Email Account...` ile bitiyor; `inspect_mail_delivery_preflight` çıktısı `default_outgoing_configured=false`, `recent_queue=[]`. | Etkilenen sitede yeni kullanıcı onboarding ve self-service şifre sıfırlama akışı çalışmaz; hata `Email Queue` oluşmadan düşer. | `send_welcome_email=1` ile kullanıcı oluşturma veya `frappe.core.doctype.user.user.reset_password` çağrısı; ardından `Error Log` ve `Email Queue` kontrolü. | SMTP çalışır tek bir `Email Account` için `enable_outgoing=1` ve `default_outgoing=1` ayarlanmalı; deploy sonrası auth-mail smoke checklist'e eklenmeli. | `bench --site at.localhost execute acentem_takipte.acentem_takipte.api.smoke._get_mail_delivery_preflight_payload` ve gerçek kullanıcı reset/welcome smoke testi. | Açık (local doğrulandı, prod teyidi gerekli) |

## Örnek Patch Notları

### F-008: `get_document_context` permission ve PII hardening

```python
@frappe.whitelist()
def get_document_context(doctype: str, docname: str) -> dict:
    doctype = str(doctype or "").strip()
    docname = str(docname or "").strip()
    if not doctype or not docname:
        return {"record_name": docname, "customer_name": None, "customer_id": None}

    if doctype not in _ALLOWED_REFERENCE_DOCTYPES:
        frappe.throw(_("Invalid reference doctype: {0}").format(doctype), frappe.ValidationError)

    assert_doc_permission(doctype, docname, "read")

    if doctype == "AT Customer":
        row = frappe.db.get_value(
            "AT Customer",
            docname,
            ["name", "full_name", "masked_tax_id"],
            as_dict=True,
        )
        if not row:
            return {"record_name": docname, "customer_name": None, "customer_id": None}
        return {
            "record_name": row.full_name or row.name,
            "customer_name": row.full_name or row.name,
            "customer_id": row.masked_tax_id or "",
        }
```

### F-003: Secret response masking

```python
def _mask_secret(value: Any) -> str:
    secret = str(value or "").strip()
    return "" if not secret else f"****{secret[-4:]}"

def _coerce_alert_channel_payload(value: Any) -> dict[str, Any]:
    payload = dict(value or {})
    slack = str(payload.get("slack_webhook_url") or "").strip()
    telegram = str(payload.get("telegram_bot_token") or "").strip()
    chat_id = str(payload.get("telegram_chat_id") or "").strip()
    return {
        "slack_webhook_url": "",
        "telegram_bot_token": "",
        "telegram_chat_id": chat_id,
        "slack_configured": bool(slack),
        "telegram_configured": bool(telegram and chat_id),
        "slack_webhook_mask": _mask_secret(slack),
        "telegram_bot_token_mask": _mask_secret(telegram),
    }
```

### F-004: Minimum security headers

```nginx
add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
add_header X-Content-Type-Options "nosniff" always;
add_header X-Frame-Options "SAMEORIGIN" always;
add_header Referrer-Policy "strict-origin-when-cross-origin" always;
add_header Permissions-Policy "camera=(), microphone=(), geolocation=()" always;
add_header Content-Security-Policy "frame-ancestors 'self'; base-uri 'self'; object-src 'none'" always;
```

### F-006: Healthcheck örneği

```yaml
redis-cache:
  healthcheck:
    test: ["CMD", "redis-cli", "ping"]
    interval: 10s
    timeout: 5s
    retries: 10
```

## Komut Çıktıları

Bu bölüm ilk audit snapshot'ındaki ham çıktıları kanıt olarak korur. Başarısız görünen ilk snapshot kontrollerinin güncel durumu `Remediation Sonrası Komutlar` tablosunda ayrıca gösterilmiştir.

| Komut | Çalışma Dizini | Sonuç Özeti | Önemli Çıktı / Not | Exit |
| --- | --- | --- | --- | --- |
| `git status --short --branch` | repo root | Branch doğrulandı | `## main...origin/main`; son durumda `?? .dockerignore` untracked, dokunulmadı. | 0 |
| `git rev-parse HEAD` | repo root | İlk audit commit'i doğrulandı | `dabbded7573b0da4e7f9ede97bc283a488b802ba`; remediation sonrası güncel commit `1cbed0d16d7cb0bb18387d83d708a247319f37fb`. | 0 |
| `git ls-remote origin refs/heads/main` | repo root | Remote main doğrulandı | Remote `main` aynı commit. | 0 |
| `rg --files ... | Measure-Object` | repo root | Envanter | 943 dosya. | 0 |
| Risk pattern taramaları | repo root | Whitelist ve riskli pattern sayımı | `@frappe.whitelist`: 133; `allow_guest`: 2; `ignore_permissions=True`: 109; `frappe.db.sql`: 189. Sayımlar bulgu değildir, inceleme yönlendirmesidir. | 0 |
| `npm audit --json` | `frontend` | Dependency advisory | 15 total; 8 High, 7 Moderate. | non-zero |
| `npm outdated --json` | `frontend` | Güncellik | Öne çıkanlar: `frappe-ui 0.1.262 -> 0.1.278`, `postcss 8.5.6 -> 8.5.15`, `vite 5.4.21 -> latest 8.0.13`, `vue 3.5.28 -> 3.5.34`. | 0/non-zero npm davranışı |
| `npm run lint` | `frontend` | Geçti | Script banner dışında önemli hata yok. | 0 |
| `npm run typecheck` | `frontend` | Geçti | Script banner dışında önemli hata yok. | 0 |
| `npm run build` | `frontend` | İlk audit build'i geçti | İlk snapshot Vite 5.4.21 ile geçti; remediation sonrası Vite 8.0.13/Rolldown build de geçti. | 0 |
| `npm run test:unit` | `frontend` | Başarısız | 88 test file içinde 1 failed; 292 test içinde 2 failed; Sidebar TR/EN assertions. | 1 |
| `bench --site at.localhost run-tests --app acentem_takipte` | WSL `~/frappe-bench` | Başarısız | `share_document` import hatası nedeniyle testler başlamadı. | 1 |
| `curl.exe -I -L http://at.localhost:8000/at/` | repo root | Pasif local URL kontrolü | 301 login redirect, sonra 200 login; security headers görünmedi. | 0 |
| `curl.exe -I -L https://kipsigorta.acentemtakipte.com/at/` | repo root | Pasif prod URL kontrolü | İlk auditte security headers eksikti; remediation deploy sonrası HSTS, CSP, X-Frame-Options, X-Content-Type-Options, Referrer-Policy ve Permissions-Policy göründü. | 0 |
| `bench --site at.localhost show-config` | WSL bench | Local config incelendi | Secret değerler redakte edildi. `developer_mode=0`, `maintenance_mode=0`, `pause_scheduler=0`; local `allow_tests=True`, `live_reload=True` görüldü. | 0 |
| `rg -n "get_document_context|...|assert_doc_permission" ...` | repo root | F-008 doğrulandı | `get_document_context` içinde permission helper yok; aynı modülde başka endpoint kullanıyor. | 0 |
| `rg -n "allow_guest|csrf|rate_limit|..." ...` | repo root | Ek hardening geçişi | Admin job, privacy masking ve notification template özel rate limitleri var; frontend CSRF token handling mevcut; global prod rate-limit config ayrıca doğrulanmalı. | 0 |

### Remediation Sonrası Komutlar

| Komut | Çalışma Dizini | Sonuç Özeti | Önemli Çıktı / Not | Exit |
| --- | --- | --- | --- | --- |
| `npm audit --json` | `frontend` | Geçti | `vulnerabilities.total: 0`; toplam dependency: 629. | 0 |
| `npm run lint` | `frontend` | Geçti | `eslint .` hata üretmedi. | 0 |
| `npm run typecheck` | `frontend` | Geçti | `tsc --noEmit -p tsconfig.json` hata üretmedi. | 0 |
| `npm run test:unit -- Sidebar.test.js AdminAlertChannelsSettings.test.js` | `frontend` | Geçti | 2 test file, 4 test passed. | 0 |
| `npm run test:unit` | `frontend` | Geçti | 88 test file, 292 test passed; Node localstorage warning'leri non-fatal. | 0 |
| `npm run build` | `frontend` | Geçti | Vite 8/Rolldown build geçti; `manualChunks` fonksiyon formuna alındı. | 0 |
| `bench --site at.localhost run-tests --app acentem_takipte --module ...test_api_v2_aliases --module ...test_api_hardening_contracts` | WSL `~/frappe-bench` | Geçti | 14 test passed. | 0 |
| `bench --site at.localhost run-tests --app acentem_takipte` | WSL `~/frappe-bench` | Geçti | 196 test passed, 21 skipped; CSS parser warning'leri non-fatal. | 0 |
| `docker compose -f docs/examples/docker-compose.coolify.example.yml config` | repo root | Geçti | Healthcheck ve `service_healthy` koşulları config çıktısında doğrulandı; host PATH sızıntısı `$$PATH` ile önlendi. | 0 |
| `Select-String -Path .github/workflows/*.yml -Pattern 'uses: .+@v[0-9]'` | repo root | Geçti | Gerçek workflow dosyalarında tag pin kalmadı. | 0 |
| `git ls-files \| rg '(^frontend/playwright-report/...|\.env$|__pycache__)'` | repo root | Geçti | Takip edilen generated/cache/env artefact bulunmadı; `rg` match yok. | 1 |
| `python tools/localization_guard.py` | repo root | Geçti | Turkish-char, bare throw, missing en key ve placeholder mismatch sayıları 0. | 0 |
| `bench --site at.localhost execute acentem_takipte.acentem_takipte.api.smoke._get_mail_delivery_preflight_payload` | WSL `~/frappe-bench` | Başarısız preflight | `default_outgoing_configured: false`; `recent_errors` içinde `Password reset email could not be sent` ve `Unable to send new password notification`; `recent_queue` boş. | 0 |
| Prod deploy smoke | remote VPS | Geçti | `ghcr.io/ayktbrkk/acentem-worker:latest` image revision `1cbed0d...`; `/api/method/ping` 200 `pong`; `/at/` login redirect ve security headers doğrulandı. | 0 |

## Deferred / Ek Bilgi Gerektiren Alanlar

- Prod site config, prod Bench logs, Sentry/monitoring config ve CI run loglarına erişim olmadığı için prod runtime ayarları tam doğrulanamadı.
- Prod `Email Account`/SMTP ayarlarına erişim olmadığı için F-010 bulgusunun production etkisi doğrudan doğrulanamadı; sadece local `at.localhost` sitesinde yeniden üretildi.
- Coverage raporu bulunmadığı için coverage yüzdesi doğrulanamadı.
- Dependency lisans taraması transitive seviyede ayrıca çalıştırılmadı; top-level `LICENSE` MIT ve Python dependency yüzeyi sınırlı görünüyor, ancak `license-checker` veya eşdeğeriyle release pipeline'a eklenmeli.
- Canlı sistemde authenticated düşük yetkili kullanıcıyla aktif exploit denenmedi; F-008 remediation yerel backend testleri ve statik kod kanıtıyla doğrulandı.

## Release Kararı

Yerel repo, CI guard ve canlı Coolify deploy açısından bu snapshot uygulama-kodu düzeyinde prod hazırlık eşiğini geçmiştir. Remediation commit'i `1cbed0d16d7cb0bb18387d83d708a247319f37fb` uzak sunucuda çalışmaktadır. Ancak F-010 nedeniyle Frappe site mail konfigürasyonu ayrıca release gate olarak ele alınmalıdır: etkilenen sitede varsayılan outgoing `Email Account` tanımlanmadan yeni kullanıcı onboarding ve self-service şifre sıfırlama akışı hazır kabul edilmemelidir. Canlı sistemde destructive işlem yapılmamış, deploy öncesi backup alınmış ve deploy sonrası ping/login/header smoke testleri geçmiştir.
