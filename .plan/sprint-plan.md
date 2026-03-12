# Haftalik Sprint Plani

## 2026-03-11 Guncel Sprint Durumu

- **Aktif dalga:** 7
- **Aktif faz:** yok (kapanis)
- **Son tamamlanan faz:** 372
- **Son tamamlanan teslimler:**
  - scheduled report ve reporting export kontrati
  - raporlama API regression hardening
  - Faz 16 smoke checklist dokumani
  - test kosum sirasi kararinin yazilmasi
  - guest/auth blokaj dogrulama akisi
  - `run_customer_segment_snapshot_job` admin job endpointi, servis erişim matrisi ve API kontratı
- **Son kapanis kaydi:** 2026-03-11 - Faz 24 preset discoverability ozetleri ile kapatildi.
- **Sonraki adim:** yeni issue secimi veya yeni uygulama dalgasi
- **Yeni ilerleme:** 2026-03-11 - dashboard read endpointleri frontend fetch policy ile `GET`e hizalandi; backend method guard ve hardening kontrati eklendi.
- **Yeni ilerleme:** 2026-03-11 - dashboard workbench OR-count fallbacklari aggregate count'a indirildi; benchmark script kapsam hatasi temizlendi.
- **Yeni ilerleme:** 2026-03-11 - dashboard benchmark script'i threshold/violation cikisi uretecek sekilde guclendirildi; karar mantigi unit test ile sabitlendi.
- **Yeni ilerleme:** 2026-03-11 - benchmark JSON rapor ciktilari workspace-ici `.json` ile sinirlandi; output path guard testi eklendi.
- **Yeni ilerleme:** 2026-03-12 - Faz 41 icinde reports runtime export alias MIME kapsami, locale-aware tabular title fallback, nullish filter normalize ve branch-policy request cache tamamlandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 42 icinde report title katalog parity'si ve scheduled report format normalizasyonu runtime helper'a hizalandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 43 icinde list export query parse hardening ve tam-locale label fallback kapsami tamamlandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 44 icinde list export permission_doctypes normalize akisi comma-separated ve invalid-json fallback ile sertlestirildi.
- **Yeni ilerleme:** 2026-03-12 - Faz 45 / Issue: List Export Permission Contract Hardening icinde bos permission doctype ile arbitrary tabular export kapatildi.
- **Yeni ilerleme:** 2026-03-12 - Faz 46 / Issue: Report Payload Limit Contract Hardening icinde report registry limit normalize akisi `cint` ile runtime'a hizalandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 47-51 / Issue serisi: tabular export kolon inference, kolon tekillestirme, filter shape hardening, screen query shape hardening ve row collection hardening tamamlandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 52-61 / Issue serisi: title normalize, kolon string input, query/filter JSON coercion, dashboard row payload hardening, boolean token genislemesi ve dict serialize fallback tamamlandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 62-71 / Issue serisi: reports runtime payload coercion, scheduled config parse hardening, locale/title trim ve export key fallback kapsami tamamlandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 72-81 / Issue serisi: report export filename/title trim, PDF/XLSX render input coercion ve workbook/html payload hardening tamamlandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 82-106 / Issue serisi: scheduled report normalize-dispatch hygiene ve export/runtime string coercion kontratlari tamamlandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 107-126 / Issue serisi: scheduled report locale/status persistence, config load-save hijyeni ve export/runtime row-title coercion kontratlari tamamlandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 127-146 / Issue serisi: scheduled report config sanitize/save hijyeni, locale-aware render dispatch ve runtime export/report key trim kontratlari tamamlandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 147-166 / Issue serisi: reports API payload-summary-download coercion ve scheduled report API parity kontratlari tamamlandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 167-186 / Issue serisi: reports API summary item normalize, content-type/filecontent fallback ve kalan payload guard kontratlari tamamlandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 187-206 / Issue serisi: export-list-report ortak normalize helper konsolidasyonu rapor/scheduled/api katmanlarinda tamamlandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 207-226 / Issue serisi: list export katmani ortak helper'a tasindi ve sprint plandaki tarihsel acik kutular gercek durumla temizlendi.
- **Yeni ilerleme:** 2026-03-12 - Faz 227-246 / Issue serisi: list export API payload/download guard kontratlari reports API seviyesine yaklastirildi.
- **Yeni ilerleme:** 2026-03-12 - Faz 247-266 / Issue serisi: reports API getter/export payload guard ve scheduled mutation response parity kontratlari tamamlandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 267-286 / Issue serisi: sprint-plan/backlog/README/ROADMAP/dalga-1 ust bloklari sadeleştirildi, aktif odak tek hatta indirildi ve tarihsel gurultu arsiv notu seviyesine cekildi.
- **Yeni ilerleme:** 2026-03-12 - Faz 287-306 / Issue serisi: plan dosyalarinda arsiv okuma kurali ortaklastirildi ve aktif odak tek satirli operasyon ozeti ile sabitlendi.
- **Yeni ilerleme:** 2026-03-12 - Faz 307-326 / Issue serisi: release hardening blogu, checklist, kabul kriteri ve sonraki teknik bloklar tanimlandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 327-346 / Issue: Release Hardening Checklist Uygulamasi icinde reports/list export ortak download guard helper'a cekildi, scheduled report summary-mutation fallback bosluklari kapatildi ve release smoke taslagi aktif sonraki adim olarak acildi.
- **Yeni ilerleme:** 2026-03-12 - Faz 347-366 / Issue: Release Smoke Checklist Draft icinde minimum manuel release kapisi yazildi ve auth/reports/export/scheduled/list export kritik kontrol basliklari tek checklist'te toplandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 367-371 / Issue serisi: locale normalize helper, export format helper parity, scheduled summary channel alias, scheduled mutation channel alias ve scheduled config format parity tamamlandi.
- **Yeni ilerleme:** 2026-03-12 - Faz 372 / Issue: Release Final Parity ve Kapanis Notu tamamlandi; aktif release checklist maddeleri kapatildi, plan ust bloklari kapanis durumuna cekildi.
- **Not:** Asagidaki haftalik plan baseline niteligindedir; guncel operasyon durumu bu bloktan okunur.

## 2026-03-12 Faz 41 Kapanis

- [x] Reports runtime export format normalize MIME ve `xlsb` aliaslari ile genisletildi.
- [x] Tabular export baslik cozumlemesi tam locale (`tr-TR`) ve base locale fallback sirasi ile sertlestirildi.
- [x] Reporting filter normalize akisi `null`/`none` stringlerini bos deger gibi ele alacak sekilde guncellendi.
- [x] Payment report branch-policy lookup ayni request icinde cache'lenir hale getirildi.
- [x] Faz 41 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 42 Kapanis

- [x] Report title katalogu communication/reconciliation/claims operations raporlarini da kapsar hale getirildi.
- [x] `build_report_title(...)` tam locale ve base locale fallback sirasi ile sertlestirildi.
- [x] Scheduled report config summary/normalize/dispatch format akisi runtime export normalize helper'i ile tek kaynak haline getirildi.
- [x] Faz 42 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 43 Kapanis

- [x] List export query parse akisi invalid JSON icin bos payload fallback'i ile sertlestirildi.
- [x] List export label lokalizasyonu tam locale -> base locale -> `en` sirasi ile hizalandi.
- [x] Tabular payload export akisi invalid JSON durumunda guvenli default payload ile calisir hale getirildi.
- [x] Faz 43 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 44 Kapanis

- [x] List export permission doctype normalize akisi comma-separated string girdiyi destekler hale getirildi.
- [x] Invalid permission doctype JSON fallback davranisi patlamadan calisacak sekilde sertlestirildi.
- [x] Permission doctype listesi tekrar eden girdileri tekilleştirir hale getirildi.
- [x] Faz 44 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 45 Kapanis

- [x] Issue: List Export Permission Contract Hardening acildi.
- [x] `export_tabular_payload(...)` en az bir permission doctype zorunlulugu ile sertlestirildi.
- [x] Bos izin listesi durumunda export akisi kontrollu hata verir hale getirildi.
- [x] Faz 45 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 46 Kapanis

- [x] Issue: Report Payload Limit Contract Hardening acildi.
- [x] `report_registry.build_report_payload(...)` limit normalize akisi `cint` tabanli hale getirildi.
- [x] Non-numeric ve string limit girdileri icin kontrat test ile sabitlendi.
- [x] Faz 46 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 47 Kapanis

- [x] Issue: Tabular Export Column Inference acildi.
- [x] Kolon listesi verilmediginde tabular export ilk gecerli row setinden kolon cikarir hale getirildi.
- [x] Faz 47 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 48 Kapanis

- [x] Issue: Tabular Export Column Deduplication acildi.
- [x] Tabular export kolon listesi trim + duplicate temizligi ile normalize edilir hale getirildi.
- [x] Faz 48 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 49 Kapanis

- [x] Issue: Tabular Export Filter Shape Hardening acildi.
- [x] Tabular payload export icinde dict-disindaki filter degerleri bos filtreye dusuruldu.
- [x] Faz 49 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 50 Kapanis

- [x] Issue: Screen Export Query Shape Hardening acildi.
- [x] Screen export doctype query akisi invalid `filters` ve `or_filters` shape'lerini kontrollu sekilde dislar hale getirildi.
- [x] Faz 50 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 51 Kapanis

- [x] Issue: Tabular Export Row Collection Hardening acildi.
- [x] Tabular payload export icinde list/tuple disindaki row payload'lari bos row setine dusuruldu.
- [x] Faz 51 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 52-61 Kapanis

- [x] Issue: Tabular Export Title Normalize ile bos title degeri `export_key` fallback'ine baglandi.
- [x] Issue: Tabular Export Column String Input ile comma-separated kolon girdisi desteklendi.
- [x] Issue: Tabular Export JSON Filter Coercion ile JSON string filtreler dict'e donusturuldu.
- [x] Issue: Screen Export JSON Filter Coercion ile screen export `filters` ve `or_filters` icin JSON string parse destegi eklendi.
- [x] Issue: Dashboard Row Payload Guard ile non-dict payload erken sonlandirilir hale getirildi.
- [x] Issue: Dashboard Row Shape Guard ile non-dict row kayitlari filtrelendi.
- [x] Issue: Boolean Formatter Token Expansion ile `on` / `evet` gibi tokenler desteklendi.
- [x] Issue: Payload Dict Serialize Fallback ile `frappe.as_json(...)` hata verirse string fallback eklendi.
- [x] Faz 52-61 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 62-71 Kapanis

- [x] Issue: Report Download Full Locale, Tabular Title Trim, Download Payload Coercion, Scheduled Config Parse Hardening ve Export Key Fallback issue serisi tamamlandi.
- [x] `build_report_download_response(...)` tam locale ile `build_report_title(...)` zincirine hizalandi.
- [x] Download response icinde columns/rows/filters coercion helper'lari eklendi.
- [x] Scheduled report save akisi invalid veya non-dict JSON config icin bos payload fallback'i ile sertlestirildi.
- [x] `build_report_title(...)` ve `build_export_filename(...)` trim/fallback davranislari sertlestirildi.
- [x] Faz 62-71 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 72-81 Kapanis

- [x] Issue: Report Export Filename Trim ve Report Title Locale Trim issue'lari tamamlandi.
- [x] Issue: PDF/XLSX Render Input Coercion ile title/columns/rows/filters shape guard eklendi.
- [x] Issue: Workbook Payload Hardening ile XLSX satir/sutun yazimi yalnizca gecerli kolon ve row seti uzerinden calisir hale getirildi.
- [x] Faz 72-81 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 82-106 Kapanis

- [x] Issue: Scheduled Report Recipient Normalize, Filter Coercion, Frequency/Channel Normalize ve Schedule Clamp issue serisi tamamlandi.
- [x] Issue: Scheduled Dispatch Recipient/Filter Normalize ile dispatch akisinda string recipients ve JSON filters desteklendi.
- [x] Issue: Report Export/Runtime String Column ve JSON Filter Coercion issue serisi tamamlandi.
- [x] Faz 82-106 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 107-126 Kapanis

- [x] Issue: Scheduled Report Locale Persistence, Last Status Normalize ve Last Summary JSON Coercion issue serisi tamamlandi.
- [x] Issue: Scheduled Config Load/Save Report Key Trim ve Dispatch Locale-aware Title davranisi tamamlandi.
- [x] Issue: Report Export/Runtime Mapping Row Coercion, Safe Title Trim ve Safe Filter Build kontratlari tamamlandi.
- [x] Faz 107-126 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 127-146 Kapanis

- [x] Issue: Scheduled Report Config Sanitize on Load/Save ve Soft Runtime Normalize issue serisi tamamlandi.
- [x] Issue: Scheduled Dispatch Locale-aware XLSX/PDF Render davranisi tamamlandi.
- [x] Issue: Reports Runtime Report Key Trim ve Export Key Fallback sertlestirmesi tamamlandi.
- [x] Faz 127-146 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 147-166 Kapanis

- [x] Issue: Reports API Filter/Index Coercion ve Summary Shape Guard issue serisi tamamlandi.
- [x] Issue: Report Download Response Payload Guard ve Scheduled Report API parity kontratlari tamamlandi.
- [x] Kaldigimiz yer `Faz 167`; sonraki odak export/list ortak normalize helper konsolidasyonu veya yeni API hardening blogu.
- [x] Faz 147-166 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 167-186 Kapanis

- [x] Issue: Reports API Summary Item Normalize ve Total Guard issue serisi tamamlandi.
- [x] Issue: Download payload content-type, filecontent ve filename-extension fallback kontratlari tamamlandi.
- [x] Kaldigimiz yer `Faz 187`; sonraki odak export-list-report ortak normalize helper konsolidasyonu.
- [x] Faz 167-186 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 187-206 Kapanis

- [x] Issue: Export Payload Utils ortak helper katmani olusturuldu.
- [x] Issue: Reports Runtime, Report Exports, Scheduled Reports ve Reports API tekrar eden columns/rows/filters/string-list/content-type normalize mantigi tek kaynaga cekildi.
- [x] Kaldigimiz yer `Faz 207`; sonraki odak list export katmanina ortak helper gecisi veya yeni reporting API hardening blogu.
- [x] Faz 187-206 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 207-226 Kapanis

- [x] Issue: List Export ortak normalize helper gecisi tamamlandi.
- [x] Issue: List export API limit ve permission_doctype normalize akisi ortak helper ile hizalandi.
- [x] Sprint plandaki tarihsel acik kutular gercek durumla temizlendi; aktif kalan odak `Faz 227` olarak guncellendi.
- [x] Faz 207-226 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 227-246 Kapanis

- [x] Issue: List export API screen payload guard kontratlari tamamlandi.
- [x] Issue: List export download payload content-type/filecontent fallback kontratlari tamamlandi.
- [x] Kaldigimiz yer `Faz 247`; sonraki odak reporting API hardening veya roadmap/backlog sadeleştirme turu.
- [x] Faz 227-246 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 247-266 Kapanis

- [x] Issue: Reports API getter/export payload shape guard kontratlari tamamlandi.
- [x] Issue: Scheduled report mutation response parity ve numeric clamp kontratlari tamamlandi.
- [x] Kaldigimiz yer `Faz 267`; sonraki odak roadmap-backlog sadeleştirme veya yeni release hardening blogu.
- [x] Faz 247-266 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 267-286 Kapanis

- [x] Issue: Sprint plan ust durum blogu sadeleştirildi.
- [x] Issue: Backlog ve roadmap aktif faz/durum bloglari tek cizgi mantigina indirildi.
- [x] Issue: Tarihsel tekrarlar aktif takip bilgisinden ayrildi.
- [x] Kaldigimiz yer `Faz 287`; sonraki odak yeni release hardening blogu veya plan arsivleme turu.
- [x] Faz 267-286 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 287-306 Kapanis

- [x] Issue: Arsiv okuma kurali sprint/backlog/README/ROADMAP/dalga-1 dosyalarinda ortak dile cekildi.
- [x] Issue: Aktif odak ifadesi tek satirli operasyon ozetine indirildi.
- [x] Kaldigimiz yer `Faz 307`; sonraki odak release hardening blogu tanimi.
- [x] Faz 287-306 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 307-326 Kapanis

- [x] Issue: Release hardening blogu tanimlandi.
- [x] Issue: Asgari checklist; auth, export, scheduled report, list export ve fallback response alanlari ile yazildi.
- [x] Issue: Kabul kriteri ve sonraki teknik bloklar netlestirildi.
- [x] Kaldigimiz yer `Faz 327`; sonraki odak release hardening checklist uygulama blogu.
- [x] Faz 307-326 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## Faz 327 Baslangic - Release Hardening Checklist

- [x] Reports API ve List Export API icin ortak response guard checklist uygulamasi
- [x] Scheduled report config/load-save akislarinda son fallback bosluklarinin kapanisi
- [x] Export/download response icin filename/content-type/filecontent parity turu
- [x] Release notu icin minimum smoke checklist taslagi

## 2026-03-12 Faz 327-346 Kapanis

- [x] Issue: Release Hardening Checklist Uygulamasi acildi.
- [x] `export_payload_utils.coerce_download_payload(...)` ile reports ve list export API download response guard'lari tek kaynaga cekildi.
- [x] `reports_runtime` icinde scheduled report summary ve save/remove mutation fallback bosluklari normalize helper'lari ile kapatildi.
- [x] Test kontratlari export payload utils ve reports runtime seviyesinde genisletildi.
- [x] Kaldigimiz yer `Faz 347`; sonraki odak release smoke checklist taslagi ve final parity turu.
- [x] Faz 327-346 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 347-366 Kapanis

- [x] Issue: Release Smoke Checklist Draft acildi.
- [x] Minimum release smoke checklist ayri plan dosyasina tasindi.
- [x] Auth gate, reports payload, report export, list export, scheduled reports ve lokalizasyon kritik basliklari checklist'e sabitlendi.
- [x] `/.plan/release-smoke-checklist.md` aktif release kapisi referansi olarak kayda gecti.
- [x] Kaldigimiz yer `Faz 367`; sonraki odak final API-export parity turu.
- [x] Faz 347-366 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 367-371 Kapanis

- [x] Issue: Locale Normalize Helper acildi.
- [x] Issue: Export Format Helper Parity acildi.
- [x] Issue: Scheduled Summary Channel Alias Hardening acildi.
- [x] Issue: Scheduled Mutation Channel Alias Hardening acildi.
- [x] Issue: Scheduled Config Format Parity acildi.
- [x] `export_payload_utils` icine `coerce_locale(...)` ve `coerce_export_format(...)` eklendi.
- [x] `reports_runtime` locale ve format normalize davranisini ortak helper'a bagladi; scheduled summary/mutation `delivery_channel` alias'ini kabul eder hale geldi.
- [x] Kaldigimiz yer `Faz 372`; sonraki odak release final parity ve kapanis notu.
- [x] Faz 367-371 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-12 Faz 372 Kapanis

- [x] Issue: Release Final Parity ve Kapanis Notu tamamlandi.
- [x] Aktif release checklist, helper parity ve scheduled/export/runtime kapanis zinciri birlikte kontrol edildi.
- [x] Guncel plan ust bloklarinda aktif faz kapatildi ve durum `yok (kapanis)` olarak sabitlendi.
- [x] Arsivde gorunen acik kutularin tarihsel not oldugu teyit edildi; aktif takipte acik madde kalmadi.
- [x] Faz 372 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## Arsiv Notu

- Bu dokumanin alt kisimlari tarihsel teslim kaydidir.
- Guncel yon bilgisi yalnizca ustteki `Guncel Sprint Durumu` blogundan okunmalidir.


## Planlama Cercevesi

- **Baslangic:** 9 Mar 2026
- **Bitis:** 7 Agu 2026
- **Toplam:** 22 hafta
- **Toplam efor:** 476 saat
- **Gunluk kapasite:** 4-6 saat

## Mevcut Konum

- **Su an:** Faz 25 uygulama turu icin preset discoverability JSON cikisina gecildi.
- **Oncelik:** preset kesfini scriptlenebilir JSON formatinda da sunmak.
- **Bugunku odagimiz:** `--list-presets-json` ve katalog JSON kontrati.

## 2026-03-11 Faz 18 Kapanis

- [x] Dashboard read endpoint method policy backend seviyesinde zorunlu hale getirildi.
- [x] Frontend fetch policy dashboard read cagrilarini bilincli `GET` davranisina hizaladi.
- [x] Workbench `or_filters` sayim fallback'lari aggregate count modeline indirildi.
- [x] Dashboard benchmark script'i threshold, workspace-output guard ve karar mantigi ile sertlestirildi.
- [x] Faz 18 kapanis kanitlari sprint/roadmap/backlog/README ile esitlendi.

## 2026-03-11 Faz 19 Baslangic

- [x] Dashboard benchmark script'ine scenario secimi (`--scenarios`) eklendi.
- [x] Scenario filtreleme kontrati unit test ile sabitlendi.
- [x] Benchmark preset JSON dosyalari ve iki dilli kullanim notu eklendi.
- [x] Benchmark CLI akisina `--preset default` destegi eklendi.
- [x] Benchmark artefact ciktilari icin standart output klasoru ve `--artifact-name` destegi eklendi.
- [x] Benchmark preset/artefact kullanim notu ile kapanis dokumani hazirlandi.

## 2026-03-11 Faz 19 Kapanis

- [x] Benchmark araci scenario bazli parcali kosum destekler hale geldi.
- [x] Preset, kullanim notu ve artefact output dizini repoya baglandi.
- [x] CLI `--preset default` ve `--artifact-name` ile operasyonel benchmark akisi tamamlandi.
- [x] Faz 19 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-11 Faz 20 Baslangic

- [x] Benchmark script'e `--list-presets` destegi eklendi.
- [x] JSON rapora `preset` ve `scenarios` meta alanlari eklendi.
- [x] Preset discoverability ve parse kontrati unit test ile sabitlendi.
- [x] Faz 20 kapanis notu ve sonraki uygulama fazi acildi.

## 2026-03-11 Faz 20 Kapanis

- [x] Preset discoverability `--list-presets` ile acildi.
- [x] JSON benchmark raporu `preset` ve `scenarios` metadata'si ile standardize edildi.
- [x] Faz 20 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-11 Faz 21 Baslangic

- [x] `--artifact-name` kullanildiginda Markdown benchmark ozeti uretilir hale geldi.
- [x] Markdown artefact path ve icerik kontrati unit test ile sabitlendi.
- [x] Faz 21 kapanis notu ve sonraki uygulama fazi acildi.

## 2026-03-11 Faz 21 Kapanis

- [x] Benchmark artefact ciktilari insan-okunur Markdown ozet raporu ile genisletildi.
- [x] Markdown path ve icerik kontrati test altina alindi.
- [x] Faz 21 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-11 Faz 22 Baslangic

- [x] `--preset default` varsayilan p95/p99 threshold degerlerini de yukler hale geldi.
- [x] JSON ve Markdown benchmark raporuna threshold metadata'si eklendi.
- [x] Preset threshold kontrati unit test ile sabitlendi.
- [x] Faz 22 kapanis notu ve sonraki uygulama fazi acildi.

## 2026-03-11 Faz 22 Kapanis

- [x] Preset akisi threshold baseline tasir hale geldi.
- [x] Threshold metadata'si JSON ve Markdown artefact'lara yazildi.
- [x] Faz 22 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-11 Faz 23 Baslangic

- [x] `quick`, `default`, `full` benchmark preset katalogu tanimlandi.
- [x] Preset listeleme ve threshold kontrati unit test ile guncellendi.
- [x] Faz 23 kapanis notu ve sonraki uygulama fazi acildi.

## 2026-03-11 Faz 23 Kapanis

- [x] Benchmark preset katalogu `quick/default/full` olarak genisletildi.
- [x] Preset threshold davranisi test altina alindi.
- [x] Faz 23 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-11 Faz 24 Baslangic

- [x] `--list-presets` cikisi threshold ve aciklama ozeti verir hale geldi.
- [x] Preset summary helper kontrati unit test ile sabitlendi.
- [x] Faz 24 kapanis notu ve sonraki uygulama fazi acildi.

## 2026-03-11 Faz 24 Kapanis

- [x] `--list-presets` cikisi preset threshold ve aciklama ozeti verir hale geldi.
- [x] Preset summary helper kontrati test altina alindi.
- [x] Faz 24 kapanis kanitlari sprint/roadmap/backlog/README/dalga-1 ile esitlendi.

## 2026-03-11 Faz 25 Baslangic

- [x] `--list-presets-json` destegi eklendi.
- [x] Tum preset ozetleri icin katalog helper'i eklendi.
- [x] JSON preset discoverability kontrati unit test ile sabitlendi.
- [x] Faz 25 kapanis notu ve sonraki uygulama fazi acildi; tarihsel plan kutusu kapatildi.

- **Yeni ilerleme:** 2026-03-11 - benchmark preset JSON dosyalari ve `scripts/benchmark_dashboard_api.md` kullanim notu eklendi.
- **Yeni ilerleme:** 2026-03-11 - benchmark script preset dosyalarini `--preset default` ile otomatik yukler hale getirildi; preset kontrati unit test ile sabitlendi.
- **Yeni ilerleme:** 2026-03-11 - benchmark artefact ciktilari `scripts/benchmark_presets/output/` altina standardize edildi; `--artifact-name` eklendi.
- **Yeni ilerleme:** 2026-03-11 - benchmark preset kesfi (`--list-presets`) ve JSON rapor metadata'si (`preset`, `scenarios`) eklendi.
- **Yeni ilerleme:** 2026-03-11 - benchmark artefact akisi Markdown ozet raporu ile genisletildi.
- **Yeni ilerleme:** 2026-03-11 - benchmark preset baseline'i varsayilan p95/p99 threshold degerlerini de tasir hale getirildi.
- **Yeni ilerleme:** 2026-03-11 - benchmark preset katalogu `quick/default/full` olarak genisletildi.
- **Yeni ilerleme:** 2026-03-11 - benchmark preset kesfi threshold + aciklama ozetiyle zenginlestirildi.
- **Yeni ilerleme:** 2026-03-11 - benchmark preset kesfi JSON katalog cikisi ile scriptlenebilir hale getirildi.

## 2026-03-11 Faz 16 Kapanis Notu

- [x] Faz 16 plan seviyesi `plan` / `sprint` / `README` / `backlog` ile eşitlenerek kapatildi.
- [x] Faz 16 kapanış eylemleri için teslim kanitlari (e2e auth + rapor + scheduled access gate) doğrulandı.
- [x] Faz 16 sonrası bir sonraki odak Faz 17 başlatıldı.

## 2026-03-11 Faz 17 Kapanis Taslak

- [x] `run_customer_segment_snapshot_job` için role-gated e2e testleri tamamlandi.
- [x] Snapshot admin job için GET-POST method kısıtı ve payload doğrulaması e2e tarafında tamamlandi.
- [x] `api/admin_jobs.py` hardening akışında snapshot job izni ve limit doğrulama kontratları tamamlandi.
- [x] Raporda segment snapshot tetikleme butonu davranışı unit testle kapsandi.
- [x] Faz 16 ve Faz 17 kapanış kanitlari plan/roadmap/backlog/README’de eşitlendi.

## 2026-03-11 Faz 17 Kapanis

- [x] Plan/roadmap/backlog senkronu tamamlandı.
- [x] Faz 17 e2e + unit/scheduler kanıtları kapatıldı.
- [x] Bir sonraki faz olarak re-open güvenlik/dashboard sağlık turu açıldı.

## Dalga Plani ve Kapanis

| Hafta | Tarih Araligi | Dalga | Ana Hedef | Durum |
|---|---|---|---|---|
| 1 | 09-13 Mar | Dalga 1 | Ortam, yonlendirme, session role dogrulamasi | Tamamlandi |
| 2 | 16-20 Mar | Dalga 1 | Guvenlik ve auth sozlesmesi cekirdegi | Tamamlandi |
| 3 | 23-27 Mar | Dalga 1 | Permission ve rol bazli koruma ilkeleri | Tamamlandi |
| 4 | 30-03 Nis | Dalga 1 | KVKK/API hardening kapanisi | Tamamlandi |
| 5 | 06-10 Nis | Dalga 2 | Hizmet katmani ve model cekirdegi | Tamamlandi |
| 6 | 13-17 Nis | Dalga 2 | Dokumantasyon ve test kapanisi | Tamamlandi |
| 7 | 20-24 Nis | Dalga 3 | Store/bootstrap ve frontend cekirdek state | Tamamlandi |
| 8 | 27-01 May | Dalga 3 | UX/erisim iyilestirme, mobil baslangic | Tamamlandi |
| 9 | 04-08 May | Dalga 4 | Customer 360 ve urun modelleme baslatma | Tamamlandi |
| 10 | 11-15 May | Dalga 4 | Productized policy temel akislar | Tamamlandi |
| 11 | 18-22 May | Dalga 5 | Yenileme servisi ve gorev motoru | Tamamlandi |
| 12 | 25-29 May | Dalga 5 | Mali/odeme alt akislar | Tamamlandi |
| 13 | 01-05 Haz | Dalga 5 | Tahsilat/komisyon model genisleme | Tamamlandi |
| 14 | 08-12 Haz | Dalga 5 | Kapanis ve kalite kontrol | Tamamlandi |
| 15 | 15-19 Haz | Dalga 6 | Claim/communication/task genislemesi | Tamamlandi |
| 16 | 22-26 Haz | Dalga 6 | Kampanya/task/notification temel | Tamamlandi |
| 17 | 29-03 Tem | Dalga 6 | Ileri operasyon modelleme | Tamamlandi |
| 18 | 06-10 Tem | Dalga 6 | Kapanis ve test gecisi | Tamamlandi |
| 19 | 13-17 Tem | Dalga 7 | Raporlama backend export cekirdegi | Tamamlandi |
| 20 | 20-24 Tem | Dalga 7 | Export ve karsilastirmali rapor iskeleti | Tamamlandi |
| 21 | 27-31 Tem | Dalga 7 | Scheduled reports, raporlama genisleme, regression hardening | Tamamlandi |
| 22 | 03-07 Agu | Dalga 1 (re-open) | Guvenlik kapanisi ve dashboard sorgu sagligi baslangici | Devam |

## Aktif Calisma Dilimi

| Gun | Gorev | Dosya | Sure |
|---|---|---|---|
| Pzt | Faz 16 backend smoke checklist (auth guard + scheduled/export kontratı) | `api/reports.py`, `api/scheduled_reports.py` | 2 sa |
| Sal | Faz 16 frontend smoke checklist (admin + dashboard davranışı) | `frontend/src/pages/Reports*.vue`, `frontend/tests/unit` | 2 sa |
| Car | Faz 16 manuel smoke: oturum/anonim senaryo + import-exports doğrulama | `frontend`, `tests` | 2 sa |
| Per | Kapanış notu taslağı ve teslim kanıtları toplama | `.plan/dalga-7.md`, `.plan/sprint-plan.md` | 1 sa |
| Cum | PR öncesi hızlı doğrulama ve risk notu | `repo notes`, `README` | 1 sa |

**Hafta sonu buffer:** review + test + commit

## Faz 16 Dogrulama Baslangic Notu (2026-03-11)

- [x] Faz 16 backend akisi: scheduled reports, reporting export ve auth guard smoke testleri koordine edilip uygulama aşamasına geçildi.
- [x] Faz 16 frontend akisi: Reports admin ve snapshot ekranı page testleri ile hızlı doğrulama tamamlandi.
- [x] Faz 16 anonim/giriş dışı erişim akışı smoke ile doğrulandı.
- [x] Faz 16 kapanış notu, teslim kanıtları ve sonraki geçiş notları güncellendi.
- [x] Faz 16 authenticated e2e smoke: `session_context`, `get_policy_list_report` contract ve scheduled-report erişim gate kontrolleri atandı.

## Aktif Dilim Bitis Kriteri

- [x] Dalga 7 tamamlandi olarak isaretlendi
- [x] Dalga 1 Gorev 1.1 checklist'i tamamlandi
- [x] `api/security.py` inventory cikti
- [x] `reports.py`, `quick_create.py`, `admin_jobs.py` ilk auth matrisi cikti
- [x] `quick_create.py` icin ilk standardizasyon refaktoru cikti
- [x] `communication.py` ve `accounting.py` auth kontrati hizalandi
- [x] `seed.py` ve `smoke.py` admin/demo kontrati hizalandi
- [x] read endpoint helper karari kod seviyesinde uygulandi
- [x] Gorev 1.2 icin endpoint auth matrisi hazir
- [x] Faz 1.3 icin merkezi redacted error helper eklendi
- [x] `reports.py`, `communication.py`, `scheduled_reports.py`, `accounting.py` error path'leri helper'a tasindi
- [x] notification/controller/provider hata zinciri redacted helper'a tasindi
- [x] dashboard ve customer access log hata basliklari redacted helper'a tasindi
- [x] Faz 1.3 plan seviyesinde kapatildi
- [x] Faz 2.1 icin ilk request-scope cache optimizasyonu uygulandi
- [x] Faz 2.1 icin aggregate request-cache optimizasyonu uygulandi
- [x] Faz 2.1 icin ilk dashboard hot-path index patch'i olusturuldu
- [x] Faz 2.1 icin dashboard v2 where/value cache sadeleştirmesi uygulandi
- [x] Faz 2.1 icin ikinci dashboard index patch'i olusturuldu
- [x] Faz 2.1 plan seviyesinde kapatildi
- [x] Faz 2.2 scheduled report outbox dispatch fan-out refaktoru alindi
- [x] Faz 2.2 accounting doc-event debounce refaktoru alindi
- [x] Faz 2.2 plan seviyesinde kapatildi
- [x] Faz 2.3 icin Dashboard.vue debounce uygulamasi alindi
- [x] Faz 2.3 icin Reports.vue debounce uygulamasi alindi
- [x] Faz 3.1 icin quick_create service katmani ilk dilimi alindi
- [x] Faz 3.1 icin quick_create service katmani ikinci dilimi alindi
- [x] Faz 3.1 icin quick_create persistence helper toplulastirmasi alindi
- [x] Faz 3.1 ara karar ve extraction aday listesi yazildi
- [x] Faz 3.1 icin reports runtime extraction dilimi alindi
- [x] Faz 3.1 icin admin_jobs dispatch extraction dilimi alindi
- [x] Faz 3.1 icin accounting runtime extraction dilimi alindi
- [x] Faz 3.1 plan seviyesinde kapatildi
- [x] Faz 3.2 icin reports endpoint helper tekillestirmesi alindi
- [x] Faz 3.2 icin mutation access helper tekillestirmesi alindi
- [x] Faz 3.2 plan seviyesinde kapatildi
- [x] Faz 3.3 icin finans dogrulama helper tekillestirmesi alindi
- [x] Faz 3.3 icin `commission_amount` kanonik alan karari ve Python legacy helper katmani alindi
- [x] Faz 3.3 icin sicak SQL `commission` fallback ifadeleri ortak helper'a tasindi
- [x] Faz 3.3 icin seed/smoke payload ve endorsement aynalama karari uygulandi
- [x] Faz 3.3 icin quick create literal status setleri merkezi enum sabitlerine baglandi
- [x] Faz 3.3 icin notes normalization helper alindi
- [x] Faz 3.3 plan seviyesinde kapatildi
- [x] Faz 3.4 icin renewal service/pipeline/telemetry iskeleti alindi
- [x] Faz 3.4 icin stale remediation ve renewal status guard alindi
- [x] Faz 3.4 icin renewal outcome veri modeli iskeleti alindi

## Sonraki Hamle

- Faz 3.3 veri modeli tekrarlarini hedefle
- lost reason / competitor alanlarini renewal outcome akislariyla besle
- legacy test yuzeyleri icin ikinci gecis planini yaz

## Faz 3.4 Aktif Dilim

- [x] Renewal outcome veri modeli iskeleti
- [x] Lost reason / competitor backend sozlesmesi
- [x] Renewal reporting payload'ina outcome alanlari
- [x] Dashboard renewal retention backend metri?i
- [x] Renewal board lost reason/competitor gorunurlugu sonraki dilimlerde tamamlandi; tarihsel plan kutusu kapatildi.
- [x] Retention ozeti dashboard UI tarafina baglandi; tarihsel plan kutusu kapatildi.

- [x] Renewal board quick create ve liste gorunurlugu lost reason / competitor bilgisiyle genisletildi
- [x] Dashboard renewal retention karti gorunurlugu tamamlandi.

- [x] Dashboard renewal retention karti gorunurlugu
- [x] Faz 3.4 kapanis notu sonraki bloklarda yazildi; tarihsel plan kutusu kapatildi.

## Yeni Aktif Odak

- [x] Faz 3.4 renewal outcome ve retention zinciri tamamlandi
- [x] Faz 3.2.1 Pinia store mimarisi inventory ve migration plani sonraki bloklarda tamamlandi; tarihsel plan kutusu kapatildi.


- [x] Pinia facade store temeli (uth, ui) olusturuldu
- [x] Dashboard.vue icin ilk store migration dilimi tamamlandi; tarihsel plan kutusu kapatildi.


## Guncel Sprint Durumu (2026-03-09)
- Aktif Dalga: 1
- Aktif Faz: 5
- Son tamamlanan adim: ReconciliationWorkbench ekstre ice aktarma preview dialog kontrati sayfa testine eklendi.
- Sonraki adim: statement import preview satirlarini persistence katmanina baglamak.
- Not: Dalga 4 tamamlandi, Dalga 5 aktif olarak ilerliyor.

- 2026-03-09 aktif teslim: Faz 5 statement import preview -> persistence zinciri tamamlandi; siradaki mantikli adim import edilen satirlar icin toplu resolve/ignore yardimcilari veya Faz 5 kapanis notu.

- 2026-03-09 aktif teslim: Faz 5 statement import persistence ve toplu reconciliation aksiyonlari tamamlandi; sonraki mantikli adim Faz 5 kapanis notu veya backend bulk mutation testleri.

- 2026-03-09 aktif teslim: Faz 5 bulk reconciliation backend kontrati sabitlendi; Faz 5 kapanis notuna gecilebilir.

- 2026-03-09 aktif durum: Faz 5 plan seviyesinde kapatildi. Sonraki sprint kesiti Faz 6 - hasar ve iletisim merkezi derinlestirme.

- 2026-03-09 guncelleme: Faz 6 ilk kesitinde claim lifecycle alanlari ve backend guard/test zemini eklendi. Sonraki adim ClaimsBoard gorunurlugu.

- 2026-03-09 Faz 6 ikinci kesit: ClaimsBoard lifecycle gorunurlugu eklendi. Sonraki adim claim status aksiyonlari ve musteri notification gorunurlugu.

- 2026-03-09 Faz 6 ucuncu kesit: ClaimsBoard hizli status aksiyonlari ve notification template ipucu eklendi. Sonraki adim rejected/appeal ve outbox gorunurlugu.

- 2026-03-09 Faz 6 dorduncu kesit: ClaimsBoard notification draft/outbox gorunurlugu ve rejected aksiyonu eklendi. Sonraki adim claim outbox aksiyonlari veya iletişim merkezi genislemesi.

- 2026-03-09 Faz 6 besinci kesit: AT Call Note veri modeli, quick create ve Communication Center hizli giris yuzeyi eklendi. Sonraki adim test kapsami ve kampanya/segment modeli.

- 2026-03-09 Faz 6 altinci kesit: call note backend/UI ilk test turu tamamlandi. Sonraki adim kampanya/segment veri modeli.
## Guncel OdaK

- **Aktif dalga:** 7
- **Aktif faz:** 16
- **Son teslim:** Faz 16 smoke checklist taslagi güncellendi ve dogrulama turu acildi
- **Bu sprintin yeni hedefi:** Faz 16 manuel smoke kapanışı

- 2026-03-09: CommunicationCenter campaign execution akisi icin secici ve test sertlestirmesi tamamlandi.

- 2026-03-09: Campaign execution summary alanlari campaign list/detail yuzeyinde gorunur olacak sekilde eklendi.

- 2026-03-09: Due campaign worker ve gunluk scheduler entegrasyonu tamamlandi.

- 2026-03-09: Campaign detail related cards ile draft/outbox delivery trace eklendi.

## Faz 6 Kapanis
- Claim ve Communication Center derinlestirme tamamlandi.
- Sonraki sprint odagi: Faz 7.


- 2026-03-09: Reports icinde communication operations raporu eklendi; sonraki adim test ve export kontrati.

- 2026-03-09: Communication operations report icin backend ve frontend test kontratlari eklendi.

- 2026-03-09: Reconciliation operations raporu ve test kontratlari tamamlandi.

- Tamamlandi: Hasar operasyonlari yonetim raporu (claims_operations) backend/frontend kontratlariyla eklendi. Sonraki mantikli hedef: Faz 7 icinde period-comparison veya ucuncu yonetsel dashboard kartlari.

- Tamamlandi: Reports ekranina client-side previous-period comparison kartlari eklendi ve sayfa testi ile sabitlendi. Sonraki hedef: Faz 7 icinde scheduled/export operatorlugu veya yeni yonetsel kartlar.

- Tamamlandi: Scheduled report yonetimi operasyon raporlarina genisletildi. Sonraki hedef: Faz 7 icinde yeni yonetsel kart veya Faz 7 kapanis notu.

## Faz 7 Kapanis Notu
- Tamamlandi: yonetsel operasyon raporlari + previous-period comparison + scheduled operatorluk.
- Yeni aktif hedef: Faz 8 ilk kesiti.

- Tamamlandi: Faz 8 ilk kesiti olarak customer segment snapshot veri modeli ve customer_360 entegrasyonu eklendi. Sonraki hedef: snapshot toplu yenileme veya snapshot gorunurlugu.
# Guncel Sprint Notu
- Faz 8
- Tamamlandi: snapshot veri omurgasi
- Tamamlandi: batch refresh job ve daily scheduler
- Tamamlandi: CustomerDetail snapshot metadata gorunurlugu
- Tamamlandi: snapshot batch refresh icin admin tetikleme ve liste gorunurlugu
- Tamamlandi: snapshot admin UI tetikleme butonu
- Tamamlandi: snapshot liste/detail okunabilirligini artirma
- Tamamlandi: snapshot liste taranabilirligini artirma
- Tamamlandi: snapshot operasyon ozet kartlarini acma
- Tamamlandi: segment snapshot trend gorunurlugu
- Tamamlandi: segment snapshot export gorunurlugu
- Tamamlandi: Faz 8 kapanis ve sonraki veri katmani
- Siradaki adim: Faz 9 ilk veri katmani


## Faz 9 Guncel Sprint Notu
- Aktif Faz: 9
- Tamamlandi:
  - `AT Ownership Assignment` veri modeli
  - ownership assignment quick create / aux edit-delete
  - Customer 360 ve Policy 360 assignment payload gorunurlugu
  - CustomerDetail inline assignment create/edit/delete
  - ClaimsBoard claim kaynakli assignment prefill
  - CustomerDetail ownership assignment sayfa testi
- Siradaki adim: assignment gorunurlugunu claim ve policy operasyon yuzeylerinde derinlestirmek
- 2026-03-09: Faz 9 ikinci kesit: ClaimsBoard ownership assignment gorunurlugu eklendi. Sonraki adim PolicyDetail ve aux detail yuzeyinde assignment operasyonlarini derinlestirmek.
- 2026-03-09: Faz 9 ucuncu kesit: PolicyDetail inline ownership assignment create/edit akisi tamamlandi. Sonraki adim aux/detail operasyonlarini derinlestirmek ve Faz 9 kapanisini hazirlamak.
- 2026-03-09: Faz 9 dorduncu kesit: ownership assignment aux/detail okunabilirligi eklendi.
- Faz 9 kapanis karari: ownership katmani veri modeli, ana operasyon yuzeyleri ve ilk test seviyesiyle tamamlandi.
- Sonraki adim: lokal build + docker restart + smoke ardindan GitHub gonderimi.

- 2026-03-09: Faz 10 ilk slice tamamlandi; detay shell mobil aksiyon ve sekme deneyimi iyilestirildi. Sonraki hedef CustomerDetail/PolicyDetail mobil veri yogunlugu.

- 2026-03-09: Faz 10 ikinci slice tamamlandi; CustomerDetail ve PolicyDetail mobil hizli aksiyon yuzeyleri acildi.

- 2026-03-09: Faz 10 ucuncu slice tamamlandi; detail ekranlarda mobil preview listeleri kisitlanarak okunabilirlik artirildi.

- 2026-03-09: Faz 10 dorduncu slice tamamlandi; CustomerList ve PolicyList mobil summary ergonomisi guclendirildi.

- 2026-03-09: Faz 10 mobil liste summary sozlesmesi CustomerList ve PolicyList testleri ile sabitlendi.

## 2026-03-09 Faz 10 Kapanis
- Mobil kullanilabilirlik icin ilk ergonomi turu tamamlandi.
- Sonraki hedef Faz 11 veri/operasyon katmani.


- Mevcut sprint odagi: Dashboard takip SLA paneli tamamlandi.

- Faz 11.3 notu: ClaimsBoard ve RenewalsBoard route query ile acilip filtrelerini otomatik dolduruyor.

- Faz 11.4 notu: SLA hedef ekranlarinda hizli operasyon aksiyonlari acildi.

- Faz 11.5 notu: CommunicationCenter context aksiyonlari ile assignment ve call note takipleri hizli kapatilabiliyor.

- Faz 11 kapanis notu: SLA payload, dashboard paneli, hedef ekran drill-down ve hizli closure aksiyonlari tamamlandi. Sonraki odak Faz 12.

- Faz 12.1 notu: Mutation audit izi AT Access Log uzerinden create/edit/delete quick operasyonlarina baglandi.

- Faz 12.2 notu: Admin job ve campaign execution operasyonlari AT Access Log Run kayitlari ile izlenebilir hale geldi.

- Faz 12.3 notu: Access & Audit Logs aux yuzeyi total/create/edit/delete/run kartlari ve hedef kayda panel drill-down davranisi ile guclendirildi.

- Faz 12.4 notu: AuxRecordDetail icinde AT Access Log kayitlari Audit Baglami ve Karar ve Eylem kartlari ile okunur hale getirildi; detail testi eklendi.

- Faz 12.5 notu: Access & Audit Logs yuzeyine Create/Edit/Delete/Run presetleri, action select filtresi ve viewed_on desc varsayilan siralama eklendi.

- Faz 12 kapanis notu: Access log veri modeli, service-level audit, admin/campaign run audit, audit ozet kartlari, target drill-down, detail okunurlugu ve action presetleri tamamlandi. Sonraki odak Faz 13.

- Faz 13.1 notu: Policy 360 icin document_profile backend ozeti ve PolicyDetail dokuman sekmesi operasyon kartlari eklendi; detail testi ile sabitlendi.

- Tamamlandi: Faz 13.2 claim dokuman ozet gorunurlugu ve ClaimsBoard sayfa testi hizalamasi.

- Tamamlandi: Faz 13.3 claim belge drill-down, Files aux surface ve ClaimsBoard route testi.

- Tamamlandi: Faz 13.4 Customer 360 belge profili, files drill-down ve CustomerDetail sayfa testi.

- Tamamlandi: Faz 13.5 Policy 360 dokuman drill-down ve PolicyDetail files route testi.

- Tamamlandi: Faz 13.6 Files aux operasyon kartlari, belge tip ozetleri ve hazir filter presetleri.

- Tamamlandi: Faz 13.7 Files aux attached-target panel gecisi.
- Faz 13 kapanis notu: policy/customer/claim belge profili, files drill-down ve files aux operatorlugu tamamlandi. Sonraki odak Faz 14.
- Faz 14 ilk slice notu: `AT Task` veri modeli, quick create/aux route ve Dashboard gunluk gorev paneli tamamlandi.

- Faz 14 ikinci slice notu: dashboard/task list hizli lifecycle aksiyonlari tamamlandi; AT Activity veri modeli, quick create ve activities aux yuzeyi acildi.

## Guncelleme - Faz 14
- Tamamlandi: CustomerDetail activity visibility + page test.
- Siradaki is: activity operasyon gorunurlugunu policy/dashboard yuzeylerine yaymak.


## Faz 14.4
- Tamamlandi: PolicyDetail activity visibility + page test.
- Siradaki is: Dashboard veya my work yuzeyinde activity ozetini acmak.


## Faz 14.5
- Tamamlandi: Dashboard my activities paneli + page test.
- Siradaki is: Faz 14 kapanis veya reminder veri katmani.


## Faz 14 Kapanis
- Durum: tamamlandi.
- Sonraki aktif is: Faz 15 veya AT Reminder veri katmani.


- 2026-03-10: Faz 15 reminder coverage Customer/Policy/Communication yuzeylerinde tamamlandi.

- 2026-03-10: Faz 15 reminder detail aksiyonlari eklendi; sonraki odak CommunicationCenter filtre/preset turu.

- 2026-03-10: Faz 15 reminder zinciri dashboard/aux/detail/communication yuzeylerinde tamamlama seviyesine geldi.

- 2026-03-10: Faz 15 reminder aux operatorlugu presetler ve ozet kartlari ile tamamlandi.

- 2026-03-10: Faz 15 tamamlandi. Faz 16 kapanis/smoke turu baslatildi.


- 2026-03-10: Faz 15 reminder aux operatorlugu icin sayfa testi eklendi; reminder summary ve hizli aksiyon kontrati sabitlendi.

- 2026-03-11: Faz 25 tamamlandi; benchmark preset discoverability JSON katalog cikisi kapanis notu plan/roadmap/backlog/README/dalga-1 ile senkronlandi.

- 2026-03-11: Faz 26 basladi; PolicyDetail icinde ownership assignment delete akisi ve sayfa testi eklendi.

- 2026-03-11: Faz 26 ikinci diliminde PolicyDetail ownership assignment hizli status aksiyonlari (In Progress/Blocked/Done) ve sayfa testi eklendi.

- 2026-03-11: Faz 26 ucuncu diliminde CustomerDetail ownership assignment hizli status aksiyonlari (In Progress/Blocked/Done) ve sayfa testi eklendi.

- 2026-03-11: Faz 26 dorduncu diliminde CommunicationCenter assignment context aksiyonlari Start/Block/Close olarak genisletildi; context testleri eklendi.

- 2026-03-11: Faz 26 tamamlandi; ownership assignment lifecycle aksiyonlari CustomerDetail/PolicyDetail/CommunicationCenter/AuxRecordDetail yuzeylerinde hizalandi.

- 2026-03-11: Faz 27 basladi; AuxRecordDetail ownership assignment header lifecycle aksiyonlari ve detail testi eklendi.

- 2026-03-11: Faz 27 ikinci diliminde AuxWorkbench ownership assignment satir lifecycle aksiyonlari (In Progress/Blocked/Done) ve liste testi eklendi.

- 2026-03-11: Faz 27 ucuncu diliminde AuxRecordDetail task/reminder header lifecycle aksiyonlari ve detail testleri eklendi.

- 2026-03-11: Faz 27 dorduncu diliminde AuxRecordDetail notification-outbox retry aksiyonu ve detail testi eklendi.

- 2026-03-11: Faz 27 besinci diliminde AuxRecordDetail notification-outbox requeue aksiyonu ve detail testi eklendi.

- 2026-03-11: Faz 27 altinci diliminde AuxRecordDetail notification-draft send-now aksiyonu ve detail testi eklendi.

- 2026-03-11: Faz 27 tamamlandi; aux/list-detail operator action parity notification draft/outbox, task, reminder ve ownership assignment yuzeylerinde hizalandi.

- 2026-03-11: Faz 28 basladi; AuxRecordDetail notification draft/outbox icinden CommunicationCenter baglamina gecis aksiyonu ve testi eklendi.

- 2026-03-11: Faz 28 ikinci diliminde AuxWorkbench notification draft satirlarina CommunicationCenter baglam gecisi eklendi; liste kontrati sabitlendi.

- 2026-03-11: Faz 28 ucuncu diliminde AuxWorkbench notification outbox satirlarina CommunicationCenter baglam gecisi kontrati eklendi.

- 2026-03-11: Faz 28 dorduncu diliminde CommunicationCenter baglam gecisi reminder/task/ownership assignment operator yuzeylerine genisletildi; liste/detail kontratlari eklendi.

- 2026-03-11: Faz 28 besinci diliminde task ve ownership assignment icin CommunicationCenter baglam gecisi liste/detail kontratlari tamamlandi.

- 2026-03-11: Faz 28 tamamlandi; operator yuzeyleri arasi baglamsal gecis parity reminder/task/ownership assignment/draft/outbox kapsaminda tamamlandi.

- 2026-03-11: Faz 29 basladi; CommunicationCenter icinde `return_to` baglamli geri donus aksiyonu ve sayfa testi eklendi.

- 2026-03-11: Faz 29 ikinci dilimde AuxWorkbench/AuxRecordDetail CommunicationCenter gecislerine `return_to` parametresi eklendi; liste/detail kontratlari guncellendi.

- 2026-03-11: Faz 29 ucuncu dilimde CustomerDetail/LeadDetail/OfferDetail CommunicationCenter gecislerine `return_to` parametresi eklendi; CustomerDetail sayfa testi guncellendi.

- 2026-03-11: Faz 29 dorduncu dilimde CommunicationCenter toolbar aksiyonlarina `return_to` geri donus butonu eklendi.

- 2026-03-11: Faz 29 besinci dilimde CommunicationCenter return_to butonu context disinda da gorunur olacak sekilde test ile sabitlendi.

- 2026-03-11: Faz 29 altinci dilimde return_to yoksa CommunicationCenter geri donus butonu router back fallback'i ile calisir hale getirildi; test eklendi.

- 2026-03-11: Faz 29 yedinci dilimde return_to guvenli path kontrolu eklendi; unsafe URL durumunda router back fallback testle sabitlendi.

- 2026-03-11: Faz 29 sekizinci dilimde return_to icin same-origin URL cozumleme `resolveSameOriginPath` ile hizalandi.

- 2026-03-11: Faz 29 dokuzuncu dilimde ClaimsBoard notification gecisinde CommunicationCenter `return_to` parametresi eklendi; sayfa testi ile sabitlendi.

- 2026-03-11: Faz 29 onuncu dilimde Dashboard follow-up CommunicationCenter gecisine `return_to` parametresi eklendi.

- 2026-03-11: Faz 29 tamamlandi; operator yuzeylerinde CommunicationCenter return_to geri donus parity’si saglandi ve plan notlari senkronlandi.

- 2026-03-11: Faz 30 basladi; Reports sayfasinda view-state (kolon gorunurlugu) route senkronu ve geri yazimi testleri eklendi.

- 2026-03-12: Faz 30 ikinci dilimde scheduled reports run/save/remove akislari ve export PDF aksiyonu test kapsami ile genisletildi.

- 2026-03-12: Faz 30 ucuncu dilimde Reports export XLSX ve export hata fallback test kapsami eklendi.

- 2026-03-12: Faz 30 tamamlandi; Reports view-state/scheduled/export test kapsami ile kapanis notu yazildi.

- 2026-03-12: Faz 31 basladi; Reports scheduled run/save/remove hata fallback test kapsami eklendi.

- 2026-03-12: Faz 31 ikinci dilimde scheduled reports load failure ve report load error test kapsami eklendi.

- 2026-03-12: Faz 31 tamamlandi; Reports scheduled/export/load hata fallback test kapsami ile kapanis notu yazildi.

- 2026-03-12: Faz 32 basladi; payment status raporunda branch bazli policy scope filtresi eklendi ve test kapsami guncellendi.

- 2026-03-12: Faz 32 ikinci dilimde communication operations raporuna branch filtresi eklendi; test kapsami guncellendi.

- 2026-03-12: Faz 32 ucuncu dilimde reconciliation operations raporuna branch filtresi eklendi ve test kapsami guncellendi.

- 2026-03-12: Faz 33 basladi; reports runtime export format normalize ve scheduled summary error fallback testleri eklendi.

- 2026-03-12: Faz 34 basladi; export format `xls` alias destegi ve test kapsami eklendi.

- 2026-03-12: Faz 32 tamamlandi; report branch filtresi parity payment/communication/reconciliation kapsami ile saglandi.

- 2026-03-12: Faz 33 tamamlandi; reports runtime fallback test kapsami kapatildi.

- 2026-03-12: Faz 34 tamamlandi; export format alias destegi ve test kapsami kapatildi.

- 2026-03-12: Faz 35 basladi; Reports export popup blocked hata davranisi ve test kapsami eklendi.

- 2026-03-12: Faz 36 basladi; reports runtime download response None-safe ve test kapsami eklendi.

- 2026-03-12: Faz 37 basladi; reports runtime build_safe_report_payload hata log test kapsami eklendi.

- 2026-03-12: Faz 35 tamamlandi; export popup blocked fallback test kapsami kapatildi.

- 2026-03-12: Faz 36 tamamlandi; download response None-safe kapatildi.

- 2026-03-12: Faz 37 tamamlandi; build_safe_report_payload fallback test kapsami kapatildi.

- 2026-03-12: Faz 38 basladi; export format normalize icin `xlsm/excel` alias destegi ve test kapsami eklendi.

- 2026-03-12: Faz 39 basladi; reports runtime download response filters None-safe handling ve test kapsami eklendi.

- 2026-03-12: Faz 40 basladi; Reports export URL icinde office_branch filtresi testle dogrulandi.

- 2026-03-12: Faz 38 tamamlandi; export format alias genisletme kapatildi.

- 2026-03-12: Faz 39 tamamlandi; download response filters None-safe kapatildi.

- 2026-03-12: Faz 40 tamamlandi; export URL filter kapsami kapatildi.
