"use client";

import { useState } from "react";

export default function ShopBuyButton({
  itemId,
  itemName,
  price,
}: {
  itemId: number;
  itemName: string;
  price: number;
}) {
  const [loading, setLoading] = useState(false);

  async function buyItem() {
    if (!confirm(`${itemName}을(를) ${price} 도토리로 구매할까요?`)) {
      return;
    }

    setLoading(true);

    const res = await fetch("/api/shop/buy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ itemId }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error || "구매 실패");
      return;
    }

    alert("구매 완료! 내 아이템에 추가되었습니다.");
    location.reload();
  }

  return (
    <button
      onClick={buyItem}
      disabled={loading}
      className="mt-4 w-full rounded-xl bg-yellow-500 px-4 py-3 font-black text-black hover:bg-yellow-400 disabled:opacity-50"
    >
      {loading ? "구매 중..." : "구매하기"}
    </button>
  );
}