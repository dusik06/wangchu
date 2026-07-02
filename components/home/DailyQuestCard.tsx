import db from "@/lib/db";

type Props = {
  userId?: number | null;
};

async function getDailyQuest(userId?: number | null) {
  if (!userId) {
    return {
      attendance: 0,
      posts: 0,
      comments: 0,
      adminComments: 0,
    };
  }

  try {
    const [attendanceRows]: any = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM attendance
      WHERE user_id = ?
        AND attendance_date = CURDATE()
      `,
      [userId]
    );

    const [postRows]: any = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM community_posts
      WHERE user_id = ?
        AND reward_given = 1
        AND DATE(created_at) = CURDATE()
      `,
      [userId]
    );

    const [commentRows]: any = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM community_comments
      WHERE user_id = ?
        AND reward_given = 1
        AND DATE(created_at) = CURDATE()
      `,
      [userId]
    );

    const [adminCommentRows]: any = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM community_comments
      WHERE user_id = ?
        AND reward_given = 2
        AND DATE(created_at) = CURDATE()
      `,
      [userId]
    );

    return {
      attendance: Number(attendanceRows[0]?.count || 0),
      posts: Number(postRows[0]?.count || 0),
      comments: Number(commentRows[0]?.count || 0),
      adminComments: Number(adminCommentRows[0]?.count || 0),
    };
  } catch {
    return {
      attendance: 0,
      posts: 0,
      comments: 0,
      adminComments: 0,
    };
  }
}

function QuestRow({
  icon,
  title,
  current,
  max,
  reward,
}: {
  icon: string;
  title: string;
  current: number;
  max: number;
  reward: number;
}) {
  const done = current >= max;

  return (
    <div className="flex items-center justify-between rounded-2xl bg-[#151925] px-4 py-3">
      <div>
        <p className="font-black">
          {icon} {title}
        </p>
        <p className="mt-1 text-xs text-zinc-400">
          +{reward} 도토리 · {current}/{max}
        </p>
      </div>

      <span
        className={`rounded-full px-3 py-1 text-xs font-black ${
          done ? "bg-emerald-500 text-white" : "bg-[#2b2415] text-[#f7d36b]"
        }`}
      >
        {done ? "완료" : "진행중"}
      </span>
    </div>
  );
}

export default async function DailyQuestCard({ userId }: Props) {
  const quest = await getDailyQuest(userId);

  return (
    <div className="rounded-[26px] border border-[#3b321f] bg-[#090c14]/90 p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-black text-[#f7d36b]">
          🌰 도토리 일일퀘스트
        </h2>
        <span className="text-xs font-black text-zinc-400">매일 초기화</span>
      </div>

      {!userId ? (
        <p className="rounded-2xl bg-[#151925] p-4 text-sm text-zinc-400">
          로그인하면 오늘의 도토리 퀘스트를 확인할 수 있습니다.
        </p>
      ) : (
        <div className="space-y-3">
          <QuestRow
            icon="✅"
            title="출석체크"
            current={quest.attendance}
            max={1}
            reward={10}
          />

          <QuestRow
            icon="📝"
            title="게시글 작성"
            current={quest.posts}
            max={3}
            reward={20}
          />

          <QuestRow
            icon="💬"
            title="댓글 작성"
            current={quest.comments}
            max={5}
            reward={5}
          />

          <QuestRow
            icon="👑"
            title="관리자 글 댓글"
            current={quest.adminComments}
            max={1}
            reward={10}
          />
        </div>
      )}
    </div>
  );
}