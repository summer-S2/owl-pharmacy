<!-- 부엉이약국 로고: 선으로 그린 부엉이 (가슴에 약국 십자)
     boxed: 남색 둥근 사각형 배경까지 그리기 (앱 아이콘 모양) -->
<script setup lang="ts">
import { OWL_SHAPES } from "../owl";

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
    <rect v-if="boxed" x="0" y="0" width="100" height="100" rx="22" fill="#212a3e" stroke="none" />
    <!-- 사각형 안에서는 부엉이가 꽉 차도록 92%로 줄여 가운데 정렬 (선 굵기는 줄어든 만큼 보정) -->
    <g
      :stroke="boxed ? '#fff' : 'currentColor'"
      :stroke-width="boxed ? 2.83 : undefined"
      :transform="boxed ? 'translate(4.00 4.23) scale(0.92)' : undefined"
      v-html="OWL_SHAPES"
    >
    </g>
  </svg>
</template>
