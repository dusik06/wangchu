import db from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function send(data: any) {
  return `data: ${JSON.stringify(data)}\n\n`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const clientId = (url.searchParams.get("clientId") || "").trim();

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let closed = false;
      let lastPayload = "";

      async function push() {
        if (closed) return;

        try {
          const [stateRows]: any = await db.query(`
            SELECT
              current_type,
              current_id,
              current_key,
              updated_at
            FROM overlay_engine_state
            WHERE id = 1
            LIMIT 1
          `);

          const state = stateRows[0] || {};

          const [missionRows]: any = await db.query(`
            SELECT
              id,
              title,
              image_url,
              goal_dotori,
              current_dotori
            FROM broadcast_missions
            WHERE is_selected = 1
              AND status = 'active'
            ORDER BY id DESC
            LIMIT 1
          `);

          const payload = {
            success: true,
            clientId,
            state: state || null,
            mission: missionRows[0] || null,
            now: Date.now(),
          };

          const text = JSON.stringify(payload);

          if (text !== lastPayload) {
            lastPayload = text;
            controller.enqueue(encoder.encode(send(payload)));
          }
        } catch (error) {
          controller.enqueue(
            encoder.encode(
              send({
                success: false,
                message: "stream error",
              })
            )
          );
        }
      }

      await push();

      const timer = setInterval(push, 1000);
      const heartbeat = setInterval(() => {
        if (closed) return;
        controller.enqueue(encoder.encode(`: heartbeat ${Date.now()}\n\n`));
      }, 15000);

      req.signal.addEventListener("abort", () => {
        closed = true;
        clearInterval(timer);
        clearInterval(heartbeat);

        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}