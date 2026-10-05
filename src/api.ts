// 서버 함수(/api/...)와 주고받는 데이터 형식과 호출 함수

export type Hours = [number, number] | null; // [시작분, 끝분], 끝분이 1440보다 크면 다음날 새벽까지

export type PharmacyItem = {
  id: string;
  name: string;
  addr: string;
  tel: string;
  lat: number;
  lon: number;
  distance: number | null; // m
  openNow: boolean;
  today: Hours; // 오늘 적용되는 운영 시간 (공휴일이면 공휴일 시간)
  hours: Hours[]; // [월, 화, 수, 목, 금, 토, 일, 공휴일]
};

export type SearchResult = {
  now: { date: string; minutes: number; holidayName: string | null };
  syncedAt: number;
  total: number;
  items: PharmacyItem[];
};

export type Region = { sido: string; sigungu: string[] };

export type SearchParams = {
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number }; // 정렬 기준 지점 (지도 가운데)
  sido?: string;
  sigungu?: string;
  q?: string;
  open?: boolean;
  holiday?: boolean;
  limit?: number;
};

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  // JSON 대신 화면(HTML)이 오면 서버 함수가 없는 주소에서 연 것 (예: npm run dev로 켠 5173)
  if (!(res.headers.get("content-type") ?? "").includes("json")) {
    throw new Error(
      import.meta.env.DEV
        ? "서버 함수가 없는 주소예요. localhost:8888로 열어 주세요 (npx netlify-cli dev)"
        : "서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요"
    );
  }
  const data = await res.json().catch(() => null);
  if (!res.ok || !data) throw new Error((data as { error?: string } | null)?.error ?? `요청 실패 (${res.status})`);
  return data as T;
}

export const fetchRegions = () => getJson<Region[]>("/api/regions");

export function searchPharmacies(p: SearchParams) {
  const qs = new URLSearchParams();
  if (p.lat !== undefined && p.lon !== undefined) {
    qs.set("lat", String(p.lat));
    qs.set("lon", String(p.lon));
  }
  if (p.center) {
    qs.set("clat", String(p.center.lat));
    qs.set("clon", String(p.center.lon));
  }
  if (p.sido) qs.set("sido", p.sido);
  if (p.sigungu) qs.set("sigungu", p.sigungu);
  if (p.q) qs.set("q", p.q);
  if (p.open) qs.set("open", "1");
  if (p.holiday) qs.set("holiday", "1");
  if (p.limit) qs.set("limit", String(p.limit));
  return getJson<SearchResult>(`/api/pharmacies?${qs}`);
}

// ── 표시용 도우미 ──
const hhmm = (m: number) => `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;

// [540, 1380] → "09:00 ~ 23:00", [540, 1560] → "09:00 ~ 다음날 02:00"
export function formatHours(h: Hours) {
  if (!h) return "휴무";
  const end = h[1] > 1440 ? `다음날 ${hhmm(h[1] - 1440)}` : hhmm(h[1]);
  return `${hhmm(h[0])} ~ ${end}`;
}

export const formatDistance = (m: number | null) =>
  m === null ? "" : m < 1000 ? `${m}m` : `${(m / 1000).toFixed(m < 10000 ? 1 : 0)}km`;

export const DAY_LABELS = ["월", "화", "수", "목", "금", "토", "일", "공휴일"];
