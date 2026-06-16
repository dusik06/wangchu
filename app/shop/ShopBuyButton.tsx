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
  const [quantity, setQuantity] = useState(1);

  const itemPrice = Number(price) || 0;
  const totalPrice = itemPrice * quantity;

  function decreaseQuantity() {
    setQuantity((prev) => Math.max(1, prev - 1));
  }

  function increaseQuantity() {
    setQuantity((prev) => Math.min(99, prev + 1));
  }

  function changeQuantity(value: string) {
    const next = Number(value);

    if (!next || next < 1) {
      setQuantity(1);
      return;
    }

    setQuantity(Math.min(99, Math.floor(next)));
  }

  async function buyItem() {
    if (
      !confirm(
        `${itemName} ${quantity}개를 ${totalPrice.toLocaleString()} 도토리로 구매할까요?`
      )
    ) {
      return;
    }

    setLoading(true);

    const res = await fetch("/api/shop/buy", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ itemId, quantity }),
    });

    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      alert(data.error || "구매 실패");
      return;
    }

    alert(`${itemName} ${quantity}개 구매 완료! 내 아이템에 추가되었습니다.`);
    location.reload();
  }

  return (
    <div className="mt-4 space-y-3">
      <div className="rounded-xl border border-white/10 bg-black/20 p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="text-sm font-bold text-zinc-300">구매 수량</span>

          <div className="flex items-center overflow-hidden rounded-lg border border-white/10">
            <button
              type="button"
              onClick={decreaseQuantity}
              disabled={loading || quantity <= 1}
              className="h-9 w-10 bg-white/10 font-black text-white hover:bg-white/20 disabled:opacity-40"
            >
              -
            </button>

            <input
              type="number"
              min={1}
              max={99}
              value={quantity}
              onChange={(e) => changeQuantity(e.target.value)}
              disabled={loading}
              className="h-9 w-14 bg-black/40 text-center font-black text-white outline-none"
            />

            <button
              type="button"
              onClick={increaseQuantity}
              disabled={loading || quantity >= 99}
              className="h-9 w-10 bg-white/10 font-black text-white hover:bg-white/20 disabled:opacity-40"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
          <span className="text-sm text-zinc-400">총 가격</span>
          <span className="text-lg font-black text-yellow-300">
            {totalPrice.toLocaleString()} 도토리
          </span>
        </div>
      </div>

      <button
        onClick={buyItem}
        disabled={loading}
        className="w-full rounded-xl bg-yellow-500 px-4 py-3 font-black text-black hover:bg-yellow-400 disabled:opacity-50"
      >
        {loading ? "구매 중..." : `${quantity}개 구매하기`}
      </button>
    </div>
  );
}