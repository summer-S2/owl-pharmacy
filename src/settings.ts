// 사용자 설정 (지금은 테마만). 여러 화면에서 함께 쓰도록 reactive로 둔다
import { reactive } from "vue";
import { applyTheme, saveTheme, savedThemeId } from "./themes";

export const settings = reactive({
  themeId: savedThemeId(),
});

export function setTheme(id: string) {
  settings.themeId = applyTheme(id).id;
  saveTheme(settings.themeId);
}
