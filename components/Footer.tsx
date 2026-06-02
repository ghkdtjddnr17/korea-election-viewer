/**
 * Site footer with the legal disclaimer that's required to ship publicly.
 * Keep this neutral and monochrome — political accents belong on cards, not the chrome.
 */
export default function Footer() {
  return (
    <footer className="mt-16 border-t border-border bg-paper">
      <div className="mx-auto max-w-7xl px-4 lg:px-6 py-8 text-xs text-muted space-y-2">
        <p>
          <strong className="text-muted-strong">면책 안내</strong>{" "}
          본 사이트는 중앙선거관리위원회(info.nec.go.kr), 중앙선거여론조사심의위원회(NESDC),
          정책공약마당(policy.nec.go.kr), 검증된 1차 보도를 정리한 자료입니다.
          의혹·논란 항목은 Truth-status 6종 라벨
          (🔴사실확인 / 🟡미해명 / 🟠양측충돌 / ⚫허위 / ⚪판단보류 / 🔵검증결과)
          로 등급화하여 단정형 평가를 피했습니다.
        </p>
        <p>
          제9회 전국동시지방선거 · 투표일 2026-06-03 ·
          여론조사 공표 블랙아웃 2026-05-28 이후 · 검색엔진 색인 차단 (noindex,nofollow).
        </p>
      </div>
    </footer>
  );
}
