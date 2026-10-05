import { dayIndex, isOpenNow, kstNow, loadDataset, regionOf, type Pharmacy } from "../lib/data.mts";

// 약국 검색
// GET /api/pharmacies
//   lat, lon        내 위치 (있으면 가까운 순, 거리 표시)
//   clat, clon      정렬 기준 지점 (지도의 "이 지역에서 찾기": 지도 가운데에서 가까운 순. 거리는 계속 내 위치 기준)
//   sido, sigungu   지역
//   q               약국 이름 검색
//   open=1          지금 영업 중만
//   holiday=1       공휴일 운영 약국만
//   limit           최대 개수 (기본 50, 최대 300)

const MAX_LIMIT = 300;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });

// 두 좌표 사이 거리 (m)
function distance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLon = (lon2 - lon1) * rad;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

export default async (req: Request) => {
  const params = new URL(req.url).searchParams;
  const lat = Number(params.get("lat"));
  const lon = Number(params.get("lon"));
  const hasLocation = params.has("lat") && params.has("lon") && Number.isFinite(lat) && Number.isFinite(lon);
  const clat = Number(params.get("clat"));
  const clon = Number(params.get("clon"));
  const hasCenter = params.has("clat") && params.has("clon") && Number.isFinite(clat) && Number.isFinite(clon);
  const sido = params.get("sido") ?? "";
  const sigungu = params.get("sigungu") ?? "";
  const q = (params.get("q") ?? "").trim().replace(/\s+/g, "");
  const onlyOpen = params.get("open") === "1";
  const onlyHoliday = params.get("holiday") === "1";
  const limit = Math.min(Math.max(Number(params.get("limit")) || 50, 1), MAX_LIMIT);

  let data;
  try {
    data = await loadDataset();
  } catch (e) {
    console.error(e);
    return json({ error: "약국 정보를 불러오지 못했어요" }, 503);
  }

  const now = kstNow();
  const holidayName = data.holidays[now.date] ?? null;
  const todayIdx = dayIndex(now.weekday, holidayName !== null);

  let list: { p: Pharmacy; dist: number | null; sortKey: number }[] = [];
  for (const p of data.pharmacies) {
    if (sido || sigungu) {
      const r = regionOf(p.addr);
      if (sido && r.sido !== sido) continue;
      if (sigungu && r.sigungu !== sigungu) continue;
    }
    if (q && !p.name.replace(/\s+/g, "").includes(q)) continue;
    if (onlyHoliday && !p.hours[7]) continue;
    if (onlyOpen && !isOpenNow(p, data.holidays, now)) continue;
    const dist = hasLocation ? distance(lat, lon, p.lat, p.lon) : null;
    const sortKey = hasCenter ? distance(clat, clon, p.lat, p.lon) : (dist ?? 0);
    list.push({ p, dist, sortKey });
  }

  const total = list.length;
  list.sort((a, b) => (hasCenter || hasLocation ? a.sortKey - b.sortKey : a.p.name.localeCompare(b.p.name, "ko")));
  list = list.slice(0, limit);

  return json({
    now: { date: now.date, minutes: now.minutes, holidayName },
    syncedAt: data.syncedAt,
    total,
    items: list.map(({ p, dist }) => ({
      id: p.id,
      name: p.name,
      addr: p.addr,
      tel: p.tel,
      lat: p.lat,
      lon: p.lon,
      distance: dist === null ? null : Math.round(dist),
      openNow: isOpenNow(p, data.holidays, now),
      today: p.hours[todayIdx],
      hours: p.hours,
    })),
  });
};

export const config = { path: "/api/pharmacies" };
