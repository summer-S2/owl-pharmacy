# 🦉 부엉이약국

공휴일에도, 밤에도 **지금 문 연 약국**을 찾아 주는 모바일 웹사이트예요.

## 기능

- **약국 찾기**
  - 📍 **내 주변**: 내 위치에서 가까운 순
  - 🗺️ **지역**: 시/도 → 시/군/구 선택
  - 🔍 **이름**: 약국 이름 검색
- **필터**: 지금 영업 중 / 공휴일 운영
  - "지금 영업 중"은 한국 시간과 **오늘이 공휴일인지**를 보고 계산해요. 공휴일이면 요일 대신 공휴일 운영 시간을 써요.
  - 새벽 2시까지처럼 자정을 넘기는 영업 시간도 반영해요.
- **목록 / 지도 보기**
  - 목록: 영업 중 여부, 거리, 오늘·공휴일 운영 시간, 요일별 운영 시간
  - 지도(카카오맵): 영업 중은 강조 색 핀, 영업 종료는 흐린 핀. 핀을 누르면 약국 카드
  - 약국마다 📞 전화, 카카오맵·네이버지도에서 위치 보기 버튼
- **공휴일 안내**: 오늘이 공휴일(대체공휴일 포함)이면 맨 위에 안내
- **테마**: 설정(`/settings`)에서 다크(기본), 남색 + 하늘, 라벤더, 보라 + 핑크, 라이트, 베이지 중 선택. 고른 테마는 기기에 저장

> 운영 시간은 약국이 신고한 정보라 실제와 다를 수 있어요. 방문 전에 전화로 확인하도록 화면에서도 안내해요.

## 주소

| 주소 | 화면 |
|---|---|
| `/` | 목록 |
| `/map` | 지도 |
| `/settings` | 설정 (테마) |

## 데이터

| 데이터 | 출처 |
|---|---|
| 전국 약국 정보 (운영 시간, 좌표 등) | [국립중앙의료원 전국 약국 정보 조회 서비스](https://www.data.go.kr/data/15000576/openapi.do) |
| 공휴일 (대체공휴일, 선거일 포함) | [한국천문연구원 특일 정보](https://www.data.go.kr/data/15012690/openapi.do) |
| 지도 | [카카오맵 JavaScript API](https://apis.map.kakao.com/web/) |

### 동작 방식

공공데이터 API를 검색할 때마다 부르지 않고, **하루 한 번 전국 목록을 받아 저장**해 두고 검색은 저장본에서 처리해요.
그래서 공공데이터 API는 하루 약 8번만 호출돼요 (약국 6번, 공휴일 2번).

```
매일 새벽 4시 (예약 함수 sync)
  ├─ 국립중앙의료원: 전국 약국 약 25,000곳 (한 번에 5,000건씩)
  └─ 한국천문연구원: 올해·내년 공휴일
        ↓ Netlify Blobs에 저장
검색 API (/api/pharmacies, /api/regions) → 저장본에서 거리 계산, 필터, 정렬
```

- 저장본이 없거나 36시간 넘게 갱신되지 않았으면 첫 요청 때 새로 받아요.
- 주소의 줄임말(`경기` → `경기도`)과 예전·새 행정구역 이름(`전남광주통합특별시` → 광주광역시/전라남도)은 정식 이름으로 맞춰요.

## 기술 구성

- **화면**: Vue 3 + TypeScript + Vite, Vue Router, [Lucide](https://lucide.dev) 아이콘
- **폰트**: [고운바탕](https://fonts.google.com/specimen/Gowun+Batang) (류양희, SIL Open Font License 1.1), Google Fonts로 불러옴
- **로고·지도 마커**: 부엉이 모양을 `src/owl.ts`에 모아 두고 로고와 마커가 함께 사용
- **서버**: Netlify Functions (`netlify/functions`)
  - `pharmacies.mts` → `GET /api/pharmacies` 약국 검색
  - `regions.mts` → `GET /api/regions` 시/도·시/군/구 목록
  - `sync.mts` → 매일 새벽 4시(한국 시간) 데이터 동기화 (예약 함수)
  - `netlify/lib/data.mts` → 공공데이터 호출, 저장, 영업 시간 계산
- **저장소**: Netlify Blobs

### `GET /api/pharmacies` 파라미터

| 이름 | 설명 |
|---|---|
| `lat`, `lon` | 내 위치. 있으면 가까운 순으로 정렬하고 거리(m)를 함께 줘요 |
| `sido`, `sigungu` | 지역 |
| `q` | 약국 이름 |
| `open=1` | 지금 영업 중인 곳만 |
| `holiday=1` | 공휴일 운영 시간이 있는 곳만 |
| `clat`, `clon` | 정렬 기준 지점 (지도의 "이 지역에서 찾기": 지도 가운데에서 가까운 순) |
| `bbox` | 이 범위 안의 약국만 (`남,서,북,동` 위도·경도. 지도에서 보고 있는 화면) |
| `limit` | 최대 개수 (기본 50, 최대 300) |

## 로컬에서 실행하기

필요한 것: **Node.js 22.18 이상**

1. [공공데이터포털](https://www.data.go.kr)에서 위 두 API를 활용신청하고 키를 받아요.
2. [Kakao Developers](https://developers.kakao.com)에서 앱을 만들고 **JavaScript 키**를 받은 뒤, **플랫폼 키 → JavaScript 키 → JavaScript SDK 도메인**에 `http://localhost:8888`을 등록해요.
3. 프로젝트 폴더에 `.env` 파일을 만들어요. (`.gitignore`에 들어 있어서 GitHub에는 올라가지 않아요)
   ```
   DATA_GO_KR_SERVICE_KEY=공공데이터포털_일반인증키(Decoding)
   VITE_KAKAO_MAP_KEY=카카오_JavaScript_키
   ```
4. 실행해요.
   ```powershell
   npm install
   npx netlify-cli dev
   ```
5. **http://localhost:8888** 에서 열어요.
   - `npm run dev`(Vite만 실행)로는 서버 함수가 돌지 않아서 약국을 불러올 수 없어요.
   - 처음 검색할 때 전국 목록을 받느라 몇 초 걸려요.
   - 예약 함수를 직접 실행하려면 `npx netlify-cli functions:invoke sync`

## 배포 (Netlify)

1. GitHub 저장소를 Netlify에 연결해요. 빌드 설정은 `netlify.toml`에서 자동으로 읽어요.
2. **Project configuration → Environment variables**에 두 키를 넣어요.
   - `DATA_GO_KR_SERVICE_KEY`
   - `VITE_KAKAO_MAP_KEY` (빌드할 때 화면 코드에 들어가므로, 넣거나 바꾼 뒤에는 다시 배포해야 해요)
3. 카카오 JavaScript SDK 도메인에 배포 주소(예: `https://owl-pharmacy.netlify.app`)도 추가해요.

## 테마 추가하기

`src/themes.ts`의 `THEMES` 목록에 하나를 추가하면 설정 화면에 자동으로 나와요.
