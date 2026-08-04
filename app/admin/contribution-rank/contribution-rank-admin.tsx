"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

type Category = {
  id: number;
  name: string;
  isCalculated: boolean;
  displayOrder: number;
};

type Participant = {
  id: number;
  rankName: string;
  streamerName: string;
  manualContribution: number;
  contribution: number;
  calculatedAmount: number;
  amounts: Record<string, number>;
};

type RankData = {
  title: string;
  categories: Category[];
  participants: Participant[];
};

const emptyData: RankData = {
  title: "기여도 순위",
  categories: [],
  participants: [],
};

function formatMoney(value: number) {
  return Math.trunc(Number(value || 0)).toLocaleString("ko-KR");
}

export default function ContributionRankAdmin() {
  const [data, setData] = useState<RankData>(emptyData);
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [message, setMessage] = useState("");
  const [titleDraft, setTitleDraft] = useState("");
  const [amountInputs, setAmountInputs] = useState<Record<string, string>>({});
  const [manualInputs, setManualInputs] = useState<Record<string, string>>({});
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/contribution-rank", { cache: "no-store" });
      const json = await res.json();
      setData(json);
      setTitleDraft((current) => current || json.title || "기여도 순위");
    } catch {
      setMessage("데이터를 불러오지 못했습니다.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const timer = window.setInterval(load, 1500);
    return () => window.clearInterval(timer);
  }, [load]);

  const overlayUrl = useMemo(() => {
    if (typeof window === "undefined") return "/overlay/contribution-rank";
    return `${window.location.origin}/overlay/contribution-rank`;
  }, []);

  async function action(payload: Record<string, unknown>) {
    setWorking(true);
    setMessage("");
    try {
      const res = await fetch("/api/admin/contribution-rank", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "처리하지 못했습니다.");
      await load();
      return true;
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "오류가 발생했습니다.");
      return false;
    } finally {
      setWorking(false);
    }
  }

  async function copyOverlayUrl() {
    await navigator.clipboard.writeText(overlayUrl);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  }

  if (loading) {
    return <main className="min-h-screen bg-[#090613] p-6 text-white">불러오는 중...</main>;
  }

  return (
    <main className="min-h-screen bg-[#090613] text-white">
      <div className="mx-auto max-w-[1600px] p-4 md:p-7">
        <header className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <p className="text-sm font-bold text-violet-400">OBS 방송 도구</p>
            <h1 className="mt-1 text-3xl font-black">기여도 순위 관리</h1>
            <p className="mt-2 text-sm text-white/55">
              모바일과 PC에서 수정하면 방송 화면에 자동으로 반영됩니다.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href="/admin" className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm font-bold hover:bg-white/10">
              관리자 홈
            </a>
            <button
              type="button"
              disabled={working}
              onClick={() => action({ action: "addParticipant" })}
              className="rounded-xl bg-violet-600 px-5 py-3 text-sm font-black hover:bg-violet-500 disabled:opacity-50"
            >
              + 인원 추가
            </button>
          </div>
        </header>

        {message && (
          <div className="mb-4 rounded-xl border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm font-bold text-red-200">
            {message}
          </div>
        )}

        <section className="mb-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_520px]">
          <div className="rounded-2xl border border-white/10 bg-[#151027] p-4 md:p-5">
            <h2 className="mb-4 text-lg font-black">기본 설정</h2>

            <div className="grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input
                value={titleDraft}
                onChange={(event) => setTitleDraft(event.target.value)}
                className="min-w-0 rounded-xl border border-white/10 bg-[#090613] px-4 py-3 font-bold outline-none focus:border-violet-400"
                placeholder="표 제목"
              />
              <button
                type="button"
                onClick={() => action({ action: "setTitle", title: titleDraft })}
                className="rounded-xl bg-violet-700 px-5 py-3 font-bold hover:bg-violet-600"
              >
                제목 저장
              </button>
              <button
                type="button"
                onClick={() => {
                  if (confirm("모든 후원금과 수동 기여도를 0으로 초기화할까요?")) {
                    action({ action: "resetAll" });
                  }
                }}
                className="rounded-xl bg-red-900/80 px-5 py-3 font-bold hover:bg-red-800"
              >
                전체 초기화
              </button>
            </div>

            <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto_auto]">
              <input
                readOnly
                value={overlayUrl}
                className="min-w-0 rounded-xl border border-white/10 bg-[#090613] px-4 py-3 text-sm text-white/80"
              />
              <button
                type="button"
                onClick={copyOverlayUrl}
                className="rounded-xl bg-emerald-700 px-5 py-3 font-bold hover:bg-emerald-600"
              >
                {copied ? "복사 완료" : "OBS 주소 복사"}
              </button>
              <a
                href="/overlay/contribution-rank"
                target="_blank"
                className="rounded-xl bg-white/10 px-5 py-3 text-center font-bold hover:bg-white/15"
              >
                새 창
              </a>
            </div>

            <div className="mt-5 rounded-xl border border-violet-400/15 bg-violet-400/5 px-4 py-3 text-sm text-white/65">
              최종 기여도 = 계산 포함 카테고리 합계 ÷ 10,000원(소수점 버림) + 수동 기여도
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-[#151027] p-4 md:p-5">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-black">실시간 OBS 미리보기</h2>
              <span className="text-xs font-bold text-emerald-400">● 자동 반영</span>
            </div>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-[linear-gradient(45deg,#151027_25%,#0c0917_25%,#0c0917_50%,#151027_50%,#151027_75%,#0c0917_75%)] bg-[length:20px_20px]">
              <iframe
                src="/overlay/contribution-rank?preview=1"
                className="h-[390px] w-full border-0"
                title="OBS 기여도 순위 미리보기"
              />
            </div>
          </div>
        </section>

        <section className="mb-5 rounded-2xl border border-white/10 bg-[#151027] p-4 md:p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-lg font-black">상단 카테고리 관리</h2>
              <p className="mt-1 text-xs text-white/45">
                후원 종류를 추가하고 기여도 계산 포함 여부를 선택할 수 있습니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() => action({ action: "addCategory", name: "새 후원" })}
              className="rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-black text-black hover:bg-amber-500"
            >
              + 금액 카테고리 추가
            </button>
          </div>

          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {data.categories.map((category) => (
              <CategoryEditor key={category.id} category={category} action={action} />
            ))}
            {data.categories.length === 0 && (
              <p className="text-sm text-white/45">금액 카테고리를 추가해주세요.</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border border-white/10 bg-[#151027] p-3 md:p-5">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-black">인원별 입력</h2>
              <p className="mt-1 text-xs text-white/45">
                금액을 입력하고 + 또는 −를 반복해서 누를 수 있습니다.
              </p>
            </div>
            <span className="text-sm font-bold text-white/55">{data.participants.length}명</span>
          </div>

          <div className="space-y-4">
            {data.participants.map((participant, index) => (
              <article key={participant.id} className="rounded-2xl border border-white/10 bg-[#0d0919] p-4">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start">
                  <div className="flex min-w-[54px] items-center justify-center rounded-xl bg-white/5 px-3 py-3 text-xl font-black">
                    {index + 1}위
                  </div>

                  <ParticipantIdentity participant={participant} action={action} />

                  <div className="grid min-w-0 flex-1 gap-3 sm:grid-cols-2 2xl:grid-cols-3">
                    {data.categories.map((category) => {
                      const key = `${participant.id}:${category.id}`;
                      const input = amountInputs[key] ?? "";
                      return (
                        <div key={category.id} className="rounded-xl border border-white/8 bg-white/[0.03] p-3">
                          <div className="mb-2 flex items-center justify-between gap-2">
                            <span className="truncate text-sm font-black">{category.name}</span>
                            <span className="text-xs text-white/45">
                              {formatMoney(participant.amounts[String(category.id)] || 0)}원
                            </span>
                          </div>
                          <div className="grid grid-cols-[minmax(0,1fr)_42px_42px] gap-2">
                            <input
                              inputMode="numeric"
                              value={input}
                              onChange={(event) =>
                                setAmountInputs((prev) => ({ ...prev, [key]: event.target.value.replace(/[^0-9]/g, "") }))
                              }
                              placeholder="금액"
                              className="min-w-0 rounded-lg border border-white/10 bg-[#090613] px-3 py-2 text-right font-bold outline-none focus:border-violet-400"
                            />
                            <button
                              type="button"
                              onClick={async () => {
                                const value = Number(input || 0);
                                if (await action({ action: "adjustAmount", participantId: participant.id, categoryId: category.id, delta: value })) {
                                  setAmountInputs((prev) => ({ ...prev, [key]: "" }));
                                }
                              }}
                              className="rounded-lg bg-emerald-800 font-black hover:bg-emerald-700"
                            >
                              +
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const value = Number(input || 0);
                                if (await action({ action: "adjustAmount", participantId: participant.id, categoryId: category.id, delta: -value })) {
                                  setAmountInputs((prev) => ({ ...prev, [key]: "" }));
                                }
                              }}
                              className="rounded-lg bg-red-900 font-black hover:bg-red-800"
                            >
                              −
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <div className="rounded-xl border border-violet-400/20 bg-violet-400/5 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-sm font-black text-violet-200">수동 기여도</span>
                        <span className="text-xs font-bold text-violet-300">{participant.manualContribution > 0 ? "+" : ""}{participant.manualContribution}</span>
                      </div>
                      <div className="grid grid-cols-[minmax(0,1fr)_42px_42px] gap-2">
                        <input
                          inputMode="numeric"
                          value={manualInputs[String(participant.id)] ?? ""}
                          onChange={(event) =>
                            setManualInputs((prev) => ({
                              ...prev,
                              [String(participant.id)]: event.target.value.replace(/[^0-9]/g, ""),
                            }))
                          }
                          placeholder="점수"
                          className="min-w-0 rounded-lg border border-white/10 bg-[#090613] px-3 py-2 text-right font-bold outline-none focus:border-violet-400"
                        />
                        <button
                          type="button"
                          onClick={async () => {
                            const value = Number(manualInputs[String(participant.id)] || 0);
                            if (await action({ action: "adjustManualContribution", participantId: participant.id, delta: value })) {
                              setManualInputs((prev) => ({ ...prev, [String(participant.id)]: "" }));
                            }
                          }}
                          className="rounded-lg bg-emerald-800 font-black hover:bg-emerald-700"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={async () => {
                            const value = Number(manualInputs[String(participant.id)] || 0);
                            if (await action({ action: "adjustManualContribution", participantId: participant.id, delta: -value })) {
                              setManualInputs((prev) => ({ ...prev, [String(participant.id)]: "" }));
                            }
                          }}
                          className="rounded-lg bg-red-900 font-black hover:bg-red-800"
                        >
                          −
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="grid min-w-[150px] grid-cols-2 gap-2 xl:grid-cols-1">
                    <div className="rounded-xl bg-violet-600/20 p-3 text-center">
                      <div className="text-xs text-violet-200">최종 기여도</div>
                      <div className="mt-1 text-3xl font-black text-violet-100">{participant.contribution}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`${participant.streamerName}님을 삭제할까요?`)) {
                          action({ action: "deleteParticipant", id: participant.id });
                        }
                      }}
                      className="rounded-xl bg-red-950/80 px-3 py-3 text-sm font-bold text-red-200 hover:bg-red-900"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              </article>
            ))}

            {data.participants.length === 0 && (
              <div className="py-16 text-center text-white/45">
                오른쪽 위의 “인원 추가”를 눌러 시작하세요.
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}

function CategoryEditor({
  category,
  action,
}: {
  category: Category;
  action: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [name, setName] = useState(category.name);
  const [isCalculated, setIsCalculated] = useState(category.isCalculated);

  useEffect(() => {
    setName(category.name);
    setIsCalculated(category.isCalculated);
  }, [category.name, category.isCalculated]);

  return (
    <div className="rounded-xl border border-white/10 bg-[#0d0919] p-3">
      <input
        value={name}
        onChange={(event) => setName(event.target.value)}
        className="w-full rounded-lg border border-white/10 bg-[#090613] px-3 py-2 font-bold outline-none focus:border-violet-400"
      />
      <div className="mt-3 flex items-center justify-between gap-2">
        <label className="flex cursor-pointer items-center gap-2 text-xs font-bold text-white/60">
          <input
            type="checkbox"
            checked={isCalculated}
            onChange={(event) => setIsCalculated(event.target.checked)}
          />
          기여도 계산 포함
        </label>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => action({ action: "updateCategory", id: category.id, name, isCalculated })}
            className="rounded-lg bg-violet-700 px-3 py-2 text-xs font-black hover:bg-violet-600"
          >
            저장
          </button>
          <button
            type="button"
            onClick={() => {
              if (confirm(`${category.name} 카테고리를 삭제할까요?`)) {
                action({ action: "deleteCategory", id: category.id });
              }
            }}
            className="rounded-lg bg-red-950 px-3 py-2 text-xs font-black text-red-200 hover:bg-red-900"
          >
            삭제
          </button>
        </div>
      </div>
    </div>
  );
}

function ParticipantIdentity({
  participant,
  action,
}: {
  participant: Participant;
  action: (payload: Record<string, unknown>) => Promise<boolean>;
}) {
  const [rankName, setRankName] = useState(participant.rankName);
  const [streamerName, setStreamerName] = useState(participant.streamerName);

  useEffect(() => {
    setRankName(participant.rankName);
    setStreamerName(participant.streamerName);
  }, [participant.rankName, participant.streamerName]);

  return (
    <div className="grid min-w-0 gap-2 sm:grid-cols-[130px_180px_auto] xl:w-[420px]">
      <input
        value={rankName}
        onChange={(event) => setRankName(event.target.value)}
        placeholder="직급"
        className="min-w-0 rounded-xl border border-white/10 bg-[#151027] px-3 py-3 text-center font-bold outline-none focus:border-violet-400"
      />
      <input
        value={streamerName}
        onChange={(event) => setStreamerName(event.target.value)}
        placeholder="스트리머"
        className="min-w-0 rounded-xl border border-white/10 bg-[#151027] px-3 py-3 text-center font-bold outline-none focus:border-violet-400"
      />
      <button
        type="button"
        onClick={() => action({ action: "updateParticipant", id: participant.id, rankName, streamerName })}
        className="rounded-xl bg-white/10 px-3 py-3 text-sm font-black hover:bg-white/15"
      >
        이름 저장
      </button>
    </div>
  );
}
