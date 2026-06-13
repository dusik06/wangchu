"use client";

import { useEffect, useState } from "react";

export default function SiteLogoPage() {
  const [siteLogo, setSiteLogo] = useState("");
  const [loading, setLoading] = useState(false);

  const loadLogo = async () => {
    const res = await fetch("/api/admin/site-logo");
    const data = await res.json();

    if (data.success) {
      setSiteLogo(data.siteLogo || "");
    }
  };

  useEffect(() => {
    loadLogo();
  }, []);

  const saveLogo = async () => {
    if (!siteLogo) {
      alert("이미지 URL을 입력해주세요.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/admin/site-logo", {
      method: "POST",
      body: JSON.stringify({
        siteLogo,
      }),
    });

    const data = await res.json();

    setLoading(false);

    if (data.success) {
      alert("로고 저장 완료");
    } else {
      alert(data.message || "저장 실패");
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white px-4 py-8">
      <div className="mx-auto max-w-4xl">
        <section className="mb-6 rounded-3xl bg-slate-900 p-6">
          <p className="mb-2 text-sm font-bold text-emerald-400">
            ADMIN SITE LOGO
          </p>

          <h1 className="text-3xl font-black">사이트 로고 설정</h1>

          <p className="mt-3 text-sm text-slate-400">
            메인페이지 / 관리자페이지 공통 로고를 설정합니다.
          </p>
        </section>

        <section className="rounded-3xl bg-slate-900 p-6 space-y-6">
          <div>
            <label className="mb-2 block text-sm font-bold text-slate-300">
              로고 이미지 URL
            </label>

            <input
              type="text"
              value={siteLogo}
              onChange={(e) => setSiteLogo(e.target.value)}
              placeholder="https://example.com/logo.png"
              className="w-full rounded-2xl border border-slate-700 bg-slate-950 px-5 py-4 outline-none focus:border-pink-400"
            />
          </div>

          {siteLogo && (
            <div className="rounded-2xl bg-slate-950 p-6 border border-slate-800">
              <p className="mb-4 text-sm font-bold text-slate-400">
                미리보기
              </p>

              <img
                src={siteLogo}
                alt="site logo"
                className="h-24 object-contain"
              />
            </div>
          )}

          <button
            onClick={saveLogo}
            disabled={loading}
            className="cursor-pointer w-full rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 px-5 py-4 font-black text-white shadow-lg disabled:opacity-50"
          >
            {loading ? "저장 중..." : "로고 저장하기"}
          </button>
        </section>
      </div>
    </main>
  );
}