import db from "@/lib/db";
import { notFound } from "next/navigation";
import EditForm from "./edit-form";

export default async function EditPage({
  params,
}: {
  params: { id: string };
}) {
  const postId = Number(params.id);

  const [posts]: any = await db.query(
    `
    SELECT id, title, content
    FROM community_posts
    WHERE id = ?
    LIMIT 1
    `,
    [postId]
  );

  if (!posts.length) {
    notFound();
  }

  const post = posts[0];

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold text-pink-400 mb-6">
          게시글 수정
        </h1>

        <EditForm
          postId={post.id}
          defaultTitle={post.title}
          defaultContent={post.content}
        />
      </div>
    </main>
  );
}