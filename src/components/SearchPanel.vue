<!-- 검색 조건: 내 주변 / 지역 / 이름 + 필터 -->
<script setup lang="ts">
import { computed, onMounted, ref, watch, type Component } from "vue";
import { Check, LocateFixed, Map, Search } from "lucide-vue-next";
import { fetchRegions, type Region } from "../api";
import { locate, runSearch, search, type Mode } from "../search";

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
const sigunguList = computed(() => regions.value.find((r) => r.sido === search.sido)?.sigungu ?? []);

const MODES: { key: Mode; label: string; icon: Component }[] = [
  { key: "near", label: "내 주변", icon: LocateFixed },
  { key: "region", label: "지역", icon: Map },
  { key: "name", label: "이름", icon: Search },
];

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
    <div class="modes" role="tablist">
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

    <!-- 내 주변 (<template>은 화면에 그려지지 않는 묶음용 태그) -->
    <template v-if="search.mode === 'near'">
      <div class="row">
        <button class="btn primary grow" :disabled="search.locating" @click="locate">
          <LocateFixed :size="18" />
          {{ search.locating ? "위치 찾는 중..." : search.coords ? "내 위치 다시 찾기" : "내 위치로 찾기" }}
        </button>
      </div>
      <p v-if="search.locationError" class="error">{{ search.locationError }}</p>
    </template>

    <!-- 지역 -->
    <template v-else-if="search.mode === 'region'">
      <div class="row">
        <!-- v-model: 입력값과 상태를 양방향으로 연결 -->
        <select v-model="search.sido" class="grow" @change="onSido">
          <option value="">시/도 선택</option>
          <option v-for="r in regions" :key="r.sido" :value="r.sido">{{ r.sido }}</option>
        </select>
        <select
          v-model="search.sigungu"
          class="grow"
          :disabled="!search.sido || !sigunguList.length"
          @change="runSearch()"
        >
          <option value="">{{ search.sido && !sigunguList.length ? "-" : "시/군/구 전체" }}</option>
          <option v-for="s in sigunguList" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <p v-if="regionError" class="error">{{ regionError }}</p>
    </template>

    <!-- 이름 -->
    <form v-else class="row" @submit.prevent="runSearch()">
      <input v-model="search.q" class="grow" type="search" placeholder="약국 이름 (예: 온누리)" enterkeyhint="search" />
      <button class="btn primary" type="submit"><Search :size="18" />검색</button>
    </form>

    <div class="filters">
      <label class="chip" :class="{ on: search.onlyOpen }">
        <input v-model="search.onlyOpen" type="checkbox" />
        <Check v-if="search.onlyOpen" :size="16" />
        지금 영업 중
      </label>
      <label class="chip" :class="{ on: search.onlyHoliday }">
        <input v-model="search.onlyHoliday" type="checkbox" />
        <Check v-if="search.onlyHoliday" :size="16" />
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
.modes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 14px;
  padding: 4px;
  gap: 4px;
}
.mode {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 0;
  background: none;
  color: var(--muted);
  padding: 10px 4px;
  border-radius: 10px;
  font-size: 15px;
  cursor: pointer;
}
.mode.active {
  background: var(--accent);
  color: var(--on-accent);
  font-weight: 700;
}
.row {
  display: flex;
  gap: 8px;
}
.grow {
  flex: 1;
  min-width: 0;
}
.filters {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 8px 14px;
  border-radius: 999px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--muted);
  font-size: 14px;
  cursor: pointer;
  user-select: none;
}
.chip input {
  display: none;
}
.chip.on {
  border-color: var(--accent);
  color: var(--accent);
  font-weight: 700;
}
.error {
  margin: 0;
  color: var(--danger);
  font-size: 14px;
}
</style>
