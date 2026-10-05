<!-- 목록 탭 -->
<script setup lang="ts">
import { computed, onMounted } from "vue";
import EmptyResult from "../components/EmptyResult.vue";
import PharmacyCard from "../components/PharmacyCard.vue";
import { canSearch, runSearch, search } from "../search";

const items = computed(() => search.result?.items ?? []);
const hasMore = computed(() => !!search.result && search.result.total > items.value.length);

onMounted(() => (search.baseLimit = 50));

// 카드가 차례로 떠오르는 간격: 처음 몇 개만 시간차를 두고 나머지는 거의 동시에
const delay = (i: number) => `${Math.min(i % 50, 8) * 50}ms`;
</script>

<template>
  <section class="list">
    <p v-if="!canSearch()" class="empty">
      {{
        search.mode === "near"
          ? "'내 위치로 찾기'를 눌러 주세요"
          : search.mode === "region"
            ? "시/도를 골라 주세요"
            : "약국 이름을 검색해 주세요"
      }}
    </p>
    <p v-else-if="search.error" class="empty error">{{ search.error }}</p>

    <!-- 처음 불러오는 중: 카드 모양 자리 표시가 반짝인다 -->
    <div v-else-if="search.loading && !search.result" class="skeletons" aria-label="불러오는 중">
      <div v-for="n in 3" :key="n" class="skeleton">
        <span class="bar w60" />
        <span class="bar w90" />
        <span class="bar w40" />
      </div>
    </div>

    <template v-else-if="search.result">
      <p v-if="search.result.total" class="count">
        {{ search.result.total.toLocaleString() }}곳
        <span v-if="search.mode === 'area'"> · 지도에서 고른 곳에서 가까운 순</span>
        <span v-else-if="search.coords"> · 가까운 순</span>
      </p>
      <EmptyResult v-if="!items.length && !search.loading" />
      <!-- TransitionGroup: 목록에 들어오는 카드마다 애니메이션 -->
      <TransitionGroup tag="div" name="card" class="cards" :class="{ dim: search.loading }">
        <PharmacyCard
          v-for="(p, i) in items"
          :key="p.id"
          :p="p"
          :holiday-name="search.result.now.holidayName"
          :style="{ '--delay': delay(i) }"
        />
      </TransitionGroup>
      <button v-if="hasMore" class="btn more" :disabled="search.loading" @click="runSearch(search.limit + 50)">
        {{ search.loading ? "불러오는 중..." : "더 보기" }}
      </button>
    </template>
  </section>
</template>

<style scoped>
.list {
  display: grid;
  gap: 12px;
}
.cards {
  display: grid;
  gap: 12px;
  transition: opacity 0.2s;
}
/* 다시 검색하는 동안 이전 결과를 살짝 흐리게 */
.cards.dim {
  opacity: 0.55;
}
.count {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
}
.empty {
  margin: 24px 0;
  text-align: center;
  color: var(--muted);
  line-height: 1.6;
}
.error {
  color: var(--danger);
}
.more {
  justify-self: center;
  min-width: 160px;
}

/* 카드가 아래에서 차례로 떠오른다 */
.card-enter-active {
  transition:
    opacity 0.4s ease,
    transform 0.45s cubic-bezier(0.2, 1, 0.3, 1);
  transition-delay: var(--delay);
}
.card-enter-from {
  opacity: 0;
  transform: translateY(16px);
}

/* 자리 표시 (스켈레톤) */
.skeletons {
  display: grid;
  gap: 12px;
}
.skeleton {
  display: grid;
  gap: 10px;
  padding: 18px 16px;
  border-radius: 18px;
  border: 1px solid var(--line);
  background: var(--card);
}
.bar {
  display: block;
  height: 14px;
  border-radius: 7px;
  background: linear-gradient(90deg, var(--card-2) 0%, var(--line) 50%, var(--card-2) 100%);
  background-size: 200% 100%;
  animation: shimmer 1.2s ease-in-out infinite;
}
.w40 {
  width: 40%;
}
.w60 {
  width: 60%;
  height: 18px;
}
.w90 {
  width: 90%;
}
@keyframes shimmer {
  from {
    background-position: 100% 0;
  }
  to {
    background-position: -100% 0;
  }
}
</style>
