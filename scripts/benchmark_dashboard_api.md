# Dashboard Benchmark Kullanim Notu / Usage Note

Bu arac dashboard endpointlerinin gecikme ve hata durumunu olcmek icin kullanilir.
Use this tool to measure latency and error behavior for dashboard endpoints.

## Hazir Presetler / Ready Presets

- `scripts/benchmark_presets/dashboard_filters_default.json`
- `scripts/benchmark_presets/workbench_filters_default.json`
- `--preset default`
- `--preset quick`
- `--preset full`
- `--list-presets`
- `--list-presets-json`

## Ornek Komutlar / Example Commands

Tum temel dashboard senaryolari:

```bash
python scripts/benchmark_dashboard_api.py \
  --base-url http://localhost:8000 \
  --sid "<session_sid>" \
  --preset default \
  --allow-private-target \
  --fail-on-error \
  --max-p95-ms 800 \
  --max-p99-ms 1200 \
  --artifact-name dashboard-full
```

Sadece secili senaryolar:

```bash
python scripts/benchmark_dashboard_api.py \
  --base-url http://localhost:8000 \
  --sid "<session_sid>" \
  --preset default \
  --scenarios dashboard_kpis,customer_workbench \
  --allow-private-target \
  --fail-on-error \
  --max-p95-ms 700 \
  --max-p99-ms 1000
```

## Beklenen Cikti / Expected Output

- Konsolda scenario bazli `avg`, `p50`, `p95`, `p99` tablosu gorunur.
- Esik asimi varsa arac `1` ile cikar.
- `--output-json` verilirse workspace icinde `.json` rapor dosyasi yazilir.
- JSON raporunda `preset` ve `scenarios` meta alanlari da bulunur.
- `--artifact-name` kullanildiginda ayni klasorde `.md` ozet raporu da uretilir.

## Notlar / Notes

- `--sid` veya `--auth-token` zorunludur.
- `--list-presets` auth istemeden mevcut preset isimlerini, threshold ve kisa aciklamalarini yazar.
- `--list-presets-json` ayni preset ozetini JSON formatinda verir.
- `--preset default` dengeli threshold setini yukler.
- `--preset quick` daha sik smoke kosulari icin daha sert threshold seti yukler.
- `--preset full` daha genis benchmark kosulari icin daha toleransli threshold seti yukler.
- `--artifact-name` verilirse rapor `scripts/benchmark_presets/output/<artifact>.json` altina yazilir.
- `--scenarios` verilmezse tum varsayilan benchmark senaryolari kosar.
- `--tabs` ile hangi dashboard tab payload senaryolarinin uretilecegi degistirilebilir.
