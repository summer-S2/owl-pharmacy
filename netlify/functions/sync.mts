import { syncDataset } from "../lib/data.mts";

// 예약 함수: 매일 새벽 4시(한국 시간)에 전국 약국 목록과 공휴일을 새로 받아 저장
// (로컬에서는 `npx netlify-cli functions:invoke sync`로 직접 실행할 수 있음)
export default async () => {
  const data = await syncDataset();
  console.log(`동기화 완료: 약국 ${data.pharmacies.length}곳, 공휴일 ${Object.keys(data.holidays).length}일`);
};

export const config = { schedule: "0 19 * * *" }; // UTC 19:00 = KST 04:00
