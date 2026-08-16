"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type ShopItem = {
  id: number;
  item_name: string;
  item_type: string;
  price: number;
  item_image: string | null;
  item_audio: string | null;
};

type CartMap = Record<number, number>;

const CART_STORAGE_KEY = "wangchu-shop-cart";
const MAX_QUANTITY = 99;

export default function ShopCart({
  items,
  initialDotori,
}: {
  items: ShopItem[];
  initialDotori: number | null;
}) {
  const [cart, setCart] = useState<CartMap>({});
  const [quantities, setQuantities] = useState<CartMap>({});
  const [loading, setLoading] = useState(false);
  const [dotori, setDotori] = useState<number | null>(initialDotori);
  const [hydrated, setHydrated] = useState(false);
  const cartSectionRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CART_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CartMap;
        const validIds = new Set(items.map((item) => item.id));
        const next: CartMap = {};

        Object.entries(parsed || {}).forEach(([rawId, rawQuantity]) => {
          const id = Number(rawId);
          const quantity = Math.min(MAX_QUANTITY, Math.max(1, Math.floor(Number(rawQuantity) || 0)));
          if (validIds.has(id) && quantity > 0) next[id] = quantity;
        });

        setCart(next);
      }
    } catch {
      localStorage.removeItem(CART_STORAGE_KEY);
    } finally {
      setHydrated(true);
    }
  }, [items]);

  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
  }, [cart, hydrated]);

  const itemById = useMemo(() => new Map(items.map((item) => [item.id, item])), [items]);

  const cartRows = useMemo(
    () =>
      Object.entries(cart)
        .map(([rawId, quantity]) => {
          const item = itemById.get(Number(rawId));
          return item ? { item, quantity } : null;
        })
        .filter((row): row is { item: ShopItem; quantity: number } => Boolean(row)),
    [cart, itemById]
  );

  const totalQuantity = cartRows.reduce((sum, row) => sum + row.quantity, 0);
  const totalPrice = cartRows.reduce((sum, row) => sum + row.item.price * row.quantity, 0);
  const afterBalance = dotori === null ? null : dotori - totalPrice;

  function getSelectQuantity(itemId: number) {
    return quantities[itemId] || 1;
  }

  function setSelectQuantity(itemId: number, next: number) {
    setQuantities((prev) => ({
      ...prev,
      [itemId]: Math.min(MAX_QUANTITY, Math.max(1, Math.floor(next || 1))),
    }));
  }

  function addToCart(item: ShopItem) {
    const quantity = getSelectQuantity(item.id);
    setCart((prev) => ({
      ...prev,
      [item.id]: Math.min(MAX_QUANTITY, (prev[item.id] || 0) + quantity),
    }));
  }

  function changeCartQuantity(itemId: number, next: number) {
    if (next <= 0) {
      removeFromCart(itemId);
      return;
    }

    setCart((prev) => ({
      ...prev,
      [itemId]: Math.min(MAX_QUANTITY, Math.max(1, Math.floor(next))),
    }));
  }

  function removeFromCart(itemId: number) {
    setCart((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });
  }

  function clearCart() {
    if (cartRows.length === 0) return;
    if (!confirm("장바구니를 전부 비울까요?")) return;
    setCart({});
  }

  async function checkout() {
    if (cartRows.length === 0 || loading) return;

    if (dotori === null) {
      alert("로그인 후 구매할 수 있습니다.");
      return;
    }

    if (dotori < totalPrice) {
      alert("도토리가 부족합니다.");
      return;
    }

    if (!confirm(`총 ${totalQuantity}개를 ${totalPrice.toLocaleString()} 도토리로 결제할까요?`)) {
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/shop/buy", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cartRows.map((row) => ({
            itemId: row.item.id,
            quantity: row.quantity,
          })),
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        alert(data.error || "구매 실패");
        return;
      }

      setCart({});
      setDotori(Number(data.remainingDotori) || 0);
      localStorage.removeItem(CART_STORAGE_KEY);
      alert(`총 ${Number(data.totalQuantity || totalQuantity).toLocaleString()}개 구매 완료! 내 아이템으로 이동합니다.`);
      window.location.href = "/mypage/inventory";
    } catch {
      alert("구매 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#09090f] px-4 py-8 text-white">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black">상점</h1>
            <p className="mt-2 text-sm text-zinc-400">원하는 아이템을 장바구니에 담고 한 번에 결제할 수 있습니다.</p>
          </div>

          <div className="rounded-2xl border border-yellow-400/20 bg-yellow-400/10 px-5 py-3">
            <div className="text-xs font-bold text-zinc-400">보유 도토리</div>
            <div className="mt-1 text-2xl font-black text-yellow-300">
              {dotori === null ? "로그인 필요" : `${dotori.toLocaleString()} 도토리`}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
          <section>
            {items.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#151522] p-8 text-center text-zinc-400">
                등록된 아이템이 없습니다.
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                {items.map((item) => {
                  const quantity = getSelectQuantity(item.id);
                  const inCart = cart[item.id] || 0;

                  return (
                    <div key={item.id} className="rounded-2xl border border-white/10 bg-[#151522] p-5">
                      <div className="mb-4 flex items-center justify-between gap-3">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-black ${
                            item.item_type === "signature" ? "bg-pink-500 text-white" : "bg-slate-700 text-white"
                          }`}
                        >
                          {item.item_type === "signature" ? "시그아이템" : "일반아이템"}
                        </span>
                        <span className="font-black text-yellow-300">{item.price.toLocaleString()} 도토리</span>
                      </div>

                      <div className="mb-4 flex h-40 w-full items-center justify-center overflow-hidden rounded-xl bg-black/30">
                        {item.item_image ? (
                          <img src={item.item_image} alt={item.item_name} className="h-full w-full object-contain" />
                        ) : (
                          <span className="text-5xl">🎁</span>
                        )}
                      </div>

                      <h2 className="text-xl font-black">{item.item_name}</h2>
                      {item.item_audio && <p className="mt-2 text-sm text-pink-300">방송 알림 노래 포함</p>}

                      <div className="mt-4 space-y-3">
                        <div className="rounded-xl border border-white/10 bg-black/20 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="text-sm font-bold text-zinc-300">담을 수량</span>
                            <div className="flex items-center overflow-hidden rounded-lg border border-white/10">
                              <button
                                type="button"
                                onClick={() => setSelectQuantity(item.id, quantity - 1)}
                                disabled={quantity <= 1}
                                className="h-9 w-10 bg-white/10 font-black hover:bg-white/20 disabled:opacity-40"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min={1}
                                max={MAX_QUANTITY}
                                value={quantity}
                                onChange={(e) => setSelectQuantity(item.id, Number(e.target.value))}
                                className="h-9 w-14 bg-black/40 text-center font-black outline-none"
                              />
                              <button
                                type="button"
                                onClick={() => setSelectQuantity(item.id, quantity + 1)}
                                disabled={quantity >= MAX_QUANTITY}
                                className="h-9 w-10 bg-white/10 font-black hover:bg-white/20 disabled:opacity-40"
                              >
                                +
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3">
                            <span className="text-sm text-zinc-400">선택 금액</span>
                            <span className="font-black text-yellow-300">{(item.price * quantity).toLocaleString()} 도토리</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => addToCart(item)}
                          className="w-full rounded-xl bg-yellow-500 px-4 py-3 font-black text-black hover:bg-yellow-400"
                        >
                          장바구니에 담기
                        </button>

                        {inCart > 0 && (
                          <div className="text-center text-xs font-bold text-emerald-300">장바구니에 {inCart}개 담김</div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          <aside ref={cartSectionRef} className="scroll-mt-4 h-fit rounded-2xl border border-white/10 bg-[#151522] p-5 lg:sticky lg:top-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black">장바구니</h2>
              <button
                type="button"
                onClick={clearCart}
                disabled={cartRows.length === 0 || loading}
                className="text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-40"
              >
                전체 비우기
              </button>
            </div>

            <div className="mt-4 max-h-[440px] space-y-3 overflow-y-auto pr-1">
              {cartRows.length === 0 ? (
                <div className="rounded-xl border border-dashed border-white/10 p-6 text-center text-sm text-zinc-500">
                  장바구니가 비어 있습니다.
                </div>
              ) : (
                cartRows.map(({ item, quantity }) => (
                  <div key={item.id} className="rounded-xl border border-white/10 bg-black/20 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate font-black">{item.item_name}</div>
                        <div className="mt-1 text-xs text-zinc-400">개당 {item.price.toLocaleString()} 도토리</div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        disabled={loading}
                        className="text-xs font-bold text-red-300 hover:text-red-200"
                      >
                        삭제
                      </button>
                    </div>

                    <div className="mt-3 flex items-center justify-between gap-3">
                      <div className="flex items-center overflow-hidden rounded-lg border border-white/10">
                        <button
                          type="button"
                          onClick={() => changeCartQuantity(item.id, quantity - 1)}
                          disabled={loading}
                          className="h-8 w-9 bg-white/10 font-black hover:bg-white/20"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={MAX_QUANTITY}
                          value={quantity}
                          onChange={(e) => changeCartQuantity(item.id, Number(e.target.value))}
                          disabled={loading}
                          className="h-8 w-12 bg-black/40 text-center text-sm font-black outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => changeCartQuantity(item.id, quantity + 1)}
                          disabled={loading || quantity >= MAX_QUANTITY}
                          className="h-8 w-9 bg-white/10 font-black hover:bg-white/20 disabled:opacity-40"
                        >
                          +
                        </button>
                      </div>
                      <div className="font-black text-yellow-300">{(item.price * quantity).toLocaleString()}</div>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="mt-5 space-y-3 border-t border-white/10 pt-5">
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">총 수량</span>
                <span className="font-black">{totalQuantity.toLocaleString()}개</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-zinc-300">총 결제금액</span>
                <span className="text-xl font-black text-yellow-300">{totalPrice.toLocaleString()} 도토리</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">보유 도토리</span>
                <span className="font-black">{dotori === null ? "-" : dotori.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-zinc-400">결제 후 잔액</span>
                <span className={`font-black ${afterBalance !== null && afterBalance < 0 ? "text-red-400" : "text-emerald-300"}`}>
                  {afterBalance === null ? "-" : afterBalance.toLocaleString()}
                </span>
              </div>

              <button
                type="button"
                onClick={checkout}
                disabled={loading || cartRows.length === 0 || dotori === null || (afterBalance !== null && afterBalance < 0)}
                className="mt-2 w-full rounded-xl bg-yellow-500 px-4 py-3 font-black text-black hover:bg-yellow-400 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? "결제 중..." : `${totalPrice.toLocaleString()} 도토리 결제하기`}
              </button>
            </div>
          </aside>
        </div>
      </div>

      <button
        type="button"
        onClick={() => cartSectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })}
        className="fixed bottom-4 right-4 z-[9999] flex min-h-12 items-center gap-2 rounded-2xl border border-yellow-300/30 bg-yellow-400 px-4 py-3 text-sm font-black text-black shadow-2xl transition active:scale-95 lg:hidden"
        aria-label="장바구니로 이동"
      >
        <span className="text-lg">🛒</span>
        <span>장바구니</span>
        {totalQuantity > 0 && (
          <span className="flex min-w-6 items-center justify-center rounded-full bg-black px-1.5 py-0.5 text-xs font-black text-yellow-300">
            {totalQuantity > 99 ? "99+" : totalQuantity}
          </span>
        )}
      </button>
    </main>
  );
}
