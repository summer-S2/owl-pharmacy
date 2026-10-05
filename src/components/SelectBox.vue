<!-- 직접 만든 드롭다운 (기본 select 대신)
     v-model로 값을 주고받고, 고르면 change 이벤트도 보낸다
     키보드: ↑↓ 이동, Enter/Space 선택, Esc 닫기 -->
<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { Check, ChevronDown } from "lucide-vue-next";

type Option = { value: string; label: string };

const props = defineProps<{ options: Option[]; placeholder: string; disabled?: boolean }>();
// defineModel: 부모의 v-model과 연결되는 값
const model = defineModel<string>({ required: true });
const emit = defineEmits<{ change: [value: string] }>();

const open = ref(false);
const active = ref(-1); // 키보드로 가리키고 있는 항목
const root = ref<HTMLDivElement | null>(null);
const menu = ref<HTMLUListElement | null>(null);

const selectedLabel = computed(() => props.options.find((o) => o.value === model.value)?.label ?? "");

function scrollToActive() {
  nextTick(() => menu.value?.children[active.value]?.scrollIntoView({ block: "nearest" }));
}

function openMenu() {
  if (props.disabled) return;
  open.value = true;
  active.value = Math.max(0, props.options.findIndex((o) => o.value === model.value));
  scrollToActive();
}

function choose(value: string) {
  open.value = false;
  if (value !== model.value) {
    model.value = value;
    emit("change", value);
  }
}

function onKeydown(e: KeyboardEvent) {
  if (props.disabled) return;
  if (!open.value) {
    if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
      e.preventDefault();
      openMenu();
    }
    return;
  }
  if (e.key === "Escape") {
    open.value = false;
  } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
    e.preventDefault();
    const n = props.options.length;
    active.value = (active.value + (e.key === "ArrowDown" ? 1 : n - 1)) % n;
    scrollToActive();
  } else if (e.key === "Enter" || e.key === " ") {
    e.preventDefault();
    const opt = props.options[active.value];
    if (opt) choose(opt.value);
  }
}

// 바깥을 누르면 닫기
function onOutside(e: PointerEvent) {
  if (root.value && !root.value.contains(e.target as Node)) open.value = false;
}
watch(open, (v) => {
  if (v) document.addEventListener("pointerdown", onOutside);
  else document.removeEventListener("pointerdown", onOutside);
});
onBeforeUnmount(() => document.removeEventListener("pointerdown", onOutside));
</script>

<template>
  <div ref="root" class="select" :class="{ open, disabled }">
    <button
      type="button"
      class="trigger"
      :disabled="disabled"
      aria-haspopup="listbox"
      :aria-expanded="open"
      @click="open ? (open = false) : openMenu()"
      @keydown="onKeydown"
    >
      <span :class="{ placeholder: !selectedLabel }">{{ selectedLabel || placeholder }}</span>
      <ChevronDown :size="18" class="chevron" />
    </button>

    <Transition name="pop">
      <ul v-if="open" ref="menu" class="menu" role="listbox">
        <li
          v-for="(o, i) in options"
          :key="o.value"
          role="option"
          :aria-selected="o.value === model"
          :class="{ active: i === active, selected: o.value === model }"
          @pointerenter="active = i"
          @click="choose(o.value)"
        >
          <span>{{ o.label }}</span>
          <Check v-if="o.value === model" :size="16" />
        </li>
      </ul>
    </Transition>
  </div>
</template>

<style scoped>
.select {
  position: relative;
  min-width: 0;
}
.trigger {
  width: 100%;
  min-height: 46px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px 10px 14px;
  border-radius: 14px;
  border: 1px solid var(--line);
  background: var(--card);
  color: var(--text);
  font-size: 16px;
  text-align: left;
  cursor: pointer;
  transition: border-color 0.2s, box-shadow 0.2s, transform 0.12s;
}
.trigger span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.trigger:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--accent) 60%, var(--line));
}
.trigger:active:not(:disabled) {
  transform: scale(0.98);
}
.open .trigger,
.trigger:focus-visible {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 25%, transparent);
}
.trigger:disabled {
  opacity: 0.5;
  cursor: default;
}
.placeholder {
  color: var(--muted);
}
.chevron {
  flex: none;
  color: var(--muted);
  transition: transform 0.25s cubic-bezier(0.3, 1.4, 0.6, 1);
}
.open .chevron {
  transform: rotate(180deg);
  color: var(--accent);
}
.menu {
  position: absolute;
  z-index: 30;
  top: calc(100% + 6px);
  left: 0;
  right: 0;
  max-height: 280px;
  overflow: auto;
  margin: 0;
  padding: 6px;
  list-style: none;
  border-radius: 16px;
  border: 1px solid var(--line);
  background: var(--card);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.35);
  transform-origin: top center;
}
.menu li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  border-radius: 10px;
  cursor: pointer;
  font-size: 15px;
  transition: background 0.12s;
}
.menu li.active {
  background: var(--card-2);
}
.menu li.selected {
  color: var(--accent);
  font-weight: 700;
}
/* 펼침 애니메이션 */
.pop-enter-active {
  transition: opacity 0.18s ease, transform 0.22s cubic-bezier(0.2, 1.3, 0.4, 1);
}
.pop-leave-active {
  transition: opacity 0.12s ease, transform 0.12s ease;
}
.pop-enter-from,
.pop-leave-to {
  opacity: 0;
  transform: translateY(-6px) scale(0.96);
}
</style>
