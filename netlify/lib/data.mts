import { getStore } from "@netlify/blobs";

// ── 저장 형식 ──
// 약국 하나: 운영 시간은 [월, 화, 수, 목, 금, 토, 일, 공휴일] 8칸, 각 칸은 [시작분, 끝분] 또는 null(휴무)
// 끝분이 1440(24:00)보다 크면 다음날 새벽까지 영업
export type Hours = [number, number] | null;
export type Pharmacy = {
  id: string;
  name: string;
  addr: string;
  tel: string;
  lat: number;
  lon: number;
  hours: Hours[];
};
export type Dataset = {
  pharmacies: Pharmacy[];
  holidays: Record<string, string>; // "20261005" → "대체공휴일(개천절)"
  syncedAt: number;
};

const PHARMACY_API = "https://apis.data.go.kr/B552657/ErmctInsttInfoInqireService/getParmacyFullDown";
const HOLIDAY_API = "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo";
const PAGE_SIZE = 5000; // 한 번에 받을 수 있는 최대 건수 (실제 확인함)

const serviceKey = () => {
  const key = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!key) throw new Error("DATA_GO_KR_SERVICE_KEY not set");
  return key;
};

async function callApi(base: string, params: Record<string, string>): Promise<string> {
  const url = new URL(base);
  url.searchParams.set("serviceKey", serviceKey());
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const res = await fetch(url, { signal: AbortSignal.timeout(20_000) });
  const text = await res.text();
  const code = text.match(/<resultCode>([^<]*)<\/resultCode>/)?.[1];
  if (!res.ok || (code && code !== "00")) {
    const msg = text.match(/<resultMsg>([^<]*)<\/resultMsg>/)?.[1] ?? text.slice(0, 200);
    throw new Error(`공공데이터 API 오류 (${res.status}): ${msg}`);
  }
  return text;
}

// ── 간단한 XML 읽기 (응답 구조가 단순해서 정규식으로 충분) ──
const items = (xml: string) => xml.match(/<item>[\s\S]*?<\/item>/g) ?? [];
const decode = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");
const tag = (item: string, name: string) => {
  const v = item.match(new RegExp(`<${name}>([\\s\\S]*?)</${name}>`))?.[1];
  return v === undefined ? "" : decode(v).trim();
};
const totalCount = (xml: string) => Number(xml.match(/<totalCount>(\d+)<\/totalCount>/)?.[1] ?? 0);

// "0900" → 540분
const toMinutes = (hhmm: string) => {
  if (!/^\d{3,4}$/.test(hhmm)) return null;
  const n = hhmm.padStart(4, "0");
  return Number(n.slice(0, 2)) * 60 + Number(n.slice(2));
};

function parsePharmacy(item: string): Pharmacy | null {
  const lat = Number(tag(item, "wgs84Lat"));
  const lon = Number(tag(item, "wgs84Lon"));
  const id = tag(item, "hpid");
  if (!id || !Number.isFinite(lat) || !Number.isFinite(lon)) return null;
  const hours: Hours[] = [];
  for (let d = 1; d <= 8; d++) {
    const s = toMinutes(tag(item, `dutyTime${d}s`));
    let e = toMinutes(tag(item, `dutyTime${d}c`));
    if (s === null || e === null) {
      hours.push(null);
      continue;
    }
    if (e <= s) e += 1440; // 끝 시간이 시작보다 이르면 다음날 새벽까지
    hours.push([s, e]);
  }
  return { id, name: tag(item, "dutyName"), addr: tag(item, "dutyAddr"), tel: tag(item, "dutyTel1"), lat, lon, hours };
}

async function fetchAllPharmacies(): Promise<Pharmacy[]> {
  const first = await callApi(PHARMACY_API, { pageNo: "1", numOfRows: String(PAGE_SIZE) });
  const pages = Math.ceil(totalCount(first) / PAGE_SIZE);
  // 나머지 페이지는 동시에 받아서 시간을 줄인다
  const rest = await Promise.all(
    Array.from({ length: pages - 1 }, (_, i) => callApi(PHARMACY_API, { pageNo: String(i + 2), numOfRows: String(PAGE_SIZE) }))
  );
  const list = [first, ...rest].flatMap(items).map(parsePharmacy).filter((p): p is Pharmacy => p !== null);
  if (list.length === 0) throw new Error("약국 목록이 비어 있어요");
  return list;
}

async function fetchHolidays(years: number[]): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const xml of await Promise.all(years.map((y) => callApi(HOLIDAY_API, { solYear: String(y), numOfRows: "100" })))) {
    for (const it of items(xml)) {
      if (tag(it, "isHoliday") === "Y") result[tag(it, "locdate")] = tag(it, "dateName");
    }
  }
  return result;
}

// ── 저장소 ──
const store = () => getStore("owl-pharmacy");

export async function syncDataset(): Promise<Dataset> {
  const year = kstNow().year;
  const [pharmacies, holidays] = await Promise.all([fetchAllPharmacies(), fetchHolidays([year, year + 1])]);
  const data: Dataset = { pharmacies, holidays, syncedAt: Date.now() };
  await store().setJSON("dataset", data);
  return data;
}

// 같은 함수 인스턴스가 살아 있는 동안은 메모리에 들고 있다가 재사용 (매 요청마다 수 MB를 읽지 않게)
let cache: { data: Dataset; loadedAt: number } | null = null;
const MEMORY_TTL = 10 * 60 * 1000;
const STALE_AFTER = 36 * 60 * 60 * 1000; // 예약 동기화가 실패해서 이보다 오래되면 요청 때 다시 받는다

export async function loadDataset(): Promise<Dataset> {
  if (cache && Date.now() - cache.loadedAt < MEMORY_TTL) return cache.data;
  let data = (await store().get("dataset", { type: "json" })) as Dataset | null;
  if (!data || Date.now() - data.syncedAt > STALE_AFTER) {
    try {
      data = await syncDataset();
    } catch (e) {
      if (!data) throw e; // 저장본이 아예 없을 때만 실패, 오래된 저장본이라도 있으면 그걸 쓴다
    }
  }
  cache = { data, loadedAt: Date.now() };
  return data;
}

// ── 시간 계산 (한국 시간 기준) ──
export function kstNow(at = Date.now()) {
  const d = new Date(at + 9 * 60 * 60 * 1000); // UTC → KST
  const ymd = (x: Date) =>
    `${x.getUTCFullYear()}${String(x.getUTCMonth() + 1).padStart(2, "0")}${String(x.getUTCDate()).padStart(2, "0")}`;
  const yesterday = new Date(d.getTime() - 24 * 60 * 60 * 1000);
  return {
    year: d.getUTCFullYear(),
    date: ymd(d),
    yesterday: ymd(yesterday),
    weekday: ((d.getUTCDay() + 6) % 7) + 1, // 월=1 … 일=7
    yesterdayWeekday: ((yesterday.getUTCDay() + 6) % 7) + 1,
    minutes: d.getUTCHours() * 60 + d.getUTCMinutes(),
  };
}

// 그날 적용되는 운영 시간 칸: 공휴일이면 8번째(공휴일), 아니면 요일
export const dayIndex = (weekday: number, isHoliday: boolean) => (isHoliday ? 7 : weekday - 1);

export function isOpenNow(p: Pharmacy, holidays: Record<string, string>, now = kstNow()): boolean {
  const today = p.hours[dayIndex(now.weekday, now.date in holidays)];
  if (today && now.minutes >= today[0] && now.minutes < today[1]) return true;
  // 어제 영업이 자정을 넘겨 이어지는 경우 (예: 어제 09:00~26:00 → 오늘 02:00까지)
  const yesterday = p.hours[dayIndex(now.yesterdayWeekday, now.yesterday in holidays)];
  return !!yesterday && yesterday[1] > 1440 && now.minutes + 1440 < yesterday[1];
}

// ── 주소 → 지역 ──
// 주소에 줄임말이나 예전 이름이 섞여 있어서 정식 이름으로 맞춘다 ("경기" → "경기도")
const SIDO_ALIASES: Record<string, string> = {
  서울: "서울특별시",
  부산: "부산광역시",
  대구: "대구광역시",
  인천: "인천광역시",
  광주: "광주광역시",
  대전: "대전광역시",
  울산: "울산광역시",
  세종: "세종특별자치시",
  경기: "경기도",
  강원: "강원특별자치도",
  강원도: "강원특별자치도",
  충북: "충청북도",
  충남: "충청남도",
  전북: "전북특별자치도",
  전라북도: "전북특별자치도",
  전남: "전라남도",
  경북: "경상북도",
  경남: "경상남도",
  제주: "제주특별자치도",
  제주도: "제주특별자치도",
};

// "경기도 수원시 장안구 ..." → { sido: "경기도", sigungu: "수원시 장안구" }
// 일부 약국만 새 이름 "전남광주통합특별시"로 등록되어 있어서, 대부분이 쓰는 예전 이름으로 나눈다
// (광주의 5개 구 → 광주광역시, 나머지 시·군 → 전라남도)
const GWANGJU_GU = new Set(["동구", "서구", "남구", "북구", "광산구"]);

export function regionOf(addr: string): { sido: string; sigungu: string } {
  const [rawSido = "", second = "", third = ""] = addr.split(/\s+/);
  let sido = SIDO_ALIASES[rawSido] ?? rawSido;
  if (sido === "전남광주통합특별시") sido = GWANGJU_GU.has(second) ? "광주광역시" : "전라남도";
  if (sido.startsWith("세종")) return { sido, sigungu: "" }; // 세종시는 시/군/구가 없음
  if (/시$/.test(second) && /구$/.test(third)) return { sido, sigungu: `${second} ${third}` };
  return { sido, sigungu: /[시군구]$/.test(second) ? second : "" };
}
