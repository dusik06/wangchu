export const dynamic = "force-dynamic";

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-[#09090f] px-4 py-24 text-white">
      <div className="mx-auto max-w-4xl rounded-3xl border border-white/10 bg-[#151522] p-8">
        <h1 className="text-3xl font-black">이용약관 및 운영정책</h1>

        <div className="mt-8 space-y-6 text-sm leading-7 text-zinc-300">
          <section>
            <h2 className="text-lg font-black text-white">1. 도토리 안내</h2>
            <p className="mt-2">
              도토리는 왕츄 팬 커뮤니티 내 활동용 비환금성 포인트입니다.
              도토리는 현금 가치가 없으며 환전, 양도, 거래, 판매가 불가능합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white">2. 지급 및 회수</h2>
            <p className="mt-2">
              도토리는 출석, 게시글, 댓글, 이벤트, 운영진 지급 등 사이트 활동에
              따라 지급될 수 있습니다. 운영 정책 또는 오류, 비정상 이용이 확인될
              경우 도토리는 조정 또는 회수될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white">3. 게임 콘텐츠</h2>
            <p className="mt-2">
              사이트 내 게임 콘텐츠는 비환금성 포인트를 사용하는 단순 오락용
              콘텐츠입니다. 모든 게임 결과는 현금 환전, 실물 보상, 금전적 가치와
              무관합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white">4. 상점 및 아이템</h2>
            <p className="mt-2">
              상점 아이템은 팬 커뮤니티 활동, 방송 리액션, 꾸미기, 수집 목적의
              콘텐츠입니다. 아이템은 현금 또는 현금성 상품으로 교환되지 않습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white">5. 비정상 이용 제한</h2>
            <p className="mt-2">
              버그 악용, 자동화 프로그램 사용, 부정한 방법의 포인트 획득,
              타인에게 피해를 주는 행위가 확인될 경우 이용 제한, 포인트 회수,
              계정 제재가 적용될 수 있습니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-black text-white">6. 운영 정책 변경</h2>
            <p className="mt-2">
              본 운영정책은 사이트 운영 상황에 따라 변경될 수 있으며, 변경된
              내용은 사이트 내 공지 또는 페이지를 통해 안내될 수 있습니다.
            </p>
          </section>
        </div>
      </div>
    </main>
  );
}