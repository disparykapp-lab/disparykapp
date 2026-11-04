// Edge Function: penyusup-tod
// Truth or Dare di akhir game "Siapa Penyusup?". Memakai secret OPENAI_API_KEY
// yang sama dengan Naskah AI — TIDAK PERNAH dikirim ke browser.
//
// Urutan (migrasi 0037):
//   1. penyusup_tod sebagai pemanggil: cek anggota room & game selesai, putar
//      korban + Truth/Dare kalau belum (idempoten, hasilnya sama untuk semua).
//   2. penyusup_tod_klaim (service_role): hanya satu pemanggilan per putaran
//      yang lanjut ke OpenAI; pemanggil lain langsung mendapat status terkini.
//      ("Putar Lagi" membuat putaran baru lewat RPC penyusup_tod dari klien.)
//   3. OpenAI membuat 3 pilihan → penyusup_tod_simpan (service_role). Kalau
//      OpenAI gagal/hasilnya tidak layak, database memakai pilihan cadangan.
//
// Deploy: `supabase functions deploy penyusup-tod` (JWT tetap diverifikasi).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MODEL = "gpt-4o-mini";

interface Konteks {
  game_ke: number;
  ke: number;
  jenis: "truth" | "dare";
  mode: "satu_divisi" | "antar_divisi";
  pemenang: "pemandu" | "penyusup";
  kata_pemandu: string;
  kata_penyusup: string;
  korban: string;
  korban_peran: "pemandu" | "penyusup";
  korban_divisi: string | null;
  petunjuk_korban: string[];
  pemain_lain: string[];
  sudah_dipakai: (string | null)[];
}

const ATURAN_SISTEM = [
  `Kamu host permainan Truth or Dare untuk anak magang dan pegawai Dinas Pariwisata Kota Yogyakarta yang baru selesai main game tebak kata "Siapa Penyusup?" bareng teman satu kantor.`,
  `Tugasmu: buat tepat 3 pilihan untuk pemain yang kalah. Lucu, akrab, bikin satu room ketawa, tapi tetap pantas di lingkungan kantor.`,
  ``,
  `Aturan:`,
  `- Bahasa Indonesia santai dan sopan yang dipahami orang dari daerah mana pun (hindari bahasa daerah dan singkatan yang tidak umum).`,
  `- Bicara langsung ke pemain ("kamu"), satu kalimat per pilihan, maksimal 140 karakter.`,
  `- TRUTH: pertanyaan jujur-jujuran yang bisa dijawab dalam 1-2 kalimat, tentang kebiasaan sehari-hari, magang/kerja, kuliah, makanan, HP, atau teman di room.`,
  `- DARE: tantangan yang bisa langsung dilakukan di tempat dalam 30 detik, tanpa alat khusus dan tanpa biaya, lewat suara/ekspresi/gaya bicara (tetap bisa dilakukan walau tiap pemain pakai HP masing-masing).`,
  `- Ketiga pilihan harus beda tema satu sama lain.`,
  `- Boleh menyebut nama pemain lain atau kata/petunjuk dari game tadi supaya terasa personal, tapi tidak wajib.`,
  `- DILARANG: SARA, politik, hal seksual/romantis, mengomentari fisik atau penampilan, gaji/uang pribadi, membuka rahasia yang bisa merugikan, membahayakan diri/orang lain, makan/minum hal aneh, mengunggah ke media sosial, menghubungi orang di luar room, merusak barang, atau keluar ruangan.`,
  ``,
  `Balas HANYA JSON: {"pilihan": ["...", "...", "..."]}`,
].join("\n");

function susunPrompt(k: Konteks): string {
  const kalah =
    k.korban_peran === "penyusup"
      ? "Dia penyusup dan ketahuan, jadi kalah."
      : "Dia pemandu, tapi penyusup berhasil lolos, jadi timnya kalah.";
  const baris = [
    `Jenis: ${k.jenis === "truth" ? "TRUTH" : "DARE"}`,
    `Pemain yang kalah: ${k.korban}${k.korban_divisi ? ` (divisi ${k.korban_divisi})` : ""}. ${kalah}`,
    `Kata pemandu: ${k.kata_pemandu}; kata penyusup: ${k.kata_penyusup}.`,
  ];
  if (k.petunjuk_korban.length) baris.push(`Petunjuk yang dia berikan: ${k.petunjuk_korban.join(", ")}.`);
  if (k.pemain_lain.length) baris.push(`Pemain lain di room: ${k.pemain_lain.join(", ")}.`);
  baris.push(k.mode === "satu_divisi" ? "Semua pemain satu divisi." : "Pemain dari beberapa divisi.");
  const dipakai = k.sudah_dipakai.filter((x): x is string => !!x).slice(-12);
  if (dipakai.length) {
    baris.push(`Pilihan di putaran sebelumnya (JANGAN diulang atau dibuat mirip):\n- ${dipakai.join("\n- ")}`);
  }
  return baris.join("\n");
}

async function mintaOpenAi(apiKey: string, k: Konteks): Promise<string[] | null> {
  const resp = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: MODEL,
      messages: [
        { role: "system", content: ATURAN_SISTEM },
        { role: "user", content: susunPrompt(k) },
      ],
      response_format: { type: "json_object" },
      temperature: 1,
      max_tokens: 400,
    }),
    signal: AbortSignal.timeout(20_000),
  });
  if (!resp.ok) {
    console.error("OpenAI error:", resp.status, await resp.text());
    return null;
  }
  const hasil = await resp.json();
  const isi = JSON.parse(hasil.choices?.[0]?.message?.content ?? "{}");
  const pilihan = Array.isArray(isi.pilihan) ? isi.pilihan.filter((x: unknown) => typeof x === "string") : [];
  return pilihan.length >= 3 ? pilihan.slice(0, 3) : null;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Belum login." }, 401);

    const url = Deno.env.get("SUPABASE_URL")!;
    const sebagaiUser = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });
    const {
      data: { user },
    } = await sebagaiUser.auth.getUser();
    if (!user) return json({ error: "Sesi tidak valid." }, 401);

    const { room_id: roomId } = (await req.json()) as { room_id?: string };
    if (!roomId || !/^[0-9a-f-]{36}$/i.test(roomId)) return json({ error: "Room tidak valid." }, 400);

    const { data: tod, error } = await sebagaiUser.rpc("penyusup_tod", { p_room: roomId });
    if (error) return json({ error: error.message }, 400);

    const admin = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: konteks, error: errKlaim } = await admin.rpc("penyusup_tod_klaim", { p_room: roomId });
    if (errKlaim) {
      console.error("klaim:", errKlaim.message);
      return json({ tod }, 200);
    }
    // sudah siap, tidak ada korban, atau sedang dibuat oleh pemanggilan lain
    if (!konteks) return json({ tod }, 200);

    let pilihan: string[] | null = null;
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (apiKey) {
      try {
        pilihan = await mintaOpenAi(apiKey, konteks as Konteks);
      } catch (e) {
        console.error("OpenAI gagal:", e);
      }
    } else {
      console.error("OPENAI_API_KEY belum diset — pakai pilihan cadangan.");
    }

    const { data: hasil, error: errSimpan } = await admin.rpc("penyusup_tod_simpan", {
      p_room: roomId,
      p_game_ke: (konteks as Konteks).game_ke,
      p_ke: (konteks as Konteks).ke,
      p_pertanyaan: pilihan,
    });
    if (errSimpan) {
      console.error("simpan:", errSimpan.message);
      return json({ error: "Gagal menyimpan pilihan Truth or Dare." }, 500);
    }
    return json({ tod: hasil }, 200);
  } catch (e) {
    console.error(e);
    return json({ error: "Terjadi kesalahan tak terduga." }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}
