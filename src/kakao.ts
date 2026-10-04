// 카카오맵 SDK를 처음 필요할 때 한 번만 불러온다
/* eslint-disable @typescript-eslint/no-explicit-any */

declare global {
  interface Window {
    kakao: any;
  }
}

let loading: Promise<any> | null = null;

export function loadKakaoMaps(): Promise<any> {
  if (loading) return loading;
  const key = import.meta.env.VITE_KAKAO_MAP_KEY;
  loading = new Promise((resolve, reject) => {
    if (!key) {
      reject(new Error("카카오맵 키(VITE_KAKAO_MAP_KEY)가 설정되지 않았어요"));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false`;
    script.onload = () => window.kakao.maps.load(() => resolve(window.kakao));
    script.onerror = () => {
      loading = null;
      reject(new Error("카카오맵을 불러오지 못했어요. 등록된 도메인인지 확인해 주세요"));
    };
    document.head.append(script);
  });
  return loading;
}
