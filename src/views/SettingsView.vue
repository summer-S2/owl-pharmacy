<!-- 설정 화면 (지금은 테마 고르기) -->
<script setup lang="ts">
import { ArrowLeft, Check } from "lucide-vue-next";
import { setTheme, settings } from "../settings";
import { THEMES } from "../themes";
</script>

<template>
  <section class="settings">
    <RouterLink to="/" class="back"><ArrowLeft :size="18" />돌아가기</RouterLink>
    <h2>설정</h2>

    <h3>테마</h3>
    <div class="themes" role="radiogroup" aria-label="테마">
      <button
        v-for="t in THEMES"
        :key="t.id"
        class="theme"
        :class="{ on: settings.themeId === t.id }"
        role="radio"
        :aria-checked="settings.themeId === t.id"
        @click="setTheme(t.id)"
      >
        <!-- 컬러칩 4개 -->
        <span class="chips">
          <span v-for="c in t.palette" :key="c" class="chip" :style="{ background: c }" />
        </span>
        <span class="label">
          {{ t.name }}
          <Check v-if="settings.themeId === t.id" :size="18" class="check" />
        </span>
      </button>
    </div>
    <p class="hint">고른 테마는 이 기기에 저장돼요.</p>
  </section>
</template>

<style scoped>
.settings {
  display: grid;
  gap: 12px;
}
.back {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  justify-self: start;
  color: var(--muted);
  text-decoration: none;
  font-size: 14px;
}
h2 {
  margin: 0;
  font-size: 22px;
}
h3 {
  margin: 8px 0 0;
  font-size: 15px;
  color: var(--muted);
  font-weight: 600;
}
.themes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
  gap: 10px;
}
.theme {
  display: grid;
  gap: 10px;
  padding: 10px;
  border-radius: 16px;
  border: 2px solid var(--line);
  background: var(--card);
  cursor: pointer;
  text-align: left;
}
.theme.on {
  border-color: var(--accent);
}
.chips {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  height: 44px;
  border-radius: 10px;
  overflow: hidden;
}
.chip {
  display: block;
}
.label {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  font-size: 15px;
}
.check {
  color: var(--accent);
}
.hint {
  margin: 0;
  color: var(--muted);
  font-size: 13px;
}
</style>
