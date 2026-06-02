# 2026 지방선거 후보 정보 뷰어 — 기획 문서

> VSCode에서 이어 작업할 때 이 문서부터 읽으면 됨.  
> 최종 갱신: 2026-05-29

---

## 0. 한 줄 요약

`~/Documents/markdown_manager/files/markdown/2026-지방선거/` 폴더에 정리된 약 91개 마크다운(후보 80명 + 정당 18개 + 인덱스/매트릭스/플레이북)을 **하나도 빠뜨리지 않고** 보여주는 정적 웹사이트. Next.js 16(App Router, `output: 'export'`) + TypeScript + Tailwind v4 + shadcn-style 커스텀 컴포넌트. 백엔드 없이 빌드 산출물 `out/` 디렉토리만 정적 호스팅하면 끝.

---

## 1. 프로젝트 구조

```
~/Desktop/election-2026-viewer/
├─ app/
│  ├─ layout.tsx           # 루트 레이아웃 (헤더/푸터/면책)
│  ├─ page.tsx             # 홈 (지역·직책 카드 그리드)
│  └─ [...path]/page.tsx   # 캐치-올 디스패처 (전 페이지 라우팅)
├─ components/
│  ├─ CandidateCard.tsx    # 공보 톤 카드
│  ├─ CandidateDetail.tsx  # 14섹션 상세
│  ├─ DistrictView.tsx     # 선거구별 후보 그리드
│  ├─ Markdown.tsx         # react-markdown + GFM/raw/slug 래퍼
│  ├─ OfficeTabs.tsx       # 클라이언트 탭 컴포넌트
│  ├─ OfficeView.tsx       # 직책 인덱스 (카드/매트릭스/원본 탭)
│  ├─ PartyBar.tsx         # 정당 컬러바 + 칩
│  ├─ QuickStats.tsx       # 재산/전과/병역/입후보 4분할
│  ├─ SectionNav.tsx       # 좌측 sticky / 모바일 드롭다운
│  └─ TruthBadge.tsx       # 의혹 라벨 6종 카운트 배지
├─ lib/
│  ├─ types.ts             # 데이터 타입 + Truth 라벨 매핑
│  ├─ parsers.ts           # 마크다운 → 구조화 파서
│  ├─ section-id.ts        # 섹션 앵커 ID 생성 (server/client 공유)
│  ├─ slug-map.ts          # 한글 → 영문 URL slug 매핑
│  ├─ party-colors.ts      # 정당 시그니처 색상
│  └─ election-data.ts     # JSON 로더 + 조회 헬퍼
├─ scripts/
│  ├─ build-data.ts        # 91개 .md → data/elections.json (빌드 타임)
│  └─ fetch-photos.ts      # (TODO) 선관위 공식 사진 다운로드
├─ data/
│  ├─ elections.json       # 빌드 산출물 (4.8MB, gitignore 권장)
│  └─ verify.json          # 데이터 손실 검증 리포트
├─ public/
│  ├─ photos/              # (TODO) 후보 사진 캐시
│  └─ robots.txt           # Disallow: / (검색엔진 색인 차단)
├─ next.config.ts          # output: 'export' (prod) / trailingSlash
├─ tailwind.config.ts      # (Tailwind v4 — postcss.config.mjs 사용)
├─ tsconfig.json
└─ SPEC.md                 # 이 파일
```

---

## 2. 원본 데이터 위치 및 구조

**경로**: `~/Documents/markdown_manager/files/markdown/2026-지방선거/`

```
2026-지방선거/
├─ _플레이북.md                       # 14섹션 표준 스펙 정의서
├─ 2026-지방선거-메모.md              # 전국 일정/투표범위 개요
└─ 서울특별시/
   ├─ 서울시장/         (6명 + 인덱스 + 비교매트릭스)
   ├─ 서울교육감/       (8명 + 인덱스 + 비교매트릭스)
   ├─ 서울시의원비례/   (18개 정당 + 인덱스 + 비교매트릭스)
   ├─ 관악구/
   │  ├─ 관악구청장/    (3명)
   │  ├─ 관악구의원/    (7개 선거구 × 3~7명, 가/나/다/라/마/바/사)
   │  ├─ 관악구시의원/  (7명, 제1~제5 선거구)
   │  └─ 관악구의원비례/ (3개 정당)
   └─ 동작구/           (빈 폴더 — 아직 자료 없음)
```

### 후보 파일 14섹션 표준 (`_플레이북.md` §4)

각 후보 `.md` 파일은 동일한 14섹션 헤딩 패턴을 따른다:

```
# 기호 N번 이름 (한자) — 정당

> 메타 (선거명/갱신일/1차 출처)

## 1. 인적 사항          (선관위 공식 표)
## 2. 학력
## 3. 주요 경력 (타임라인)
## 4. 신고 사항          (재산/납세/체납/전과/병역/입후보)
## 5. 핵심 공약 (5대 요약)
## 6. 지지율·현재 상황   (NESDC 등록조사 표 + 추이 해석)
## 7. 전체 공약 (분야별)  (주거/교통/복지/경제/AI/환경/...)
## 8. 선관위 공식 5대공약 (정책공약마당 PDF 원문)
## 9. 책자형 선거공보 요약
## 10. 5대 공약 심층 분석 (이행가능성 H/M/L + 애매·근거 라벨 5종)
## 11. 토론회·검증보도·논란
## 12. 공식 캠프·SNS
## 13. 종합 평가·대중 인식
## 14. 의혹·검증·논란 종합 (Truth-status 라벨 6종)
## 출처
```

### 비례 정당 파일

후보가 아닌 정당 단위. §1~§14 형태로 정당개요·강령·명부전원·상위 5명 프로필·정당공약 등.

### Truth-status 라벨 6종

§14 의혹·검증에서 의무 사용:
- 🔴 **사실 확인** — 다수 매체 교차 + 공식 자료 일치
- 🟡 **의혹(미해명)** — 제기됐으나 미해결
- 🟠 **양측 충돌** — 주장 vs 반박 평행선
- ⚫ **허위·해명 완료** — 반박/해소
- ⚪ **판단 보류** — 근거 부족
- 🔵 **검증결과** — 선관위·법원·팩트체크 공식

### 애매·근거 라벨 5종

§10 심층분석에서 단정형 평가에 부착:
- `(추정치, 정확한 근거 없음)`
- `(추정치, 출처 불명확)`
- `(법적 평가 미확정)`
- `(단일 보도, 교차검증 미흡)`
- `(논란중·평가 엇갈림 — A vs B)`

---

## 3. 데이터 파이프라인

### `scripts/build-data.ts` (tsx 실행)

1. `~/Documents/markdown_manager/files/markdown/2026-지방선거/`를 재귀 스캔
2. 폴더 구조 휴리스틱:
   - region(`서울특별시`) > office(`서울시장`) > candidate.md
   - region > subregion(`관악구`) > office(`관악구청장`) > candidate.md
   - region > subregion > office > district(`가선거구`) > candidate.md
3. 후보 파일을:
   - 헤더(`# 기호 1번 ...`) → `{ 기호, 이름, 한자, 정당 }`
   - blockquote 메타 라인 보존
   - `## ` 헤딩으로 본문 분할 (14표준 + 비표준 모두 보존)
   - `## 출처` 섹션은 별도 sources 리스트로 추출
   - Truth-status 이모지 카운트
4. 모든 파일명/내용을 NFC 정규화 (macOS NFD 회피)
5. `data/elections.json` 단일 번들로 출력
6. `data/verify.json`에 손실 검증 리포트 (현재 **section 손실 0건**)

### 데이터 모델 (`lib/types.ts`)

```ts
type ElectionData = {
  meta: { electionDate: "2026-06-03"; lastBuilt: string; rootPath: string };
  playbook: MetaFile | null;
  memo: MetaFile | null;
  regions: Region[];
};

type Region = { slug; urlSlug; name; href; offices: Office[]; subregions: SubRegion[] };
type SubRegion = { slug; urlSlug; name; href; offices: Office[] };
type Office = {
  slug; urlSlug; name; kind: OfficeKind; hierarchy[]; href;
  index: MetaFile | null;
  matrix: MetaFile | null;
  candidates: Candidate[];
  districts: District[];
  extras: MetaFile[];
};
type District = { slug; urlSlug; name; href; candidates; index; matrix; extras };
type Candidate = {
  slug; urlSlug; filename; href; hierarchy[];
  header: { raw; 기호?; 이름; 한자?; 정당?; 부제? };
  metaLines: string[];
  sections: Section[];        // ## 1. ~ ## 14. 또는 비표준
  sources: SourceLink[];      // ## 출처 파싱 결과
  sourcesRaw: string;
  raw: string;                // 원본 마크다운 전체 (fallback 렌더링용)
  lastModified: string;
  truthSummary: { counts: { red,yellow,orange,black,white,blue }; total };
};
```

### 현재 빌드 결과 (2026-05-29)

```
regions: 1 (서울특별시)
offices: 11
candidates: 80
## sections captured: 1158/1158  ← 데이터 손실 0
inline links captured: 2126/1659  ← 모든 인라인 출처 링크 보존
```

---

## 4. URL 구조

### ⚠️ Next.js 16 한국어 catch-all 버그 회피

Next.js 16 + Turbopack은 `app/[...path]/page.tsx`에서 한국어 URL segment(`/서울특별시/...`)를 `generateStaticParams`와 매칭하지 못함(404). 그래서 **URL은 영문 slug**, **UI는 한국어 그대로**.

매핑은 `lib/slug-map.ts` 참고. 각 entity에 `urlSlug` 필드 추가됨.

### 라우트 패턴

| URL | 페이지 | 컴포넌트 |
|---|---|---|
| `/` | 홈 — 지역·직책 카드 그리드 | `app/page.tsx` |
| `/seoul/` | 서울특별시 인덱스 | RegionPage |
| `/seoul/mayor/` | 서울시장 직책 인덱스 (탭) | OfficeView |
| `/seoul/mayor/01/` | 정원오 14섹션 상세 | CandidateDetail |
| `/seoul/edu/01/` | 김영배(교육감) | CandidateDetail |
| `/seoul/council-pr/01/` | 더불어민주당(비례) | CandidateDetail |
| `/seoul/gwanak/` | 관악구 인덱스 | SubregionPage |
| `/seoul/gwanak/head/01/` | 박준희(구청장) | CandidateDetail |
| `/seoul/gwanak/council/1-ga/` | 관악구의원 가선거구 | DistrictView |
| `/seoul/gwanak/council/1-ga/01/` | 가선거구 1번 후보 | CandidateDetail |
| `/playbook/` | 방법론 (`_플레이북.md`) | DocPage |
| `/schedule/` | 일정 (`2026-지방선거-메모.md`) | DocPage |

### Slug 매핑 (`lib/slug-map.ts`)

- **region**: `서울특별시` → `seoul` (하드코딩 테이블)
- **subregion**: `관악구` → `gwanak`, `동작구` → `dongjak` (25개 자치구)
- **office**:
  - `*시장` → `mayor`
  - `*교육감` → `edu`
  - `*시의원비례` / `*의원비례` → `council-pr`
  - `*구청장` / `*군수` → `head`
  - `*구의원` / `*군의원` → `council`
  - `*시의원` → `metro`
- **district**: `가선거구` → `1-ga`, `나선거구` → `2-na`, ..., `제3-임만균` → `3`
- **candidate**: `01-정원오` → `01` (숫자 prefix만 사용)

### `output: 'export'` 안전성

- `next.config.ts`: 프로덕션에서만 `output: 'export'` 적용 (dev에서는 catch-all 매칭 문제로 제외)
- `dynamicParams` 기본값 사용 (prod에서는 자동으로 false)
- 빌드 산출물: `out/` 디렉토리 (모든 페이지 `.html`로 사전 생성)

---

## 5. 디자인 방향 (확정)

**공보물 + 신문 에디토리얼 하이브리드** (사용자 선택)

### 타이포그래피

- 본문: Pretendard CDN (variable, weight 45~920), 17.5px / 1.7 line-height / weight 450
- 헤더: 굵은 black weight (800~900), tracking-tight, letter-spacing -0.02em
- 모바일: 16.5px / 1.65
- (Axis 에디토리얼 메모리 차용)

### 컬러

- 베이스: 흑백 + 약한 그레이 (`#fafaf9` 배경 / `#18181b` 텍스트 / `#71717a` muted)
- 액센트: **정당 시그니처 컬러** (`lib/party-colors.ts`)
  - 민주 `#152484` / 국힘 `#E61E2B` / 조국혁신 `#06275E` / 개혁신 `#FF7920`
  - 정의 `#FFCC00` / 진보 `#D6001C` / 여성의당 `#A5006D` 등 18개 매핑
- Truth-status: 6색 배지 (라벨 색상 + 10% 배경 + 30% 보더)

### 후보 카드 (공보 톤)

```
┌─────┬──────────────────────────┐
│ 정  │  1  정원오  鄭愿伍       │
│ 당  │     [더불어민주당]        │
│ 색  │  · 착착개발 (1호 공약)    │
│ 바  │  · 30분 통근도시          │
│     │  · 교통비 완화            │
│     │  🟡4 🟠3 🔵2  상세 →     │
└─────┴──────────────────────────┘
```

### 후보 상세 (신문 톤)

- 헤더: 큰 기호(64px) + 정당색 좌측 8px 보더 + 이름(36px) + 한자/정당칩 + 빠른 통계
- 본문: 좌측 sticky 사이드바(14섹션 점프 + 스크롤스파이) + 본문 max-w-3xl
- 섹션 헤더: 굵은 일련번호 + 큰 제목 + 굵은 하단 보더
- 표: zebra + 가로 스크롤 (모바일)
- 표·링크·이미지 모두 보존 (`react-markdown` + GFM + raw HTML + slug)

### 추후 디자인 디테일 (단계 분리)

이 SPEC에서 확정한 것은 **구조·데이터·라우팅·면책 안전장치**까지. 비주얼 디테일(컬러 토큰 세부, 헤더 레이아웃, 카드 형태, 매트릭스 시각화)은 **별도 시안 비교 후 선택**. 옵션:
- `/ui-ux-pro-max` 스킬로 2~3개 시안 뽑고 비교
- 또는 직접 ui-ux-pro-max MCP로 shadcn 컴포넌트 검색

---

## 6. 컴포넌트 책임

| 컴포넌트 | 역할 | server/client |
|---|---|---|
| `Markdown` | react-markdown + remark-gfm + rehype-raw + rehype-slug | **server** |
| `CandidateCard` | 공보 톤 카드 (Link wrapper) | server |
| `CandidateDetail` | 14섹션 + Truth 요약 + 출처 + 캠프 푸터 | server |
| `OfficeView` | 직책 인덱스 + 탭 (카드/매트릭스/원본인덱스) | server (탭은 OfficeTabs) |
| `OfficeTabs` | 탭 상태 관리 | **client** |
| `DistrictView` | 선거구 후보 그리드 + 매트릭스 탭 | server |
| `SectionNav` | 좌측 sticky 네비 + 모바일 드롭다운 + 스크롤스파이 | **client** |
| `TruthBadge` | 의혹 라벨 6종 카운트 배지 | server |
| `QuickStats` | 재산/전과/병역/입후보 4분할 (1·4섹션 표에서 추출) | server |
| `PartyBar` / `PartyChip` | 정당 컬러바 + 칩 | server |

---

## 7. 현재 상태

### ✅ 완료

- [x] Next.js 16 + TS + Tailwind v4 스캐폴딩
- [x] `_플레이북.md` 정독 (선관위 사진 URL 패턴 확인)
- [x] 데이터 파이프라인 (`scripts/build-data.ts`) — 손실 0
- [x] URL slug 영문 매핑 (Next.js 한국어 catch-all 버그 회피)
- [x] 캐치-올 라우터 (`app/[...path]/page.tsx`) — 1~5 segments 디스패치
- [x] 홈 / 지역 / 자치구 / 직책 / 선거구 / 후보 상세 / 방법론 / 일정 페이지
- [x] 14섹션 표·링크·이미지 보존 렌더링 (`Markdown.tsx`)
- [x] Truth 요약 배지 (의혹 6종 카운트)
- [x] 좌측 sticky 섹션 네비 + 모바일 드롭다운 + 스크롤스파이
- [x] 정당 시그니처 컬러 18종 매핑
- [x] 면책 푸터 + `robots.txt: Disallow: /` + `metadata.robots: noindex,nofollow`

### 🚧 진행 중 / TODO

- [ ] **선관위 공식 사진 자동 다운로드** (`scripts/fetch-photos.ts`)
  - 후보 ID는 `info.nec.go.kr` 후보 정보공개 팝업의 huboId
  - 사진 URL 패턴: `info.nec.go.kr/photo/{electionCode}/...{huboId}.jpg` (정확한 패턴은 직접 inspect 필요)
  - 실패 시 정당색 그라데이션 + 이름 일러스트 placeholder
  - `public/photos/{huboId}.jpg`로 저장, git 커밋해서 캐시
- [ ] **비교 매트릭스 인터랙티브 버전** (현재는 원본 마크다운 표 그대로 렌더)
  - 분야 × 후보 그리드, 셀 호버 → 공약 전문 팝오버
  - 정당색 셀 배경, "미언급" 회색 dash
- [ ] **검색 / 필터** (이름·정당·전과 유무·재산 범위로 후보 검색)
- [ ] **디자인 시안 시작** (ui-ux-pro-max로 2~3개 비교 후 선택)
- [ ] **반응형 미세조정** (모바일 헤더/사이드바 동작)
- [ ] **prod 빌드 검증** (`pnpm build` → `out/` 확인 → 정적 서버로 동작 테스트)
- [ ] **배포** (Vercel vs Cloudflare Pages 결정 — `/SPEC.md §11` 참고)

### 🐛 알려진 이슈

1. **Next.js 16 + Turbopack 한국어 catch-all 매칭 버그** (회피 완료, 영문 URL 사용)
2. **동작구 폴더 빈 상태** — 자료 없음. UI에서 "자료 준비 중" 회색 처리됨.
3. **inline link captured > source** (2126 vs 1659) — sources 섹션의 링크가 raw에도 sections에도 카운트되어 중복. 손실은 아님.
4. `content/` 디렉토리는 placeholder. 안 쓰임. 정리 가능.

---

## 8. 실행 명령

```bash
cd ~/Desktop/election-2026-viewer

# 의존성 설치 (이미 됨)
pnpm install

# 데이터 빌드 (원본 마크다운 → JSON)
pnpm build:data
# → data/elections.json 갱신 + data/verify.json 손실 리포트

# 개발 서버 (Turbopack, dev에서는 output:export 비활성)
pnpm dev
# → http://localhost:3000

# 프로덕션 정적 빌드
pnpm build
# → 1) build:data 실행
# → 2) next build (output: 'export')
# → out/ 디렉토리에 모든 페이지 정적 HTML 생성
```

### 환경변수

- `ELECTION_SRC`: 원본 마크다운 경로 (기본: `~/Documents/markdown_manager/files/markdown/2026-지방선거`)
- `NODE_ENV=production`: `output: 'export'` 활성화

---

## 9. 면책·법적 안전장치

공개 배포를 전제로 깔아놓은 것들:

- 푸터에 면책 헤더 (선관위·NESDC·정책공약마당·언론 1차 출처 기반 정리)
- 모든 외부 링크에 `target="_blank" rel="noopener noreferrer"` 자동 적용 (`Markdown.tsx` 커스텀 `a` 컴포넌트)
- `robots.txt: Disallow: /` + `metadata.robots: { index: false, follow: false }` (검색 색인 차단)
- 후보별 페이지에 `lastModified` 표시 (원본 mtime)
- Truth-status 라벨로 의혹의 확실성 등급 명시 (단정 회피)
- 마크다운 원본은 **읽기만** 함, 수정 X

---

## 10. 데이터 갱신 절차

원본 마크다운이 업데이트되면:

1. `pnpm build:data` → JSON 재생성
2. `data/verify.json` 확인 (sectionLoss=0, issues=0 인지)
3. `pnpm dev`로 로컬 확인
4. `pnpm build` → `out/` 산출물 확인
5. 배포 (호스팅 플랫폼에 `out/` 업로드)

자동화 옵션 (추후):
- GitHub Actions: 마크다운 폴더 변경 감지 → 자동 빌드/배포
- 또는 수동 스크립트로 충분 (선거가 일주일 안 남았으니)

---

## 11. 미결 결정 사항

`/AskUserQuestion`이나 직접 결정해야 할 것들:

1. **배포 플랫폼** — Vercel / Cloudflare Pages / GitHub Pages 중 선택
2. **도메인** — 비공개 서브도메인 / `*.vercel.app` 임시 / 별도 도메인 구매
3. **시각 디자인 디테일** — `ui-ux-pro-max`로 시안 2~3개 뽑고 비교
4. **후보 사진 URL 패턴 확정** — 선관위 후보자 정보공개 페이지에서 실제 사진 URL 직접 확인 (info.nec.go.kr 사진 URL은 후보별로 huboId 기반)
5. **비교 매트릭스 인터랙티브 수준** — 원본 그대로 vs 그리드 재구성
6. **검색 기능** — Phase 1에 포함 / 별도 Phase 2

---

## 12. 참고

- 플레이북(데이터 작성 원칙·14섹션 스펙): `_플레이북.md` (앱 내 `/playbook/`)
- 일정·투표 안내: `2026-지방선거-메모.md` (앱 내 `/schedule/`)
- 선관위 후보자 명부: http://info.nec.go.kr/main/showDocument.xhtml?electionId=0020260603
- NESDC 여론조사: https://www.nesdc.go.kr
- 정책공약마당 PDF CDN: `https://cdn.nec.go.kr/policy_pdf/20260603/...`

---

## 13. 다음 세션 시작할 때

VSCode에서:

```bash
cd ~/Desktop/election-2026-viewer
code .
pnpm dev      # 서버 띄우고 브라우저에서 확인하면서 작업
```

작업 우선순위:
1. **디자인 시안 결정** (가장 가시적인 변화)
2. **선관위 사진 다운로드** (시각적 풍부함)
3. **비교 매트릭스 인터랙티브 버전**
4. **prod 빌드 + 배포 테스트**
