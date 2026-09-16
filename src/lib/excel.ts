import type { BarisAbsensi, Ringkasan } from "./rekap";

const LABEL_STATUS: Record<string, string> = {
  hadir: "Hadir",
  telat: "Telat",
  dinas_luar: "Dinas Luar",
};

const LABEL_MODE: Record<string, string> = {
  kantor: "Di Kantor",
  luar: "Dinas Luar",
};

const WARNA_HIJAU = "FF0E7C66";
const WARNA_ABU = "FF6B7280";

export interface OpsiEksporExcel {
  namaFile: string;
  judul: string;
  periode: string;
  sertakanNama: boolean;
  rows: BarisAbsensi[];
  ringkasan?: Ringkasan;
}

/** Buat & unduh file .xlsx rekap absensi dengan template rapi (judul, ringkasan, tabel berwarna). */
export async function unduhExcelRekap(opts: OpsiEksporExcel) {
  const { default: ExcelJS } = await import("exceljs");
  const wb = new ExcelJS.Workbook();
  wb.creator = "DisparYK";
  wb.created = new Date();

  const ws = wb.addWorksheet("Rekap Absensi", {
    views: [{ state: "frozen", ySplit: 0 }],
  });

  const jumlahKolom = opts.sertakanNama ? 9 : 8;

  ws.mergeCells(1, 1, 1, jumlahKolom);
  const selJudul = ws.getCell(1, 1);
  selJudul.value = opts.judul;
  selJudul.font = { bold: true, size: 14, color: { argb: WARNA_HIJAU } };

  ws.mergeCells(2, 1, 2, jumlahKolom);
  const selPeriode = ws.getCell(2, 1);
  selPeriode.value = `Periode: ${opts.periode}`;
  selPeriode.font = { size: 10, color: { argb: WARNA_ABU } };

  ws.mergeCells(3, 1, 3, jumlahKolom);
  const selEkspor = ws.getCell(3, 1);
  selEkspor.value = `Diekspor: ${new Date().toLocaleString("id-ID")}`;
  selEkspor.font = { size: 10, color: { argb: WARNA_ABU } };

  let baris = 5;

  if (opts.ringkasan) {
    const r = opts.ringkasan;
    ws.getCell(baris, 1).value = "Ringkasan";
    ws.getCell(baris, 1).font = { bold: true };
    baris++;

    const ringkasanItem: [string, string | number][] = [
      ["Hadir", r.hadir],
      ["Telat", r.telat],
      ["Dinas Luar", r.dinasLuar],
      ["Tidak Absen", r.tidakAbsen],
      ["Total Jam Kerja", `${r.totalJamKerja.toFixed(1)} jam`],
    ];
    for (const [label, nilai] of ringkasanItem) {
      ws.getCell(baris, 1).value = label;
      ws.getCell(baris, 2).value = nilai;
      baris++;
    }
    baris++;
  }

  const header = [
    ...(opts.sertakanNama ? ["Nama"] : []),
    "Tanggal",
    "Jam Masuk",
    "Jam Pulang",
    "Mode Masuk",
    "Mode Pulang",
    "Status",
    "Ditandai",
    "Keterangan",
  ];

  const barisHeader = baris;
  header.forEach((teks, i) => {
    const sel = ws.getCell(barisHeader, i + 1);
    sel.value = teks;
    sel.font = { bold: true, color: { argb: "FFFFFFFF" } };
    sel.fill = { type: "pattern", pattern: "solid", fgColor: { argb: WARNA_HIJAU } };
    sel.alignment = { vertical: "middle", horizontal: "center" };
    sel.border = {
      top: { style: "thin" },
      bottom: { style: "thin" },
      left: { style: "thin" },
      right: { style: "thin" },
    };
  });
  baris++;

  for (const r of opts.rows) {
    let kolom = 1;
    const setSel = (nilai: string) => {
      const sel = ws.getCell(baris, kolom);
      sel.value = nilai;
      sel.border = {
        top: { style: "hair" },
        bottom: { style: "hair" },
        left: { style: "hair" },
        right: { style: "hair" },
      };
      kolom++;
    };

    if (opts.sertakanNama) setSel(r.profiles?.nama ?? "-");
    setSel(r.tanggal);
    setSel(r.masuk_at ? new Date(r.masuk_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-");
    setSel(r.keluar_at ? new Date(r.keluar_at).toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" }) : "-");
    setSel(r.masuk_mode ? (LABEL_MODE[r.masuk_mode] ?? r.masuk_mode) : "-");
    setSel(r.keluar_mode ? (LABEL_MODE[r.keluar_mode] ?? r.keluar_mode) : "-");
    setSel(LABEL_STATUS[r.status] ?? r.status);
    setSel(r.ditandai ? "Ya" : "");
    setSel(r.catatan_klarifikasi ?? "");
    baris++;
  }

  const lebarKolom = [...(opts.sertakanNama ? [22] : []), 12, 10, 10, 12, 12, 12, 9, 32];
  lebarKolom.forEach((lebar, i) => {
    ws.getColumn(i + 1).width = lebar;
  });

  ws.views = [{ state: "frozen", ySplit: barisHeader }];

  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${opts.namaFile}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
