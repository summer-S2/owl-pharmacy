<!-- 지도 탭: 검색 결과를 카카오맵에 핀으로 보여주고, 핀을 누르면 약국 카드 -->
<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { ChevronDown, LoaderCircle, RotateCw, X } from "lucide-vue-next";
import EmptyResult from "../components/EmptyResult.vue";
import PharmacyCard from "../components/PharmacyCard.vue";
import { loadKakaoMaps } from "../kakao";
import { settings } from "../settings";
import { findTheme } from "../themes";
import { MARKER_SIZE, markerSvg } from "../owl";
import { canSearch, runSearch, search } from "../search";

const MAP_LIMIT = 200; // 지도에는 한 번에 최대 200곳
const NEAREST_IN_VIEW = 5; // 내 주변: 가장 가까운 몇 곳이 보이게 확대할지
const MIN_LEVEL = 3; // 이보다 더 확대하지 않음 (카카오 지도 레벨: 숫자가 작을수록 확대)
const MAX_AREA_LEVEL = 8; // "이 지역에서 찾기"는 이 레벨까지 확대했을 때만 (너무 넓으면 결과가 가운데에만 몰림)
// 위치가 없을 때 처음 보여줄 범위: 대한민국 (제주 ~ 휴전선, 서해안 ~ 울릉도. 독도까지 넣으면 너무 축소돼서 제외)
const KOREA = { south: 33.1, west: 125.9, north: 38.6, east: 130.95 };
const KOREA_MAINLAND_CENTER = { lat: 36.3, lon: 127.9 };

const el = ref<HTMLDivElement | null>(null); // 지도를 그릴 div
const map = shallowRef<any>(null); // shallowRef: 카카오 지도 객체처럼 내부를 추적할 필요 없는 큰 객체용
const mapError = ref("");
let kakao: any = null;
// 약국 id → 마커 (선택한 마커 모양을 바꾸려고 기억해 둔다)
let markers = new Map<string, { marker: any; open: boolean }>();
let images: { open: any; off: any; active: any } | null = null;
const ACTIVE_SCALE = 1.3; // 선택한 마커는 이만큼 크게
let myMarker: any = null;
let fitting = false; // 코드로 지도 범위를 맞추는 중 (이때 생기는 확대·이동은 사용자가 한 게 아님)
const moved = ref(false); // 사용자가 지도를 직접 움직였는지 → "이 지역에서 찾기" 버튼
const level = ref(0);

const selected = computed(() => search.result?.items.find((p) => p.id === search.selectedId) ?? null);
// 바텀시트: 마커를 누르면 화면 아래에서 올라온다. 화살표로 접었다 펼 수 있다
const sheetOpen = ref(true);
watch(
  () => search.selectedId,
  (id, prev) => {
    if (id) sheetOpen.value = true; // 마커를 누르면 (접혀 있었어도) 다시 펼친다
    // 선택한 마커 표시를 옮긴다
    if (prev) styleMarker(prev);
    if (id) styleMarker(id);
  }
);
function closeSheet() {
  search.selectedId = null;
}

// 약국 마커: 로고 모양 말풍선. 어두운 바탕에 부엉이를 테마 색으로 그린다
// 영업 중은 포인트 색 부엉이, 영업 종료는 흐린 색 부엉이 (테마를 바꾸면 다시 그림)
// 선택한 마커(active)는 색을 뒤집어 포인트 색 바탕에 진한 부엉이로
function pinSvg(kind: "open" | "off" | "active") {
  const v = findTheme(settings.themeId).vars;
  const svg =
    kind === "open"
      ? markerSvg(v.onAccent, v.accent, v.accent)
      : kind === "off"
        ? markerSvg(v.pinInk, v.pinOff, v.pinOff)
        : markerSvg(v.accent, v.onAccent, v.onAccent);
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

// 마커 이미지 3종 (꼬리 끝이 약국 위치를 가리키도록 offset)
function makeImages() {
  const { width: w, height: h } = MARKER_SIZE;
  const normal = (kind: "open" | "off") =>
    new kakao.maps.MarkerImage(pinSvg(kind), new kakao.maps.Size(w, h), {
      offset: new kakao.maps.Point(w / 2, (47 / 50) * h),
    });
  const W = Math.round(w * ACTIVE_SCALE);
  const H = Math.round(h * ACTIVE_SCALE);
  return {
    open: normal("open"),
    off: normal("off"),
    active: new kakao.maps.MarkerImage(pinSvg("active"), new kakao.maps.Size(W, H), {
      offset: new kakao.maps.Point(W / 2, Math.round((47 / 50) * H)),
    }),
  };
}

// 마커 하나의 모양: 선택한 것은 크게 맨 위, 나머지는 영업 중이 위
function styleMarker(id: string) {
  const m = markers.get(id);
  if (!m || !images) return;
  const active = id === search.selectedId;
  m.marker.setImage(active ? images.active : m.open ? images.open : images.off);
  m.marker.setZIndex(active ? 10 : m.open ? 2 : 1);
}

function drawMarkers() {
  if (!map.value || !kakao) return;
  markers.forEach((m) => m.marker.setMap(null));
  markers = new Map();
  images = makeImages();
  const items = search.result?.items ?? [];
  for (const p of items) {
    const pos = new kakao.maps.LatLng(p.lat, p.lon);
    const marker = new kakao.maps.Marker({ position: pos, title: p.name });
    kakao.maps.event.addListener(marker, "click", () => {
      search.selectedId = p.id;
      map.value.panTo(pos);
    });
    markers.set(p.id, { marker, open: p.openNow });
    styleMarker(p.id);
    marker.setMap(map.value);
  }
  fitView();
}

// 코드로 지도 범위를 바꿀 때는 이걸 거쳐서 "사용자가 움직였다"로 오해하지 않게 한다
function setBoundsQuietly(bounds: any) {
  fitting = true;
  map.value.setBounds(bounds, 40, 40, 40, 40);
  if (map.value.getLevel() < MIN_LEVEL) map.value.setLevel(MIN_LEVEL);
  moved.value = false;
}

// 지도 보이는 범위 맞추기
// - 내 주변: 내 위치를 가운데에 두고 가장 가까운 몇 곳만 보이게
// - 지역/이름: 결과가 모두 보이게
// - 지도에서 고른 곳: 사용자가 보던 화면 그대로 (움직이지 않음)
function fitView() {
  const items = search.result?.items ?? [];
  if (!map.value || !kakao || !items.length || search.mode === "area") return;
  const bounds = new kakao.maps.LatLngBounds();
  if (search.mode === "near" && search.coords) {
    const { lat, lon } = search.coords;
    bounds.extend(new kakao.maps.LatLng(lat, lon));
    // 결과는 가까운 순이라 앞에서부터. 내 위치 반대편 지점도 넣어서 내 위치가 가운데에 오게 한다
    for (const p of items.slice(0, NEAREST_IN_VIEW)) {
      bounds.extend(new kakao.maps.LatLng(p.lat, p.lon));
      bounds.extend(new kakao.maps.LatLng(2 * lat - p.lat, 2 * lon - p.lon));
    }
  } else {
    for (const p of items) bounds.extend(new kakao.maps.LatLng(p.lat, p.lon));
  }
  setBoundsQuietly(bounds);
}

// "이 지역에서 찾기": 지금 보이는 지도 화면 안의 약국 (가운데에서 가까운 순)
function searchHere() {
  if (!map.value || level.value > MAX_AREA_LEVEL) return;
  const c = map.value.getCenter();
  const b = map.value.getBounds();
  const sw = b.getSouthWest();
  const ne = b.getNorthEast();
  search.areaCenter = { lat: c.getLat(), lon: c.getLng() };
  search.areaBounds = [sw.getLat(), sw.getLng(), ne.getLat(), ne.getLng()];
  search.mode = "area";
  moved.value = false;
  runSearch(MAP_LIMIT);
}

function drawMyLocation() {
  if (!map.value || !kakao) return;
  if (myMarker) myMarker.setMap(null);
  myMarker = null;
  if (!search.coords) return;
  const pos = new kakao.maps.LatLng(search.coords.lat, search.coords.lon);
  myMarker = new kakao.maps.CustomOverlay({ position: pos, content: '<div class="my-dot"></div>', zIndex: 3 });
  myMarker.setMap(map.value);
}

onMounted(async () => {
  search.baseLimit = MAP_LIMIT;
  try {
    kakao = await loadKakaoMaps();
  } catch (e) {
    mapError.value = (e as Error).message;
    return;
  }
  const center = search.coords
    ? new kakao.maps.LatLng(search.coords.lat, search.coords.lon)
    : new kakao.maps.LatLng(36.5, 127.8);
  map.value = new kakao.maps.Map(el.value, { center, level: 5 });
  kakao.maps.event.addListener(map.value, "click", () => (sheetOpen.value = false));
  // 사용자가 끌어서 옮기거나 확대·축소하면 "이 지역에서 찾기" 버튼을 띄운다
  kakao.maps.event.addListener(map.value, "dragend", () => (moved.value = true));
  kakao.maps.event.addListener(map.value, "zoom_changed", () => {
    level.value = map.value.getLevel();
    if (!fitting) moved.value = true;
  });
  kakao.maps.event.addListener(map.value, "idle", () => (fitting = false));
  // 위치가 없으면 처음에는 대한민국 전체
  if (!search.coords) {
    setBoundsQuietly(
      new kakao.maps.LatLngBounds(
        new kakao.maps.LatLng(KOREA.south, KOREA.west),
        new kakao.maps.LatLng(KOREA.north, KOREA.east)
      )
    );
    // 대한민국 전체가 들어가는 단계보다 한 단계 더 확대하고, 가운데를 본토 중심(대전 근처)에 둔다
    fitting = true; // 코드로 확대하는 것이라 "이 지역에서 찾기" 버튼을 띄우지 않게
    map.value.setLevel(map.value.getLevel() - 1);
    map.value.setCenter(new kakao.maps.LatLng(KOREA_MAINLAND_CENTER.lat, KOREA_MAINLAND_CENTER.lon));
    moved.value = false;
  }
  level.value = map.value.getLevel();
  // 지도에서는 더 많이 보여주기 위해 결과를 200곳까지 다시 받는다
  if (canSearch() && (search.result?.items.length ?? 0) < Math.min(MAP_LIMIT, search.result?.total ?? 0)) {
    await runSearch(MAP_LIMIT);
  }
  drawMyLocation();
  drawMarkers();
});

// 검색 결과나 내 위치가 바뀌면 다시 그린다
watch(
  () => search.result,
  () => {
    search.selectedId = null;
    drawMarkers();
  }
);
watch(() => search.coords, drawMyLocation);
// 테마를 바꾸면 핀 색도 다시
watch(() => settings.themeId, drawMarkers);

onBeforeUnmount(() => {
  search.selectedId = null;
});
</script>

<template>
  <div class="map-page">
    <section class="map-wrap">
      <div ref="el" class="map"></div>
      <div class="top-overlay">
        <p v-if="mapError" class="overlay error">{{ mapError }}</p>
        <template v-else>
          <button v-if="moved" class="btn primary here" :disabled="level > MAX_AREA_LEVEL" @click="searchHere">
            <RotateCw :size="16" />
            {{ level > MAX_AREA_LEVEL ? "지도를 더 확대해 주세요" : "이 지역에서 찾기" }}
          </button>
          <p v-if="search.loading" class="overlay"><LoaderCircle :size="16" class="spin" /> 찾는 중...</p>
          <p v-else-if="!canSearch() && !moved" class="overlay">지도를 움직여 '이 지역에서 찾기'를 눌러 주세요</p>
          <!-- 검색했는데 결과가 없을 때 -->
          <EmptyResult v-else-if="search.result && !search.result.items.length" compact />
          <!-- 결과가 너무 많아 일부만 보일 때 -->
          <p v-else-if="search.result && search.result.total > search.result.items.length" class="overlay small">
            {{ search.result.items.length }}곳까지만 보여요. 지도를 확대하면 더 정확하게 찾을 수 있어요
          </p>
        </template>
      </div>
    </section>

    <!-- 마커를 누르면 화면 아래에서 올라오는 바텀시트
         Teleport: 화면 맨 바깥(body)에 그려서 지도나 다른 요소에 밀리거나 가려지지 않게 -->
    <Teleport to="body">
      <Transition name="sheet">
        <aside v-if="selected" class="sheet" :class="{ collapsed: !sheetOpen }" aria-label="약국 정보">
          <header class="sheet-head" @click="sheetOpen = !sheetOpen">
            <span class="handle" aria-hidden="true" />
            <strong class="sheet-title">{{ selected.name }}</strong>
            <span class="state" :class="{ open: selected.openNow }">{{ selected.openNow ? "영업 중" : "영업 종료" }}</span>
            <button
              class="icon-btn"
              :aria-label="sheetOpen ? '접기' : '펼치기'"
              :aria-expanded="sheetOpen"
              @click.stop="sheetOpen = !sheetOpen"
            >
              <ChevronDown :size="20" class="toggle" />
            </button>
            <button class="icon-btn" aria-label="닫기" @click.stop="closeSheet"><X :size="18" /></button>
          </header>
          <div class="sheet-body">
            <PharmacyCard :p="selected" :holiday-name="search.result?.now.holidayName ?? null" />
          </div>
        </aside>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.map-wrap {
  position: relative;
}
.map {
  width: 100%;
  height: calc(100dvh - 330px);
  min-height: 360px;
  border-radius: 18px;
  overflow: hidden;
  border: 1px solid var(--line);
}
.top-overlay {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  display: grid;
  justify-items: center;
  gap: 8px;
  width: max-content;
  max-width: calc(100% - 24px);
}
.here {
  min-height: 40px;
  padding: 8px 16px;
  border-radius: 999px;
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.3);
}
.overlay {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  padding: 8px 14px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--card) 92%, transparent);
  border: 1px solid var(--line);
  color: var(--text);
  font-size: 14px;
  text-align: center;
}
.overlay.error {
  color: var(--danger);
}
.map-page {
  display: grid;
  gap: 12px;
}
.overlay.small {
  font-size: 12px;
  line-height: 1.4;
}
/* 바텀시트: 화면 아래에 고정. 접으면 머리(이름 줄)만 보인다 */
.sheet {
  --head: 60px;
  position: fixed;
  z-index: 40;
  left: 50%;
  bottom: 0;
  width: min(640px, 100%);
  max-height: 70dvh;
  display: flex;
  flex-direction: column;
  border-radius: 22px 22px 0 0;
  border: 1px solid var(--line);
  border-bottom: 0;
  background: var(--card);
  box-shadow: 0 -12px 36px rgba(0, 0, 0, 0.4);
  padding-bottom: env(safe-area-inset-bottom);
  transform: translateX(-50%) translateY(0);
  transition: transform 0.35s cubic-bezier(0.2, 1, 0.3, 1);
}
.sheet.collapsed {
  transform: translateX(-50%) translateY(calc(100% - var(--head) - env(safe-area-inset-bottom)));
}
.sheet-head {
  position: relative;
  flex: none;
  height: var(--head);
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 10px 0 18px;
  cursor: pointer;
  user-select: none;
}
.handle {
  position: absolute;
  top: 7px;
  left: 50%;
  width: 40px;
  height: 4px;
  margin-left: -20px;
  border-radius: 2px;
  background: var(--line);
}
.sheet-title {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 17px;
}
.state {
  flex: none;
  font-size: 12px;
  font-weight: 700;
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--line);
  color: var(--muted);
}
.state.open {
  background: var(--accent);
  color: var(--on-accent);
}
.icon-btn {
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  border: 0;
  background: var(--card-2);
  color: var(--text);
  cursor: pointer;
  transition: transform 0.15s, background 0.2s;
}
.icon-btn:active {
  transform: scale(0.9);
}
.toggle {
  transition: transform 0.3s;
}
.collapsed .toggle {
  transform: rotate(180deg);
}
.sheet-body {
  overflow: auto;
  overscroll-behavior: contain;
  padding: 4px 8px 12px;
}
/* 시트 안에서는 카드 테두리·배경 없이, 이름은 머리에 있으니 카드 속 이름 줄은 숨김 */
.sheet-body :deep(.card) {
  border: 0;
  background: transparent;
  box-shadow: none;
  transform: none;
  opacity: 1;
}
.sheet-body :deep(.head) {
  display: none;
}
/* 처음 나타날 때 아래에서 올라오기 */
.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.35s cubic-bezier(0.2, 1, 0.3, 1);
}
.sheet-enter-from,
.sheet-leave-to {
  transform: translateX(-50%) translateY(100%);
}
</style>

<style>
/* 내 위치 점 (카카오 지도 안에 직접 들어가서 scoped를 쓸 수 없음) */
.my-dot {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #4a8cff;
  border: 3px solid #fff;
  box-shadow: 0 0 0 6px rgba(74, 140, 255, 0.3);
}
</style>
