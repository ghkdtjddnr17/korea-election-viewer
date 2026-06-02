# 디자인 레퍼런스

> SPEC.md의 디자인 단계에서 참고할 외부 사이트·패턴 정리.  
> **Axis 에디토리얼 스타일은 안 씀** — 정치 중립 정보 뷰어라서 신문 톤은 유지하되 모노크롬 일변도는 피하고 정당색을 액센트로 강하게 쓴다.  
> 최종 갱신: 2026-05-29

---

## 0. 이 프로젝트 디자인 5대 요구사항

| # | 요구 | 의미 |
|---|------|------|
| 1 | **정보 밀도 1순위** | 14섹션 표·인용·링크 전부 보여야 함. 미니멀 ≠ 비어있음 |
| 2 | **정치 중립** | 어느 한 정당 색깔로 사이트 전체가 물들면 안 됨. 베이스는 무채색, 정당색은 셀·바·칩 단위로만 |
| 3 | **신뢰성 시그널** | 출처 링크·갱신일·Truth-status 라벨이 항상 보여야 함 |
| 4 | **공보 + 신문 하이브리드** | 후보 카드는 공보(기호 크게·정당색·이름), 본문은 신문(긴 글·표·인용) |
| 5 | **모바일 우선 아님, 둘 다** | 데스크탑에서 매트릭스·사이드바, 모바일에서 카드·드롭다운 |

---

## 1. 카테고리별 레퍼런스 사이트

### A. 무료 UI 스크린샷 검색 (mobbin 대안)

| 사이트 | URL | 쓰는 법 |
|---|---|---|
| **Banani** | https://www.banani.co/references | 가입 없이 100+ 앱 UI 스크린샷. Tinder/Duolingo/Airbnb 등 |
| **Lapa Ninja** | https://www.lapa.ninja | 랜딩 페이지 위주지만 카테고리 필터 (`Marketing`, `Portfolio` 등) |
| **Webframe** | https://webframe.xyz | SaaS/웹앱 full-scroll 스크린샷. dashboard·pricing·navigation 디테일 |
| **Collect UI** | https://collectui.com | 일별 UI 컴포넌트. `Cards`·`Tables`·`Statistics` 등 카테고리 |
| **Dribbble** | https://dribbble.com | 키워드 검색: `voter info`, `election candidate`, `politician profile`, `comparison table`, `data dense` |
| **Behance** | https://www.behance.net | 더 큰 케이스 스터디 단위. `election design`, `political infographic` |
| **Pinterest** | https://www.pinterest.com | `election results UI`, `voter guide design`, `candidate comparison` |
| **Figma Community** | https://www.figma.com/community | 무료 템플릿. `Election`, `Voting`, `Wiki` 검색 |
| **Pttrns** | https://pttrns.com | 모바일 UI 패턴 (일부 유료) |
| **Toools.design** | https://www.toools.design | 100+ 영감 사이트 큐레이션. 다른 사이트들 입구 |

### B. 정치·선거 정보 사이트 (도메인 직접 참고)

| 사이트 | URL | 우리가 훔칠 패턴 |
|---|---|---|
| **열려라국회 (참여연대)** | https://watch.peoplepower21.org/AssemblyMembers | **다중 필터 시스템** (정당·지역·상임위·성별·연령·당선횟수 동시 필터) / CCL 라이선스 명시 / 신뢰성 표기 |
| **2026win (민주당 지선)** | https://2026win.kr/ | **거주지 입구 질문** → 단계별 개인화 / D-day 카운트다운 / "투표소 찾기" 행동 카드 |
| **선관위 후보자 정보** | http://info.nec.go.kr | 1차 데이터 출처. 디자인 참고 X, **데이터 구조만** 참고 |
| **우리동네후보 (베스트셀러)** | https://besuccess.com/mycandidates/ | 지역구 후보 한 화면에 (시민이 자주 본 사례) |
| **Ballotpedia** | https://ballotpedia.org | 위키 톤 + infobox 우측 사이드바 + 후보 side-by-side 비교. 영문이지만 정보 밀도 표준 |
| **Vote.org** | https://www.vote.org | 행동 유도 톤 (등록·투표일 안내) — 우리 홈 D-day 영역 참고 |
| **BBC Elections** | https://www.bbc.com/news/topics/c008ql15zr1t (영국 총선 등) | 결과 매트릭스·정당색 스트립·실시간 카드 |
| **NYT Election Hub** | https://www.nytimes.com/section/politics/election (선거 시즌) | 후보 상세 + long-form + 영상 + 데이터 시각화 통합 |
| **The Pudding** | https://pudding.cool | 정보 밀도 + 데이터 시각화 + 에디토리얼 결합 톱티어 |
| **위키백과 한국어 선거 문서** | https://ko.wikipedia.org/wiki/제9회_전국동시지방선거 | 표·infobox·각주 형식 — 매트릭스 디자인 1차 참고 |

### C. 정보 밀도 / 위키 / Long-form 톤

| 사이트 | URL | 패턴 |
|---|---|---|
| **Wikipedia** | https://wikipedia.org | infobox 우측 / 섹션 점프 사이드바 / 표 가독성 |
| **Stripe Docs** | https://docs.stripe.com | 좌측 sticky nav + 본문 max-w + 우측 참고 패널 (3컬럼) |
| **Notion 공개 페이지** | https://notion.so/templates | 인라인 표·콜아웃·토글 (의혹 펼치기 패턴 참고) |
| **Bloomberg 기사** | https://www.bloomberg.com | 데이터 + 차트 + 본문 인터리브 |
| **FT visual journalism** | https://ig.ft.com | 차트 강조 + 본문 narrative |

### D. 비교 매트릭스 / 데이터 그리드 패턴

| 참고 검색어 | 어디서 |
|---|---|
| `comparison table design` | Dribbble · Collect UI |
| `feature matrix` | Webframe (SaaS pricing 표) |
| `politicians side by side` | Pinterest · Behance |
| `policy comparison chart` | The Pudding · NYT graphics |
| `voter scorecard UI` | Behance |

---

## 2. 우리 프로젝트 페이지별 참고 매핑

### 홈 (`/`)

| 요소 | 참고 |
|---|---|
| 헤더 메시지 + D-day | 2026win.kr 입구 / Vote.org 액션 톤 |
| 지역·직책 카드 그리드 | Webframe SaaS dashboard / Dribbble "election dashboard" |
| 자치구 묶음 표시 | 위키백과 시·도별 표 / Stripe docs grouped nav |

### 직책 인덱스 (`/seoul/mayor/`)

| 요소 | 참고 |
|---|---|
| 후보 6명 카드 그리드 | 열려라국회 의원 목록 + 정당색 / Banani의 카드 검색 |
| 비교 매트릭스 탭 | Webframe SaaS pricing table / 위키 비교 표 / The Pudding 차트 |
| 다중 필터 (정당·전과·재산) | 열려라국회 필터 사이드바 (정당·지역·연령·당선횟수 6단) |

### 후보 상세 (`/seoul/mayor/01/`)

| 요소 | 참고 |
|---|---|
| 큰 기호 + 정당색 + 이름 헤더 | 선관위 공보 + Vote.org 후보 카드 |
| 좌측 sticky 14섹션 네비 | Stripe Docs · MDN Web Docs (3컬럼) |
| §10 심층분석 (이행가능성 H/M/L + 라벨) | Notion 토글 + Bloomberg 차트 인라인 |
| §14 의혹 (Truth-status 6종) | Wikipedia 각주 박스 + NYT 사실확인 박스 (PolitiFact 스타일 라벨) |
| 출처 링크 (마지막 섹션) | 위키 각주 / NYT methodology box |
| QuickStats 4분할 | Bloomberg 종목 페이지 통계 박스 |

### 비례 정당 페이지 (`/seoul/council-pr/01/`)

| 요소 | 참고 |
|---|---|
| 정당 큰 로고/색상 헤더 | 정당 공식 홈 + 위키 정당 infobox |
| 명부 전원 표 (14~18명) | 위키 비례 명부 / Bloomberg 인덱스 구성종목 표 |
| 상위 5명 프로필 (§4) | 후보 카드 미니 버전 5개 가로 |

### 비교 매트릭스 (`/seoul/mayor/?tab=matrix`)

| 요소 | 참고 |
|---|---|
| 분야(행) × 후보(열) 그리드 | The Pudding 정책 비교 / FT visual journalism |
| 셀에 공약 요약 + 호버 시 전문 | Webframe pricing tooltip |
| "미언급" 회색 dash | NYT score chart 빈 셀 |
| 강점 분야 하이라이트 | Bloomberg 색상 코딩 (강세=초록, 약세=빨강 X — 우리는 정당색만) |

---

## 3. 무엇을 피할 것인가

- **Axis 모노크롬 일변도** — 본 사이트는 18개 정당 색깔이 다 들어가야 함. 흑백만 쓰면 정당 식별 불가
- **단일 정당 색이 사이트를 점령** — 헤더/푸터/홈은 무채색 유지. 정당색은 후보별 컬러바·칩·매트릭스 셀에만
- **단정형 평가 UI** — "이 후보는 신뢰할 수 없음" 같은 한쪽 단정은 안 됨. Truth-status 라벨로 등급화
- **모바일 햄버거 메뉴만** — 14섹션 네비가 모바일에서도 보여야 함 (sticky 드롭다운으로 해결)
- **Awwwards급 화려한 애니메이션** — 정보 뷰어에 distraction. 호버·페이드 정도만
- **다크모드 강요** — 본문 가독성 우선. 시스템 prefers-color-scheme 따라가지 않고 라이트 고정 (지금 globals.css 그렇게 돼있음)

---

## 4. shadcn/ui 2.x 컴포넌트 매핑

(shadcn 2.x는 `@base-ui/react` 기반, `asChild` 금지, `render={...}` 패턴)

| 우리 UI | shadcn 컴포넌트 |
|---|---|
| 직책 탭 (카드/매트릭스/원본) | `Tabs` |
| 비교 매트릭스 표 | `Table` + `Tooltip` |
| 의혹 펼치기 | `Accordion` |
| Truth 라벨 툴팁 | `Tooltip` |
| 후보 검색 명령창 | `Command` (Cmd+K) |
| 필터 드롭다운 | `Select` / `Popover` |
| 모바일 사이드바 | `Sheet` |
| 인용 박스 | `Alert` |

`shadcn-mcp`로 빠른 컴포넌트 검색은 `ui-ux-pro-max` 스킬에 통합되어 있음.

---

## 5. 즉시 참고할 페이지 5개

VSCode에서 디자인 시작할 때 첫 30분 동안 이것들 띄워놓고 보면 됨:

1. **열려라국회** — https://watch.peoplepower21.org/AssemblyMembers  
   → 한국어 후보 카드·다중 필터 톤
2. **Ballotpedia 후보 페이지** — https://ballotpedia.org/Gavin_Newsom 같은 인물 페이지  
   → infobox + 본문 + 출처 구조
3. **Stripe Docs** — https://docs.stripe.com/payments  
   → 3컬럼 (좌 nav · 본문 · 우 참고)
4. **The Pudding 정책 비교** — https://pudding.cool 아무 데이터 기사  
   → 매트릭스 + narrative
5. **2026win.kr** — https://2026win.kr  
   → D-day · 거주지 입구 질문 톤

---

## 6. 디자인 시안 뽑을 때 워크플로

VSCode에서:

1. 이 문서 + SPEC.md 열기
2. 위 5개 사이트 탭 열고 패턴 메모
3. `/ui-ux-pro-max` 스킬 호출하면서 프롬프트:
   ```
   2026 지방선거 후보 정보 뷰어. 14섹션 long-form 본문 + 공보 카드 + 비교 매트릭스. 
   정당색을 액센트로(헤더는 무채색), 정보 밀도 1순위, 신뢰성 시그널(출처·갱신일·Truth-status) 항상 노출.
   /Users/sungwook/Desktop/election-2026-viewer/SPEC.md, DESIGN-REFS.md 읽고 후보 상세 페이지 시안 2~3개 뽑아줘.
   ```
4. 시안 비교 → 사용자 선택 → 컴포넌트별 토큰화

---

## 7. 출처

- [열려라국회 — 의원 현황](https://watch.peoplepower21.org/AssemblyMembers)
- [2026win — 민주당 지선 특별 홈페이지](https://2026win.kr/)
- [선관위 후보자 정보](http://info.nec.go.kr/main/main_load.xhtml)
- [Ballotpedia Voter Guide](https://voterguide.ballotpedia.org/)
- [Banani — 무료 mobbin 대안](https://www.banani.co/references)
- [Toools.design — 100 inspiration sites](https://www.toools.design/blog-posts/ultimate-list-100-best-inspiration-sites-to-inspire-designers)
- [Lapa Ninja](https://www.lapa.ninja)
- [Webframe](https://webframe.xyz)
- [Collect UI](https://collectui.com)
- [The Pudding](https://pudding.cool)
- [SaaS Landing Page — Web App Inspiration](https://saaslandingpage.com/articles/the-best-websites-to-find-web-app-inspiration-ui-and-ux/)
