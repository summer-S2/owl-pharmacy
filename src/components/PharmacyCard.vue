<!-- 약국 카드: 목록 탭과 지도 탭(핀을 눌렀을 때)에서 함께 쓴다 -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { ChevronDown, ChevronUp, Map, Navigation, Phone } from "lucide-vue-next";
import { DAY_LABELS, formatDistance, formatHours, type PharmacyItem } from "../api";

// props: 부모가 넘겨주는 값 (React의 props와 같음)
const props = defineProps<{ p: PharmacyItem; holidayName: string | null }>();

const showWeek = ref(false); // 요일별 운영 시간 펼치기

const kakaoUrl = computed(
  () => `https://map.kakao.com/link/to/${encodeURIComponent(props.p.name)},${props.p.lat},${props.p.lon}`
);
const naverUrl = computed(
  () => `https://map.naver.com/p/search/${encodeURIComponent(`${props.p.name} ${props.p.addr.split(" ").slice(0, 3).join(" ")}`)}`
);
</script>

<template>
  <article class="card" :class="{ closed: !p.openNow }">
    <header class="head">
      <h3 class="name">{{ p.name }}</h3>
      <span class="badge" :class="p.openNow ? 'open' : 'off'">{{ p.openNow ? "영업 중" : "영업 종료" }}</span>
    </header>

    <p class="addr">
      <span v-if="p.distance !== null" class="dist">{{ formatDistance(p.distance) }}</span>
      {{ p.addr }}
    </p>

    <dl class="times">
      <div>
        <dt>{{ holidayName ? "오늘(공휴일)" : "오늘" }}</dt>
        <dd>{{ formatHours(p.today) }}</dd>
      </div>
      <div>
        <dt>공휴일</dt>
        <dd :class="{ muted: !p.hours[7] }">{{ formatHours(p.hours[7] ?? null) }}</dd>
      </div>
    </dl>

    <button class="more" @click="showWeek = !showWeek">
      {{ showWeek ? "요일별 시간 접기" : "요일별 시간 보기" }}
      <ChevronUp v-if="showWeek" :size="16" />
      <ChevronDown v-else :size="16" />
    </button>
    <!-- v-if: 조건이 참일 때만 그린다 / v-for: 목록을 반복해서 그린다 -->
    <table v-if="showWeek" class="week">
      <tbody>
        <tr v-for="(h, i) in p.hours" :key="i">
          <th>{{ DAY_LABELS[i] }}</th>
          <td :class="{ muted: !h }">{{ formatHours(h) }}</td>
        </tr>
      </tbody>
    </table>

    <div class="actions">
      <a v-if="p.tel" class="btn primary" :href="`tel:${p.tel}`"><Phone :size="17" />전화</a>
      <a class="btn" :href="kakaoUrl" target="_blank" rel="noopener"><Navigation :size="17" />카카오맵 길찾기</a>
      <a class="btn" :href="naverUrl" target="_blank" rel="noopener"><Map :size="17" />네이버지도</a>
    </div>
  </article>
</template>

<style scoped>
.card {
  background: var(--card);
  border: 1px solid var(--line);
  border-radius: 18px;
  padding: 16px;
  display: grid;
  gap: 10px;
}
.card.closed {
  opacity: 0.75;
}
.head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}
.name {
  margin: 0;
  font-size: 18px;
  word-break: keep-all;
}
.badge {
  flex: none;
  font-size: 12px;
  font-weight: 700;
  padding: 4px 10px;
  border-radius: 999px;
}
.badge.open {
  background: var(--accent);
  color: var(--on-accent);
}
.badge.off {
  background: var(--line);
  color: var(--muted);
}
.addr {
  margin: 0;
  color: var(--muted);
  font-size: 14px;
  line-height: 1.5;
  word-break: keep-all;
}
.dist {
  color: var(--accent);
  font-weight: 700;
  margin-right: 4px;
}
.times {
  margin: 0;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.times div {
  background: var(--card-2);
  border-radius: 12px;
  padding: 8px 10px;
}
.times dt {
  font-size: 12px;
  color: var(--muted);
}
.times dd {
  margin: 2px 0 0;
  font-weight: 700;
  font-size: 14px;
}
.muted {
  color: var(--muted);
  font-weight: 400;
}
.more {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  justify-self: start;
  background: none;
  border: 0;
  padding: 0;
  color: var(--muted);
  font-size: 13px;
  cursor: pointer;
}
.week {
  border-collapse: collapse;
  font-size: 14px;
}
.week th {
  text-align: left;
  color: var(--muted);
  font-weight: 400;
  padding: 3px 12px 3px 0;
  width: 56px;
}
.week td {
  padding: 3px 0;
}
.actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}
.actions .btn {
  flex: 1 1 auto;
}
</style>
