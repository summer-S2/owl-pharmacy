<!-- 목록 탭 -->
<script setup lang="ts">
import { computed, onMounted } from "vue";
import { LoaderCircle } from "lucide-vue-next";
import PharmacyCard from "../components/PharmacyCard.vue";
import { canSearch, runSearch, search } from "../search";

const items = computed(() => search.result?.items ?? []);
const hasMore = computed(() => !!search.result && search.result.total > items.value.length);

onMounted(() => (search.baseLimit = 50));
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
    <p v-else-if="search.loading && !search.result" class="empty"><LoaderCircle :size="18" class="spin" /> 찾는 중...</p>
    <template v-else-if="search.result">
      <p class="count">
        {{ search.result.total.toLocaleString() }}곳
        <span v-if="search.coords"> · 가까운 순</span>
      </p>
      <p v-if="!items.length" class="empty">
        조건에 맞는 약국이 없어요.
        <template v-if="search.onlyOpen"><br />'지금 영업 중'을 끄면 더 보여요.</template>
      </p>
      <PharmacyCard v-for="p in items" :key="p.id" :p="p" :holiday-name="search.result.now.holidayName" />
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
</style>
