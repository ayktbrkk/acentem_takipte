# Release Smoke Checklist

## Amac

- Release oncesi kritik operasyon akislari icin minimum manuel kontrol listesini sabitlemek.
- Raporlama, export, scheduled report ve auth gate davranislarinda regressionsuz kapanis yapmak.

## Kapsam

- Reports API
- List Export API
- Scheduled Reports admin akisi
- Dashboard ve temel auth gate davranisi

## Smoke Adimlari

### 1. Auth ve erisim gate

- `/at` oturumlu kullanici ile acilir.
- Yetkisiz kullanici scheduled report alanina erisemez.
- Reports ve list export endpointleri auth olmadan veri dondurmez.

### 2. Reports payload

- En az bir operasyon raporu veri yukler.
- Bos veya bozuk filter payload'i kontrollu fallback ile calisir.
- `limit` string gelse bile gecerli normalize edilir.

### 3. Report export

- XLSX export gecerli filename ile iner.
- PDF export gecerli filename ve content type ile iner.
- Bos veya bozuk download payload'i binary/default fallback ile patlamaz.

### 4. List export

- Screen export `filters` ve `or_filters` bozuk shape ile patlamaz.
- Tabular export comma-separated columns ve JSON filters ile calisir.
- `permission_doctypes` bos ise kontrollu hata verir.

### 5. Scheduled reports

- Summary listesi bozuk item shape gelse bile liste render edilebilir kalir.
- Save akisi recipients/filters/format/locale alanlarini normalize eder.
- Remove akisi remaining degerini negatif dondurmez.

### 6. Lokalizasyon

- `tr-TR` gibi locale degerlerinde title fallback tam locale -> base locale -> `en` sirasi ile calisir.
- Bos label/title alanlari export key veya report key fallback'ine duser.

## Minimum Kapanis Kriteri

- Yukaridaki 6 basligin her biri en az bir manuel veya test kaniti ile dogrulanmis olacak.
- Kritik blokaj yoksa release hardening turu tamamlanmis sayilacak.

## Not

- Bu dosya minimum checklist'tir; genis smoke/e2e plani yerine kisa release kapisi olarak kullanilir.
