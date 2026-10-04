import { loadDataset, regionOf } from "../lib/data.mts";

// 시/도 → 시/군/구 목록 (저장된 약국 주소에서 뽑음)
// GET /api/regions → [{ sido: "서울특별시", sigungu: ["강남구", ...] }, ...]
export default async () => {
  let data;
  try {
    data = await loadDataset();
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ error: "지역 목록을 불러오지 못했어요" }), { status: 503 });
  }

  const map = new Map<string, Set<string>>();
  for (const p of data.pharmacies) {
    const { sido, sigungu } = regionOf(p.addr);
    if (!sido) continue;
    if (!map.has(sido)) map.set(sido, new Set());
    if (sigungu) map.get(sido)!.add(sigungu);
  }
  const ko = (a: string, b: string) => a.localeCompare(b, "ko");
  const regions = [...map.entries()]
    .sort(([a], [b]) => ko(a, b))
    .map(([sido, set]) => ({ sido, sigungu: [...set].sort(ko) }));

  return new Response(JSON.stringify(regions), {
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "public, max-age=3600" },
  });
};

export const config = { path: "/api/regions" };
