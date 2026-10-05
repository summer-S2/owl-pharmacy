<!-- 약국 카드: 목록 탭과 지도 탭(핀을 눌렀을 때)에서 함께 쓴다 -->
<script setup lang="ts">
import { computed, ref } from "vue";
import { ChevronDown, MapPin, Phone } from "lucide-vue-next";
import { DAY_LABELS, formatDistance, formatHours, type PharmacyItem } from "../api";

// props: 부모가 넘겨주는 값 (React의 props와 같음)
const props = defineProps<{ p: PharmacyItem; holidayName: string | null }>();

const showWeek = ref(false); // 요일별 운영 시간 펼치기

// 지도 앱에서 약국 위치 보기 (카카오: 좌표에 핀, 네이버: 약국 이름 + 동네로 검색)
const kakaoUrl = computed(
  () => `https://map.kakao.com/link/map/${encodeURIComponent(props.p.name)},${props.p.lat},${props.p.lon}`
);
const naverUrl = computed(
  () => `https://map.naver.com/p/search/${encodeURIComponent(`${props.p.name} ${props.p.addr.split(" ").slice(0, 3).join(" ")}`)}`
);
</script>

<template>
  <article class="card" :class="{ closed: !p.openNow }">
    <header class="head">
      <h3 class="name">{{ p.name }}</h3>
      <span class="badge" :class="p.openNow ? 'open' : 'off'">
        <i v-if="p.openNow" class="live" aria-hidden="true" />{{ p.openNow ? "영업 중" : "영업 종료" }}
      </span>
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

    <button class="more" :class="{ open: showWeek }" :aria-expanded="showWeek" @click="showWeek = !showWeek">
      {{ showWeek ? "요일별 시간 접기" : "요일별 시간 보기" }}
      <ChevronDown :size="16" class="chev" />
    </button>
    <!-- 요일별 시간: 높이가 0 ↔ 원래 높이로 부드럽게 펼쳐진다 -->
    <div class="week-wrap" :class="{ open: showWeek }">
      <div class="week-inner">
        <table class="week">
          <tbody>
            <!-- v-for: 목록을 반복해서 그린다 -->
            <tr v-for="(h, i) in p.hours" :key="i">
              <th>{{ DAY_LABELS[i] }}</th>
              <td :class="{ muted: !h }">{{ formatHours(h) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <div class="actions">
      <!-- 첫 줄: 전화 (꽉 차게) / 둘째 줄: 카카오맵, 네이버지도 (반반)
           좁은 화면에서는 "에서 보기"를 숨겨 글자를 줄인다 -->
      <a v-if="p.tel" class="btn primary call" :href="`tel:${p.tel}`"><Phone :size="17" />전화</a>
      <a class="btn" :href="kakaoUrl" target="_blank" rel="noopener" aria-label="카카오맵에서 보기">
        <MapPin :size="17" />카카오맵<span class="suffix">에서 보기</span>
      </a>
      <a class="btn" :href="naverUrl" target="_blank" rel="noopener" aria-label="네이버지도에서 보기">
        <MapPin :size="17" />네이버지도<span class="suffix">에서 보기</span>
      </a>
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
.card {
  transition:
    transform 0.2s cubic-bezier(0.3, 1.4, 0.5, 1),
    box-shadow 0.2s,
    border-color 0.2s;
}
@media (hover: hover) {
  .card:hover {
    transform: translateY(-2px);
    border-color: color-mix(in srgb, var(--accent) 35%, var(--line));
    box-shadow: 0 10px 24px rgba(0, 0, 0, 0.2);
  }
}
.card.closed {
  opacity: 0.75;
}
/* 영업 중 배지 앞의 두근거리는 점 */
.live {
  display: inline-block;
  width: 7px;
  height: 7px;
  margin-right: 6px;
  vertical-align: 1px;
  border-radius: 50%;
  background: currentColor;
  animation: live 1.6s ease-out infinite;
}
@keyframes live {
  0% {
    box-shadow: 0 0 0 0 currentColor;
  }
  70%,
  100% {
    box-shadow: 0 0 0 6px transparent;
  }
}
.chev {
  transition: transform 0.25s;
}
.more.open .chev {
  transform: rotate(180deg);
}
.week-wrap {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.3s ease;
}
.week-wrap.open {
  grid-template-rows: 1fr;
}
.week-inner {
  overflow: hidden;
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
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
}
.actions .btn {
  min-width: 0;
  padding-left: 10px;
  padding-right: 10px;
}
.actions .call {
  grid-column: 1 / -1;
}
@media (max-width: 480px) {
  .suffix {
    display: none;
  }
}
</style>
