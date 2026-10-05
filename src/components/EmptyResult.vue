<!-- 검색 결과가 없을 때 안내: 목록 탭과 지도 탭에서 함께 쓴다
     켜져 있는 필터에 맞춰 도움말과 "필터 끄기" 버튼을 보여준다 -->
<script setup lang="ts">
import { SearchX } from "lucide-vue-next";
import { search } from "../search";

defineProps<{ compact?: boolean }>(); // compact: 지도 위에 띄울 때 작게
</script>

<template>
  <div class="empty-result" :class="{ compact }" role="status">
    <SearchX :size="compact ? 20 : 28" class="icon" />
    <p class="title">조건에 맞는 약국이 없어요</p>

    <p v-if="search.mode === 'name'" class="hint">약국 이름을 다시 확인해 주세요.</p>
    <p v-if="search.onlyOpen || search.onlyHoliday" class="hint">필터를 끄면 더 많은 약국이 보여요.</p>

    <div v-if="search.onlyOpen || search.onlyHoliday" class="actions">
      <!-- 필터를 끄면 SearchPanel의 watch가 바로 다시 검색한다 -->
      <button v-if="search.onlyOpen" class="btn" @click="search.onlyOpen = false">'지금 영업 중' 끄기</button>
      <button v-if="search.onlyHoliday" class="btn" @click="search.onlyHoliday = false">'공휴일 운영' 끄기</button>
    </div>
  </div>
</template>

<style scoped>
.empty-result {
  display: grid;
  justify-items: center;
  gap: 6px;
  margin: 16px 0;
  padding: 24px 16px;
  border-radius: 18px;
  border: 1px dashed var(--line);
  text-align: center;
  animation: appear 0.3s ease;
}
.empty-result.compact {
  margin: 0;
  padding: 14px 16px;
  border-style: solid;
  background: color-mix(in srgb, var(--card) 95%, transparent);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.3);
}
.icon {
  color: var(--muted);
}
.title {
  margin: 0;
  font-weight: 700;
  font-size: 16px;
}
.compact .title {
  font-size: 15px;
}
.hint {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.5;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 8px;
  margin-top: 6px;
}
.actions .btn {
  min-height: 40px;
  padding: 8px 14px;
  font-size: 14px;
}
@keyframes appear {
  from {
    opacity: 0;
    transform: translateY(6px);
  }
}
</style>
