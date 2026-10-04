// 테마 목록. 새 테마는 THEMES에 하나 추가하면 설정 화면에 자동으로 나온다.
// palette: 설정 화면에 보여줄 컬러칩 4개 (Color Hunt 순서)
// vars: 실제로 화면에 쓰는 색 (main.css의 CSS 변수를 덮어씀)

export type Theme = {
  id: string;
  name: string;
  scheme: "dark" | "light"; // 셀렉트 상자 같은 브라우저 기본 입력칸의 밝기
  palette: [string, string, string, string];
  vars: {
    bgTop: string;
    bgBottom: string;
    card: string;
    card2: string;
    line: string;
    text: string;
    muted: string;
    accent: string; // 포인트: 선택된 탭, 영업 중, 주요 버튼
    onAccent: string; // 포인트 색 위 글자
    danger: string; // 오류 글자
    pinOff: string; // 지도: 영업 종료 핀 (영업 중 핀은 accent)
    pinInk: string; // 지도: 핀 테두리와 십자
  };
};

export const THEMES: Theme[] = [
  {
    // 기본 테마: 라이트 팔레트의 밝고 어두운 색을 뒤집은 버전
    id: "dark",
    name: "다크",
    scheme: "dark",
    palette: ["#212a3e", "#394867", "#9ba4b5", "#f1f6f9"],
    vars: {
      bgTop: "#1a2132",
      bgBottom: "#212a3e",
      card: "#2a3550",
      card2: "#394867",
      line: "#465679",
      text: "#f1f6f9",
      muted: "#9ba4b5",
      accent: "#f1f6f9",
      onAccent: "#212a3e",
      danger: "#ffb4c0",
      pinOff: "#9ba4b5",
      pinInk: "#212a3e",
    },
  },
  {
    id: "navy",
    name: "남색 + 하늘",
    scheme: "dark",
    palette: ["#0b2447", "#19376d", "#576cbc", "#a5d7e8"],
    vars: {
      bgTop: "#0b2447",
      bgBottom: "#19376d",
      card: "#142f5c",
      card2: "#1d3f78",
      line: "#2f4c8c",
      text: "#f2f7fb",
      muted: "#a9c2dc",
      accent: "#a5d7e8",
      onAccent: "#0b2447",
      danger: "#ffb4c0",
      pinOff: "#576cbc",
      pinInk: "#0b2447",
    },
  },
  {
    id: "lavender",
    name: "라벤더",
    scheme: "dark",
    palette: ["#495c83", "#7a86b6", "#a8a4ce", "#c8b6e2"],
    vars: {
      bgTop: "#2c3854",
      bgBottom: "#495c83",
      card: "#36446a",
      card2: "#445482",
      line: "#5d6a98",
      text: "#f5f3fb",
      muted: "#c3c1e0",
      accent: "#c8b6e2",
      onAccent: "#2b2547",
      danger: "#ffb4c0",
      pinOff: "#7a86b6",
      pinInk: "#2b2547",
    },
  },
  {
    id: "pink",
    name: "보라 + 핑크",
    scheme: "dark",
    palette: ["#1f2544", "#474f7a", "#81689d", "#ffd0ec"],
    vars: {
      bgTop: "#1f2544",
      bgBottom: "#2e3561",
      card: "#2b325a",
      card2: "#3a4270",
      line: "#535b8c",
      text: "#f8f2fa",
      muted: "#cdbfdc",
      accent: "#ffd0ec",
      onAccent: "#1f2544",
      danger: "#ffb4c0",
      pinOff: "#81689d",
      pinInk: "#1f2544",
    },
  },
  {
    id: "light",
    name: "라이트",
    scheme: "light",
    palette: ["#f1f6f9", "#394867", "#212a3e", "#9ba4b5"],
    vars: {
      bgTop: "#f1f6f9",
      bgBottom: "#e3eaf0",
      card: "#ffffff",
      card2: "#eef2f6",
      line: "#d3d9e3",
      text: "#212a3e",
      muted: "#5f6a80", // #9BA4B5는 흰 배경에서 글자로 쓰기엔 너무 연해서 진하게
      accent: "#394867",
      onAccent: "#ffffff",
      danger: "#c0394b",
      pinOff: "#9ba4b5",
      pinInk: "#ffffff",
    },
  },
  {
    id: "beige",
    name: "베이지",
    scheme: "light",
    palette: ["#b7c4cf", "#eee3cb", "#d7c0ae", "#967e76"],
    vars: {
      bgTop: "#eee3cb",
      bgBottom: "#e5d7bb",
      card: "#fbf7ef",
      card2: "#f3ead8",
      line: "#d7c0ae",
      text: "#3b2f2a",
      muted: "#75645d",
      accent: "#7f665d", // #967E76을 조금 진하게 (흰 글자가 잘 읽히도록)
      onAccent: "#ffffff",
      danger: "#b03a48",
      pinOff: "#b7c4cf",
      pinInk: "#5a4a44",
    },
  },
];

const STORAGE_KEY = "owl-pharmacy:theme";
const DEFAULT_ID = "dark";

export const findTheme = (id: string | null) => THEMES.find((t) => t.id === id) ?? THEMES.find((t) => t.id === DEFAULT_ID)!;

// 저장된 테마 (개인 브라우저에만 저장. 시크릿 창 등에서 저장소를 못 쓰면 기본 테마)
export function savedThemeId(): string {
  try {
    return findTheme(localStorage.getItem(STORAGE_KEY)).id;
  } catch {
    return DEFAULT_ID;
  }
}

// 화면에 테마 색을 적용 (저장은 하지 않음)
export function applyTheme(id: string) {
  const theme = findTheme(id);
  const root = document.documentElement.style;
  const v = theme.vars;
  root.setProperty("--bg-top", v.bgTop);
  root.setProperty("--bg-bottom", v.bgBottom);
  root.setProperty("--card", v.card);
  root.setProperty("--card-2", v.card2);
  root.setProperty("--line", v.line);
  root.setProperty("--text", v.text);
  root.setProperty("--muted", v.muted);
  root.setProperty("--accent", v.accent);
  root.setProperty("--on-accent", v.onAccent);
  root.setProperty("--danger", v.danger);
  root.setProperty("color-scheme", theme.scheme);
  // 폰 상단 상태바 색
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", v.bgTop);
  return theme;
}

// 설정에서 직접 고른 테마만 저장 (고른 적 없으면 계속 기본 테마를 따라감)
export function saveTheme(id: string) {
  try {
    localStorage.setItem(STORAGE_KEY, id);
  } catch {
    // 저장소를 못 써도 이번 화면에는 적용됨
  }
}
