"use client";

import { useEffect, useState } from "react";

export default function OnlineUsers() {
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    fetchOnlineUsers();

    const timer = setInterval(() => {
      fetchOnlineUsers();
    }, 10000);

    return () => clearInterval(timer);
  }, []);

  async function fetchOnlineUsers() {
    const res = await fetch("/api/online-list", {
      cache: "no-store",
    });

    const data = await res.json();
    setUsers(data.users || []);
  }

  return (
    <div className="bg-slate-800 rounded-xl p-5">
      <h2 className="text-xl font-bold mb-4">🟢 현재 접속중</h2>

      {users.length === 0 ? (
        <p className="text-gray-400">접속중인 유저가 없습니다.</p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {users.map((user, index) => (
            <span
              key={index}
              className="bg-green-600 px-3 py-1 rounded-full text-sm font-bold"
            >
              {user.nickname}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}