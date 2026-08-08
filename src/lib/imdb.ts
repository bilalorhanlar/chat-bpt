import "server-only";

/**
 * IMDb başlık bilgisi.
 *
 * HTML kazımıyoruz: IMDb sayfaları bot şüphesinde 202 + boş kabuk dönüyor.
 * Onun yerine IMDb'nin kendi arama kutusunun kullandığı açık öneri API'si
 * (`v2.sg.media-imdb.com/suggestion`) çağrılıyor — anahtar istemiyor ve
 * başlık, kapak, tür ve yılı tek JSON'da veriyor.
 *
 * Kapak, IMDb CDN'inden (media-amazon.com) hotlink'leniyor. Kendimize
 * kopyalamıyoruz çünkü Railway'in dosya sistemi her dağıtımda sıfırlanıyor;
 * CDN adresi ise kalıcı.
 */

const IMDB_HOSTS = new Set(["www.imdb.com", "imdb.com", "m.imdb.com"]);

export type ImdbMeta = {
  /** `https://www.imdb.com/title/tt0903747/` biçiminde sadeleştirilmiş adres. */
  url: string;
  poster: string | null;
  title: string | null;
  /** IMDb türünden çıkarım: dizi mi film mi. Bilinemezse null. */
  kind: "dizi" | "film" | null;
  year: string | null;
};

/** Kuyruk parametrelerini atıp `tt` kimliğini çıkarır. */
export function normalizeImdbUrl(raw: string): { url: string; id: string } | null {
  let parsed: URL;
  try {
    parsed = new URL(raw.trim());
  } catch {
    return null;
  }
  if (!IMDB_HOSTS.has(parsed.hostname)) return null;

  const match = parsed.pathname.match(/\/title\/(tt\d{6,10})/);
  if (!match) return null;
  return { url: `https://www.imdb.com/title/${match[1]}/`, id: match[1] };
}

type SuggestionEntry = {
  id?: string;
  l?: string;
  y?: number;
  yr?: string;
  qid?: string;
  i?: { imageUrl?: string };
};

function kindFromQid(qid: string | undefined): "dizi" | "film" | null {
  if (!qid) return null;
  if (qid.startsWith("tv") && qid !== "tvMovie") return "dizi";
  if (qid === "movie" || qid === "feature" || qid === "tvMovie" || qid === "short") return "film";
  return null;
}

export async function fetchImdbMeta(raw: string): Promise<ImdbMeta | null> {
  const normalized = normalizeImdbUrl(raw);
  if (!normalized) return null;

  const fallback: ImdbMeta = {
    url: normalized.url,
    poster: null,
    title: null,
    kind: null,
    year: null,
  };

  try {
    const response = await fetch(
      `https://v2.sg.media-imdb.com/suggestion/t/${normalized.id}.json`,
      {
        headers: { "User-Agent": "Mozilla/5.0" },
        signal: AbortSignal.timeout(8000),
        cache: "no-store",
      },
    );
    if (!response.ok) return fallback;

    const data = (await response.json()) as { d?: SuggestionEntry[] };
    const entry = data.d?.find((item) => item.id === normalized.id) ?? data.d?.[0];
    if (!entry) return fallback;

    return {
      url: normalized.url,
      poster: entry.i?.imageUrl ?? null,
      title: entry.l ?? null,
      kind: kindFromQid(entry.qid),
      year: entry.yr ?? (entry.y ? String(entry.y) : null),
    };
  } catch {
    // Ağ hatası kapaksız eklemeye engel olmasın.
    return fallback;
  }
}
