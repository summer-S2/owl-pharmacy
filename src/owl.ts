// 부엉이 모양 (로고와 지도 마커가 함께 쓴다)
// 0~100 좌표 기준. 부엉이가 차지하는 범위: x 21.8~78.2, y 11~88.5
export const OWL_SHAPES = [
  '<path d="M21.8 11c0 4 2.2 6.8 5.9 8.4"/>', // 왼쪽 귀깃
  '<path d="M78.2 11c0 4-2.2 6.8-5.9 8.4"/>', // 오른쪽 귀깃
  '<ellipse cx="50" cy="33.7" rx="28.2" ry="23.6"/>', // 머리
  '<path d="M28.7 20.3H36.5C44 20.3 50 26 50 34.3C50 26 56 20.3 63.5 20.3H71.3"/>', // 얼굴 테두리 (가운데로 모이는 눈썹)
  '<circle cx="34.7" cy="33.9" r="4.3"/>', // 왼쪽 눈
  '<circle cx="65.3" cy="33.9" r="4.3"/>', // 오른쪽 눈
  '<path d="M45.8 42Q50 39.2 54.2 42L50 50.4Z"/>', // 부리
  '<path d="M21.8 37V88.5H45.5C64 88.5 78.2 74 78.2 56V37"/>', // 몸통
  '<path d="M23.6 45C30 51.5 33.4 58.5 33.4 68C33.4 77.5 29.5 85 23.5 88"/>', // 왼쪽 날개
  '<path d="M71.7 50C71 64 68.5 76.5 61 86"/>', // 오른쪽 날개
  '<path d="M50 64.3V77.3M43.5 70.8H56.5"/>', // 가슴의 약국 십자
].join("");

// 지도 마커: 로고의 둥근 사각형 아래에 꼬리를 붙인 말풍선 모양
export const MARKER_SIZE = { width: 40, height: 50 }; // 꼬리 끝(20, 47)이 약국 위치
const MARKER_BODY =
  "M12 2H28A10 10 0 0 1 38 12V28A10 10 0 0 1 28 38H25L20 47L15 38H12A10 10 0 0 1 2 28V12A10 10 0 0 1 12 2Z";

export function markerSvg(fill: string, ink: string, outline: string) {
  // 부엉이를 사각형(2~38) 안쪽 28px 높이에 맞춰 줄인다
  const s = 28 / 77.5;
  const tx = (20 - 50 * s).toFixed(2);
  const ty = (20 - 49.75 * s).toFixed(2);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${MARKER_SIZE.width}" height="${MARKER_SIZE.height}" viewBox="0 0 40 50">` +
    `<path d="${MARKER_BODY}" fill="${fill}" stroke="${outline}" stroke-width="2" stroke-linejoin="round"/>` +
    `<g transform="translate(${tx} ${ty}) scale(${s.toFixed(3)})" fill="none" stroke="${ink}" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">${OWL_SHAPES}</g>` +
    `</svg>`
  );
}
