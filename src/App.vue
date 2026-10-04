<!-- 전체 틀: 헤더, 검색 패널, 목록/지도 탭, 안내 -->
<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { CalendarDays, Settings } from "lucide-vue-next";
import OwlLogo from "./components/OwlLogo.vue";
import SearchPanel from "./components/SearchPanel.vue";
import { search } from "./search";

const route = useRoute();
// 설정 화면에서는 검색 패널과 목록/지도 탭을 숨긴다
const isSettings = computed(() => route.name === "settings");

const holidayName = computed(() => search.result?.now.holidayName ?? null);
const syncedAt = computed(() =>
  search.result
    ? new Date(search.result.syncedAt).toLocaleString("ko-KR", {
        month: "numeric",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : ""
);
</script>

<template>
  <div class="app">
    <header class="top">
      <div class="title-row">
        <RouterLink to="/" class="home"><h1><OwlLogo :size="40" boxed class="logo" />부엉이약국</h1></RouterLink>
        <RouterLink v-if="!isSettings" to="/settings" class="gear" aria-label="설정"><Settings :size="22" /></RouterLink>
      </div>
      <p class="sub">공휴일에도, 밤에도 문 연 약국을 찾아드려요</p>
    </header>

    <p v-if="holidayName && !isSettings" class="holiday">
      <CalendarDays :size="18" class="holiday-icon" />
      <span>오늘은 <b>{{ holidayName }}</b>이에요. 공휴일 운영 시간 기준으로 보여드려요.</span>
    </p>

    <SearchPanel v-if="!isSettings" />

    <nav v-if="!isSettings" class="tabs">
      <!-- RouterLink: 페이지를 새로 불러오지 않고 주소만 바꾸는 링크 -->
      <RouterLink to="/" class="tab">목록</RouterLink>
      <RouterLink to="/map" class="tab">지도</RouterLink>
    </nav>

    <!-- 주소(/ 또는 /map)에 맞는 화면이 여기에 그려진다 -->
    <RouterView />

    <footer class="foot">
      <p>
        운영 시간은 약국이 신고한 정보라 실제와 다를 수 있어요.
        <b>방문 전에 꼭 전화로 확인해 주세요.</b>
      </p>
      <p>
        명절·휴일 당번 약국은
        <a href="https://www.pharm114.or.kr" target="_blank" rel="noopener">휴일지킴이약국</a>에서도 확인할 수 있어요.
      </p>
      <p class="source">
        자료: 국립중앙의료원 전국 약국 정보, 한국천문연구원 특일 정보
        <template v-if="syncedAt"> · {{ syncedAt }} 기준</template>
      </p>
    </footer>
  </div>
</template>

<style scoped>
.app {
  max-width: 640px;
  margin: 0 auto;
  padding: max(20px, env(safe-area-inset-top)) 16px max(32px, env(safe-area-inset-bottom));
  display: grid;
  gap: 14px;
}
.title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}
.home {
  color: inherit;
  text-decoration: none;
}
.gear {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  color: var(--muted);
  border: 1px solid var(--line);
  background: var(--card);
}
.top h1 {
  margin: 0;
  font-size: 26px;
  display: flex;
  align-items: center;
  gap: 10px;
}
.logo {
  flex: none;
  border-radius: 10px;
  box-shadow: 0 0 0 1px var(--line);
}
.sub {
  margin: 4px 0 0;
  color: var(--muted);
  font-size: 14px;
}
.holiday {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  margin: 0;
  padding: 10px 14px;
  border-radius: 14px;
  background: color-mix(in srgb, var(--accent) 12%, transparent);
  border: 1px solid color-mix(in srgb, var(--accent) 45%, transparent);
  font-size: 14px;
  line-height: 1.5;
}
.holiday-icon {
  flex: none;
  margin-top: 2px;
  color: var(--accent);
}
.tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  border-bottom: 1px solid var(--line);
}
.tab {
  text-align: center;
  padding: 10px;
  color: var(--muted);
  text-decoration: none;
  border-bottom: 3px solid transparent;
  margin-bottom: -1px;
}
/* 현재 주소와 같은 링크에 Vue Router가 붙여 주는 클래스 */
.tab.router-link-exact-active {
  color: var(--accent);
  border-bottom-color: var(--accent);
  font-weight: 700;
}
.foot {
  margin-top: 12px;
  color: var(--muted);
  font-size: 13px;
  line-height: 1.6;
}
.foot p {
  margin: 0 0 6px;
}
.foot a {
  color: var(--accent);
}
.source {
  font-size: 12px;
  opacity: 0.8;
}
</style>
