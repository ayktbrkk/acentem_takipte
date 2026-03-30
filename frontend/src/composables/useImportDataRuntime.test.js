import { describe, expect, it, vi } from "vitest";
import { nextTick, ref } from "vue";

import { useImportDataRuntime } from "./useImportDataRuntime";

class FileReaderMock {
  readAsText(file) {
    this.result = file.__content || "";
    if (typeof this.onload === "function") {
      this.onload();
    }
  }
}

describe("useImportDataRuntime", () => {
  it("parses csv imports, enables import, and navigates back on cancel", async () => {
    vi.stubGlobal("FileReader", FileReaderMock);
    const routerPush = vi.fn();
    const authStore = { locale: ref("tr") };
    const t = (key) => ({
      rowsPrefix: "Satır",
      columnsMapped: "kolon eşleştirildi",
      importQueued: "İçe aktarma kuyruğa alındı.",
      xlsPreviewWarning: "XLS/XLSX önizleme sınırlı.",
      policyLabel: "Poliçeler",
      offerLabel: "Teklifler",
      customerLabel: "Müşteriler",
      policyNo: "Poliçe No",
      customer: "Müşteri",
      branch: "Branş",
      grossPremium: "Brüt Prim",
      status: "Durum",
      offerNo: "Teklif No",
      insuranceCompany: "Sigorta Şirketi",
      fullName: "Ad Soyad",
      taxId: "Kimlik/Vergi No",
      mobilePhone: "Telefon",
      email: "E-posta",
      customerType: "Müşteri Tipi",
      selectedFile: "Seçilen dosya",
      importAction: "İçe Aktar",
      importQueuedTitle: "İçe aktarma kuyruğa alındı.",
    })[key] || key;

    const runtime = useImportDataRuntime({ t, router: { push: routerPush }, authStore });
    const file = {
      name: "musteriler.csv",
      __content: "Ad Soyad,E-posta\nAli Veli,ali@example.com",
    };

    runtime.handleFileSelect({ target: { files: [file] } });
    await Promise.resolve();
    await nextTick();

    expect(runtime.selectedDataset.value).toBe("customers");
    expect(runtime.fileName.value).toBe("musteriler.csv");
    expect(runtime.columns.value).toEqual(["Ad Soyad", "E-posta"]);
    expect(runtime.previewRows.value).toHaveLength(1);

    runtime.columnMapping["Ad Soyad"] = "full_name";
    runtime.columnMapping["E-posta"] = "email";
    expect(runtime.canImport.value).toBe(true);

    runtime.importData();
    expect(runtime.importMessage.value).toContain("2 kolon eşleştirildi");
    expect(runtime.importMessage.value).toContain("İçe aktarma kuyruğa alındı.");

    runtime.cancel();
    expect(routerPush).toHaveBeenCalledWith({ name: "dashboard" });
  });
});
