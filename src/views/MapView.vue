<!-- 지도 탭: 검색 결과를 카카오맵에 핀으로 보여주고, 핀을 누르면 약국 카드 -->
<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { LoaderCircle, RotateCw, X } from "lucide-vue-next";
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
let markers: any[] = [];
let myMarker: any = null;
let fitting = false; // 코드로 지도 범위를 맞추는 중 (이때 생기는 확대·이동은 사용자가 한 게 아님)
const moved = ref(false); // 사용자가 지도를 직접 움직였는지 → "이 지역에서 찾기" 버튼
const level = ref(0);

const selected = computed(() => search.result?.items.find((p) => p.id === search.selectedId) ?? null);

// 약국 마커: 로고 모양 말풍선. 어두운 바탕에 부엉이를 테마 색으로 그린다
// 영업 중은 포인트 색 부엉이, 영업 종료는 흐린 색 부엉이 (테마를 바꾸면 다시 그림)
function pinSvg(open: boolean) {
  const v = findTheme(settings.themeId).vars;
  const svg = open ? markerSvg(v.onAccent, v.accent, v.accent) : markerSvg(v.pinInk, v.pinOff, v.pinOff);
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function drawMarkers() {
  if (!map.value || !kakao) return;
  markers.forEach((m) => m.setMap(null));
  markers = [];
  const items = search.result?.items ?? [];
  // offset: 이미지에서 약국 위치를 가리키는 점 (꼬리 끝)
  const size = new kakao.maps.Size(MARKER_SIZE.width, MARKER_SIZE.height);
  const offset = { offset: new kakao.maps.Point(20, 47) };
  const images = {
    open: new kakao.maps.MarkerImage(pinSvg(true), size, offset),
    off: new kakao.maps.MarkerImage(pinSvg(false), size, offset),
  };
  for (const p of items) {
    const pos = new kakao.maps.LatLng(p.lat, p.lon);
    // 영업 중인 곳이 겹칠 때 위에 오도록
    const marker = new kakao.maps.Marker({
      position: pos,
      image: p.openNow ? images.open : images.off,
      title: p.name,
      zIndex: p.openNow ? 2 : 1,
    });
    kakao.maps.event.addListener(marker, "click", () => {
      search.selectedId = p.id;
      map.value.panTo(pos);
    });
    marker.setMap(map.value);
    markers.push(marker);
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

// "이 지역에서 찾기": 지금 보이는 지도의 가운데에서 가까운 약국
function searchHere() {
  if (!map.value || level.value > MAX_AREA_LEVEL) return;
  const c = map.value.getCenter();
  search.areaCenter = { lat: c.getLat(), lon: c.getLng() };
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
  kakao.maps.event.addListener(map.value, "click", () => (search.selectedId = null));
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
      </template>
    </div>

    <!-- 핀을 누르면 아래에서 올라오는 카드 -->
    <Transition name="sheet">
      <div v-if="selected" class="sheet">
        <button class="close" aria-label="닫기" @click="search.selectedId = null"><X :size="18" /></button>
        <PharmacyCard :p="selected" :holiday-name="search.result?.now.holidayName ?? null" />
      </div>
    </Transition>
  </section>
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
.sheet {
  position: absolute;
  left: 8px;
  right: 8px;
  bottom: 8px;
  z-index: 6;
  max-height: 70%;
  overflow: auto;
  border-radius: 18px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.45);
}
.close {
  display: grid;
  place-items: center;
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 1;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 0;
  background: var(--card-2);
  color: var(--text);
  cursor: pointer;
}
.sheet :deep(.head) {
  padding-right: 40px;
}
.sheet-enter-active,
.sheet-leave-active {
  transition: transform 0.2s ease, opacity 0.2s ease;
}
.sheet-enter-from,
.sheet-leave-to {
  transform: translateY(20px);
  opacity: 0;
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
