"use client";

import { useState } from "react";
import UserNameWithTitle from "@/components/UserNameWithTitle";

type TitleEquipCardProps = {
  title: any;
  user: any;
  isEquipped: boolean;
};

const titleColors = [
  { name: "골드", value: "#facc15" },
  { name: "핑크", value: "#fb7185" },
  { name: "보라", value: "#c084fc" },
  { name: "하늘", value: "#38bdf8" },
  { name: "민트", value: "#34d399" },
  { name: "화이트", value: "#f8fafc" },
];

export default function TitleEquipCard({ title, user, isEquipped }: TitleEquipCardProps) {
  const [selectedColor, setSelectedColor] = useState(title.title_color || "#facc15");
  const titleName = title.title_name || "이름 없는 칭호";

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5">
      <div className="mb-4">
        <p className="text-sm text-zinc-400 mb-2">칭호명</p>
        <div className="text-xl font-extrabold">{titleName}</div>
      </div>

      <div className="mb-5 rounded-xl bg-black/20 border border-white/10 p-4">
        <p className="text-sm text-zinc-400 mb-3">적용 미리보기</p>

        <UserNameWithTitle
          nickname={user.nickname}
          profileImage={user.profile_image || user.image}
          titleName={titleName}
          titleColor={selectedColor}
          size="md"
        />
      </div>

      <form action="/api/mypage/title-equip" method="POST">
        <input type="hidden" name="titleId" value={title.id} />
        <input type="hidden" name="titleColor" value={selectedColor} />

        <p className="text-sm text-zinc-400 mb-2">칭호 색상 선택</p>

        <div className="grid grid-cols-3 gap-2 mb-4">
          {titleColors.map((color) => (
            <button
              key={color.value}
              type="button"
              onClick={() => setSelectedColor(color.value)}
              className={`flex items-center gap-2 bg-black/30 border rounded-lg px-3 py-2 cursor-pointer hover:bg-white/10 ${
                selectedColor === color.value ? "border-white/80" : "border-white/10"
              }`}
            >
              <span
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: color.value }}
              />
              <span className="text-sm">{color.name}</span>
            </button>
          ))}
        </div>

        <button className="w-full py-3 rounded-xl bg-yellow-500 hover:bg-yellow-400 text-black font-bold cursor-pointer">
          {isEquipped ? "색상 저장" : "이 칭호로 변경"}
        </button>
      </form>
    </div>
  );
}