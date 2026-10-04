// 검색 상태: 목록 탭과 지도 탭이 같은 상태를 함께 쓴다.
// reactive()로 만든 객체는 값이 바뀌면 그 값을 쓰는 화면이 자동으로 다시 그려진다 (React의 useState 같은 역할)
import { reactive } from "vue";
import { searchPharmacies, type SearchResult } from "./api";

export type Mode = "near" | "region" | "name";

export const search = reactive({
  mode: "near" as Mode,
  // 내 위치
  coords: null as { lat: number; lon: number } | null,
  locating: false,
  locationError: "",
  // 지역
  sido: "",
  sigungu: "",
  // 이름 검색
  q: "",
  // 필터
  onlyOpen: true,
  onlyHoliday: false,
  // 결과
  baseLimit: 50, // 화면마다 기본으로 불러올 개수 (목록 50, 지도 200)
  limit: 50,
  loading: false,
  error: "",
  result: null as SearchResult | null,
  // 지도에서 고른 약국
  selectedId: null as string | null,
});

// 현재 조건으로 검색할 수 있는지 (지역 모드는 시/도, 이름 모드는 검색어가 필요)
export function canSearch() {
  if (search.mode === "near") return !!search.coords;
  if (search.mode === "region") return !!search.sido;
  return search.q.trim().length > 0;
}

let requestId = 0;
export async function runSearch(limit = search.baseLimit) {
  if (!canSearch()) {
    search.result = null;
    return;
  }
  const id = ++requestId; // 늦게 도착한 예전 응답이 새 결과를 덮어쓰지 않게
  search.loading = true;
  search.error = "";
  search.limit = limit;
  try {
    const result = await searchPharmacies({
      // 위치가 있으면 어떤 모드든 가까운 순으로 정렬하고 거리를 보여준다
      ...(search.coords ?? {}),
      sido: search.mode === "region" ? search.sido : undefined,
      sigungu: search.mode === "region" ? search.sigungu : undefined,
      q: search.mode === "name" ? search.q.trim() : undefined,
      open: search.onlyOpen,
      holiday: search.onlyHoliday,
      limit,
    });
    if (id === requestId) search.result = result;
  } catch (e) {
    if (id === requestId) search.error = (e as Error).message;
  } finally {
    if (id === requestId) search.loading = false;
  }
}

export function locate() {
  if (!navigator.geolocation) {
    search.locationError = "이 브라우저는 위치 정보를 지원하지 않아요";
    return;
  }
  search.locating = true;
  search.locationError = "";
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      search.coords = { lat: pos.coords.latitude, lon: pos.coords.longitude };
      search.locating = false;
      search.mode = "near";
      runSearch();
    },
    (err) => {
      search.locating = false;
      search.locationError =
        err.code === err.PERMISSION_DENIED
          ? "위치 권한이 꺼져 있어요. 지역이나 이름으로 찾아 주세요"
          : "위치를 가져오지 못했어요. 잠시 후 다시 시도해 주세요";
    },
    { enableHighAccuracy: true, timeout: 10_000, maximumAge: 60_000 }
  );
}
