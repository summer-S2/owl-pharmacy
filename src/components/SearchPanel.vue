<!-- 검색 조건: 내 주변 / 지역 / 이름 + 필터 -->
<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from "vue";
import { Check, LocateFixed, Map, MapPin, Search } from "lucide-vue-next";
import { fetchRegions, type Region } from "../api";
import { locate, runSearch, search, type Mode } from "../search";
import SelectBox from "./SelectBox.vue";

const regions = ref<Region[]>([]);
const regionError = ref("");

onMounted(async () => {
  try {
    regions.value = await fetchRegions();
  } catch {
    regionError.value = "지역 목록을 불러오지 못했어요";
  }
});

// computed: 다른 값에서 계산되는 값 (의존하는 값이 바뀌면 자동으로 다시 계산)
const sidoOptions = computed(() => regions.value.map((r) => ({ value: r.sido, label: r.sido })));
const sigunguList = computed(() => regions.value.find((r) => r.sido === search.sido)?.sigungu ?? []);
const sigunguOptions = computed(() => [
  { value: "", label: "시/군/구 전체" },
  ...sigunguList.value.map((s) => ({ value: s, label: s })),
]);

const MODES: { key: Mode; label: string; icon: Component }[] = [
  { key: "near", label: "내 주변", icon: LocateFixed },
  { key: "region", label: "지역", icon: Map },
  { key: "name", label: "이름", icon: Search },
];
// 선택 표시가 미끄러져 갈 위치 (지도에서 고른 곳이면 표시 숨김)
const modeIndex = computed(() => MODES.findIndex((m) => m.key === search.mode));

function selectMode(mode: Mode) {
  search.mode = mode;
  if (mode === "near" && !search.coords) locate();
  else runSearch();
}

// 시/도를 바꾸면 시/군/구는 처음부터 다시 고르게
function onSido() {
  search.sigungu = "";
  runSearch();
}

// watch: 값이 바뀔 때마다 실행 (필터를 바꾸면 바로 다시 검색)
watch(() => [search.onlyOpen, search.onlyHoliday], () => runSearch());
</script>

<template>
  <section class="panel">
    <div class="modes" role="tablist" :style="{ '--i': modeIndex }">
      <span class="indicator" :class="{ hidden: modeIndex < 0 }" aria-hidden="true" />
      <button
        v-for="m in MODES"
        :key="m.key"
        class="mode"
        :class="{ active: search.mode === m.key }"
        role="tab"
        :aria-selected="search.mode === m.key"
        @click="selectMode(m.key)"
      >
        <!-- component :is → 변수에 담긴 컴포넌트(아이콘)를 그린다 -->
        <component :is="m.icon" :size="18" />
        {{ m.label }}
      </button>
    </div>

    <!-- 검색 방법이 바뀌면 아래 내용이 부드럽게 바뀐다 (mode="out-in": 나간 뒤에 들어오기) -->
    <Transition name="swap" mode="out-in">
      <!-- 내 주변 -->
      <div v-if="search.mode === 'near'" key="near" class="stack">
        <button class="btn primary big" :disabled="search.locating" @click="locate">
          <LocateFixed :size="18" :class="{ pulse: search.locating }" />
          {{ search.locating ? "위치 찾는 중..." : search.coords ? "내 위치 다시 찾기" : "내 위치로 찾기" }}
        </button>
        <p v-if="search.locationError" class="error">{{ search.locationError }}</p>
      </div>

      <!-- 지역 -->
      <div v-else-if="search.mode === 'region'" key="region" class="stack">
        <div class="row">
          <!-- v-model: 입력값과 상태를 양방향으로 연결 -->
          <SelectBox v-model="search.sido" class="grow" :options="sidoOptions" placeholder="시/도 선택" @change="onSido" />
          <SelectBox
            v-model="search.sigungu"
            class="grow"
            :options="sigunguOptions"
            :placeholder="search.sido && !sigunguList.length ? '-' : '시/군/구 전체'"
            :disabled="!search.sido || !sigunguList.length"
            @change="runSearch()"
          />
        </div>
        <p v-if="regionError" class="error">{{ regionError }}</p>
      </div>

      <!-- 이름 -->
      <form v-else-if="search.mode === 'name'" key="name" class="row" @submit.prevent="runSearch()">
        <div class="search-input grow">
          <Search :size="18" class="search-icon" />
          <input v-model="search.q" type="search" placeholder="약국 이름 (예: 온누리)" enterkeyhint="search" />
        </div>
        <button class="btn primary" type="submit">검색</button>
      </form>

      <!-- 지도에서 고른 곳 ("이 지역에서 찾기") -->
      <p v-else key="area" class="area-note"><MapPin :size="16" />지도에서 고른 곳 주변 약국을 보여주고 있어요</p>
    </Transition>

    <div class="filters">
      <label class="chip" :class="{ on: search.onlyOpen }">
        <input v-model="search.onlyOpen" type="checkbox" />
        <Transition name="check"><Check v-if="search.onlyOpen" :size="16" /></Transition>
        지금 영업 중
      </label>
      <label class="chip" :class="{ on: search.onlyHoliday }">
        <input v-model="search.onlyHoliday" type="checkbox" />
        <Transition name="check"><Check v-if="search.onlyHoliday" :size="16" /></Transition>
        공휴일 운영
      </label>
    </div>
  </section>
</template>

<style scoped>
.panel {
  display: grid;
  gap: 10px;
}

/* 검색 방법: 선택 표시가 옆으로 미끄러진다 */
.modes {
  position: relative;
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 16px;
  padding: 4px;
  gap: 4px;
}
.indicator {
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc((100% - 16px) / 3);
  border-radius: 12px;
  background: var(--accent);
  box-shadow: 0 4px 14px color-mix(in srgb, var(--accent) 35%, transparent);
  transform: translateX(calc(var(--i) * (100% + 4px)));
  transition: transform 0.35s cubic-bezier(0.3, 1.3, 0.5, 1), opacity 0.2s;
}
.indicator.hidden {
  opacity: 0;
}
.mode {
  position: relative; /* 표시 위에 글자가 오도록 */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  background: none;
  color: var(--muted);
  padding: 10px 4px;
  border-radius: 12px;
  font-size: 15px;
  cursor: pointer;
  transition: color 0.25s, transform 0.12s;
}
.mode:active {
  transform: scale(0.95);
}
.mode.active {
  color: var(--on-accent);
  font-weight: 700;
}

.stack {
  display: grid;
  gap: 8px;
}
.row {
  display: flex;
  gap: 8px;
}
.grow {
  flex: 1;
  min-width: 0;
}
.big {
  width: 100%;
  min-height: 50px;
  font-size: 16px;
}

/* 이름 검색칸: 돋보기 아이콘이 안에 들어간 모양 */
.search-input {
  position: relative;
  display: flex;
  align-items: center;
}
.search-input input {
  width: 100%;
  padding-left: 40px;
}
.search-icon {
  position: absolute;
  left: 14px;
  color: var(--muted);
  pointer-events: none;
}

/* 필터 칩: 켜면 톡 튄다 */
.filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 9px 16px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--muted);
  font-size: 14px;
  cursor: pointer;
  user-select: none;
  transition: background 0.2s, color 0.2s, border-color 0.2s, transform 0.12s;
}
.chip:hover {
  border-color: color-mix(in srgb, var(--accent) 60%, var(--line));
}
.chip:active {
  transform: scale(0.94);
}
.chip input {
  display: none;
}
.chip.on {
  border-color: var(--accent);
  background: color-mix(in srgb, var(--accent) 14%, var(--card));
  color: var(--accent);
  font-weight: 700;
  animation: pop 0.3s cubic-bezier(0.3, 1.6, 0.5, 1);
}
@keyframes pop {
  50% {
    transform: scale(1.08);
  }
}
.check-enter-active {
  transition: transform 0.25s cubic-bezier(0.3, 1.6, 0.5, 1), opacity 0.2s;
}
.check-enter-from {
  transform: scale(0);
  opacity: 0;
}

.area-note {
  display: flex;
  align-items: center;
  gap: 6px;
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}
.error {
  margin: 0;
  color: var(--danger);
  font-size: 14px;
}

/* 검색 방법 바꿀 때 아래 내용 전환 */
.swap-enter-active,
.swap-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}
.swap-enter-from {
  opacity: 0;
  transform: translateY(6px);
}
.swap-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

/* 위치 찾는 중: 아이콘이 두근두근 */
.pulse {
  animation: beat 1s ease-in-out infinite;
}
@keyframes beat {
  50% {
    transform: scale(1.25);
  }
}
</style>
