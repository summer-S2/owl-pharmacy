<!-- 부엉이약국 로고: 선으로 그린 부엉이 (가슴에 약국 십자)
     boxed: 남색 둥근 사각형 배경까지 그리기 (앱 아이콘 모양) -->
<script setup lang="ts">
withDefaults(defineProps<{ size?: number | string; boxed?: boolean }>(), { size: 32, boxed: false });
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 100 100"
    fill="none"
    stroke="currentColor"
    stroke-width="2.6"
    stroke-linecap="round"
    stroke-linejoin="round"
    role="img"
    aria-label="부엉이약국"
  >
    <rect v-if="boxed" x="0" y="0" width="100" height="100" rx="22" fill="#1b3160" stroke="none" />
    <!-- 사각형 안에 넣을 때는 70%로 줄이므로 선을 굵게 보정 -->
    <g
      :stroke="boxed ? '#fff' : 'currentColor'"
      :stroke-width="boxed ? 3.7 : undefined"
      :transform="boxed ? 'translate(15 15) scale(0.7)' : undefined"
    >
      <!-- 귀깃 -->
      <path d="M21.8 11c0 4 2.2 6.8 5.9 8.4" />
      <path d="M78.2 11c0 4-2.2 6.8-5.9 8.4" />
      <!-- 머리 -->
      <ellipse cx="50" cy="33.7" rx="28.2" ry="23.6" />
      <!-- 얼굴 테두리 (가운데로 모이는 눈썹) -->
      <path d="M28.7 20.3H36.5C44 20.3 50 26 50 34.3C50 26 56 20.3 63.5 20.3H71.3" />
      <!-- 눈 -->
      <circle cx="34.7" cy="33.9" r="4.3" />
      <circle cx="65.3" cy="33.9" r="4.3" />
      <!-- 부리 -->
      <path d="M45.8 42Q50 39.2 54.2 42L50 50.4Z" />
      <!-- 몸통 -->
      <path d="M21.8 37V88.5H45.5C64 88.5 78.2 74 78.2 56V37" />
      <!-- 날개 -->
      <path d="M23.6 45C30 51.5 33.4 58.5 33.4 68C33.4 77.5 29.5 85 23.5 88" />
      <path d="M71.7 50C71 64 68.5 76.5 61 86" />
      <!-- 가슴의 약국 십자 -->
      <path d="M50 64.3V77.3M43.5 70.8H56.5" />
    </g>
  </svg>
</template>
