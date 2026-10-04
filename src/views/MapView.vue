<!-- 지도 탭: 검색 결과를 카카오맵에 핀으로 보여주고, 핀을 누르면 약국 카드 -->
<script setup lang="ts">
/* eslint-disable @typescript-eslint/no-explicit-any */
import { computed, onBeforeUnmount, onMounted, ref, shallowRef, watch } from "vue";
import { LoaderCircle, X } from "lucide-vue-next";
import PharmacyCard from "../components/PharmacyCard.vue";
import { loadKakaoMaps } from "../kakao";
import { settings } from "../settings";
import { findTheme } from "../themes";
import { canSearch, runSearch, search } from "../search";

const MAP_LIMIT = 200; // 지도에는 한 번에 최대 200곳

const el = ref<HTMLDivElement | null>(null); // 지도를 그릴 div
const map = shallowRef<any>(null); // shallowRef: 카카오 지도 객체처럼 내부를 추적할 필요 없는 큰 객체용
const mapError = ref("");
let kakao: any = null;
let markers: any[] = [];
let myMarker: any = null;

const selected = computed(() => search.result?.items.find((p) => p.id === search.selectedId) ?? null);

// 약국 핀 이미지: 영업 중은 테마 포인트 색, 아니면 테마의 영업 종료 색 (가운데 약국 십자)
function pinSvg(open: boolean) {
  const v = findTheme(settings.themeId).vars;
  return (
    "data:image/svg+xml;charset=utf-8," +
    encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="40" viewBox="0 0 30 40"><path d="M15 0C6.7 0 0 6.7 0 15c0 10.5 15 25 15 25s15-14.5 15-25C30 6.7 23.3 0 15 0z" fill="${open ? v.accent : v.pinOff}" stroke="${v.pinInk}" stroke-width="2"/><path d="M15 9.5v11M9.5 15h11" stroke="${open ? v.onAccent : v.pinInk}" stroke-width="3" stroke-linecap="round"/></svg>`
    )
  );
}

function drawMarkers() {
  if (!map.value || !kakao) return;
  markers.forEach((m) => m.setMap(null));
  markers = [];
  const items = search.result?.items ?? [];
  const bounds = new kakao.maps.LatLngBounds();
  const images = {
    open: new kakao.maps.MarkerImage(pinSvg(true), new kakao.maps.Size(30, 40), { offset: new kakao.maps.Point(15, 40) }),
    off: new kakao.maps.MarkerImage(pinSvg(false), new kakao.maps.Size(30, 40), { offset: new kakao.maps.Point(15, 40) }),
  };
  for (const p of items) {
    const pos = new kakao.maps.LatLng(p.lat, p.lon);
    const marker = new kakao.maps.Marker({ position: pos, image: p.openNow ? images.open : images.off, title: p.name });
    kakao.maps.event.addListener(marker, "click", () => {
      search.selectedId = p.id;
      map.value.panTo(pos);
    });
    marker.setMap(map.value);
    markers.push(marker);
    bounds.extend(pos);
  }
  if (search.coords) bounds.extend(new kakao.maps.LatLng(search.coords.lat, search.coords.lon));
  if (items.length) map.value.setBounds(bounds, 40, 40, 40, 40);
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
    : new kakao.maps.LatLng(37.5665, 126.978); // 기본: 서울시청
  map.value = new kakao.maps.Map(el.value, { center, level: 5 });
  kakao.maps.event.addListener(map.value, "click", () => (search.selectedId = null));
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
    <p v-if="mapError" class="overlay error">{{ mapError }}</p>
    <p v-else-if="!canSearch()" class="overlay">
      {{ search.mode === "near" ? "'내 위치로 찾기'를 눌러 주세요" : search.mode === "region" ? "시/도를 골라 주세요" : "약국 이름을 검색해 주세요" }}
    </p>
    <p v-else-if="search.loading" class="overlay"><LoaderCircle :size="16" class="spin" /> 찾는 중...</p>
    <p v-else-if="search.result" class="overlay small">
      {{ search.result.items.length.toLocaleString() }}곳 표시
      <template v-if="search.result.total > search.result.items.length">
        (전체 {{ search.result.total.toLocaleString() }}곳 중 {{ search.coords ? "가까운 순" : "이름 순" }})
      </template>
    </p>

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
.overlay {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 5;
  margin: 0;
  padding: 8px 14px;
  border-radius: 999px;
  background: color-mix(in srgb, var(--card) 92%, transparent);
  border: 1px solid var(--line);
  color: var(--text);
  font-size: 14px;
  white-space: nowrap;
}
.overlay.small {
  font-size: 12px;
}
.overlay.error {
  white-space: normal;
  width: max-content;
  max-width: calc(100% - 24px);
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
