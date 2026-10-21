// Edge Function: naskah-ai
// Merangkai kolom-kolom terstruktur dari form (bukan prompt bebas) jadi satu
// prompt, memanggil OpenAI, lalu mengembalikan hasilnya ke klien. API key
// OpenAI dibaca dari secret OPENAI_API_KEY (Project Settings > Edge Functions
// > Secrets, atau `supabase secrets set OPENAI_API_KEY=sk-...`) — TIDAK PERNAH
// dikirim ke browser.
//
// Supabase otomatis menolak request tanpa JWT valid (default, tidak di-deploy
// dengan --no-verify-jwt), jadi pemanggil sudah pasti pengguna yang login.
// Di bawah kita cek lagi fitur_naskah_ai/admin, supaya sejalan dengan gerbang
// yang sama dipakai di sisi klien (menu cuma tampil kalau divisinya diizinkan).

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface Payload {
  jenisAcara?: string;
  namaAcara?: string;
  lokasi?: string;
  tanggal?: string;
  narasumber?: string;
  poinPenting: string;
  gaya: string;
  panjang: string;
  platformTujuan?: string;
}

const LABEL_GAYA: Record<string, string> = {
  berita: "naskah berita televisi/radio yang formal dan lugas",
  siaran_pers: "siaran pers resmi instansi pemerintah",
  caption: "caption media sosial yang ringan dan menarik, boleh pakai emoji secukupnya",
  voice_over: "naskah voice-over/narasi video yang mengalir enak dibacakan",
};

const LABEL_PANJANG: Record<string, string> = {
  pendek: "pendek, sekitar 80-120 kata",
  sedang: "sedang, sekitar 150-250 kata",
  panjang: "panjang dan detail, sekitar 300-450 kata",
};

function susunPrompt(p: Payload): string {
  const baris: string[] = [];
  if (p.jenisAcara) baris.push(`Jenis acara: ${p.jenisAcara}`);
  if (p.namaAcara) baris.push(`Nama acara: ${p.namaAcara}`);
  if (p.lokasi) baris.push(`Lokasi: ${p.lokasi}`);
  if (p.tanggal) baris.push(`Tanggal: ${p.tanggal}`);
  if (p.narasumber) baris.push(`Narasumber/pihak terlibat: ${p.narasumber}`);
  if (p.platformTujuan) baris.push(`Tujuan publikasi: ${p.platformTujuan}`);
  baris.push(`Poin-poin penting/kronologi kegiatan:\n${p.poinPenting}`);

  const gaya = LABEL_GAYA[p.gaya] ?? LABEL_GAYA.berita;
  const panjang = LABEL_PANJANG[p.panjang] ?? LABEL_PANJANG.sedang;

  return [
    `Kamu adalah penulis naskah liputan untuk Dinas Pariwisata Kota Yogyakarta.`,
    `Tulis ${gaya}, panjang ${panjang}, berbahasa Indonesia baku tapi enak dibaca/didengar.`,
    `Jangan karang fakta/kutipan yang tidak ada di data berikut — kalau datanya kurang, tulis secara umum saja tanpa detail yang dikarang.`,
    ``,
    `Data liputan:`,
    ...baris,
    ``,
    `Tulis naskahnya langsung, tanpa basa-basi pembuka seperti "Berikut naskahnya:".`,
  ].join("\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Belum login." }, 401);
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return json({ error: "Sesi tidak valid." }, 401);
    }

    const { data: profil } = await supabase
      .from("profiles")
      .select("role, divisi:divisi_id(fitur_naskah_ai)")
      .eq("id", user.id)
      .maybeSingle();

    const divisi = profil?.divisi as unknown as { fitur_naskah_ai: boolean } | null;
    const bolehAkses = profil?.role === "admin" || divisi?.fitur_naskah_ai === true;
    if (!bolehAkses) {
      return json({ error: "Fitur Naskah AI belum diaktifkan untuk divisimu." }, 403);
    }

    const body = (await req.json()) as Payload;
    if (!body.poinPenting || body.poinPenting.trim().length < 5) {
      return json({ error: "Isi poin-poin penting kegiatan dulu (minimal beberapa kata)." }, 400);
    }

    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) {
      return json({ error: "OPENAI_API_KEY belum diset di secret Edge Function." }, 500);
    }

    const prompt = susunPrompt(body);

    const resp = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
      }),
    });

    if (!resp.ok) {
      const teks = await resp.text();
      console.error("OpenAI error:", resp.status, teks);
      return json({ error: "Gagal menghubungi OpenAI. Coba lagi beberapa saat." }, 502);
    }

    const hasil = await resp.json();
    const naskah = hasil.choices?.[0]?.message?.content?.trim();
    if (!naskah) {
      return json({ error: "OpenAI tidak mengembalikan hasil." }, 502);
    }

    return json({ hasil: naskah, model: "gpt-4o-mini" }, 200);
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
