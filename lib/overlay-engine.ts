import db from "@/lib/db";

type OverlayType = "item" | "mission";

type OverlayCommand =
  | "play"
  | "playing"
  | "observe"
  | "none"
  | "skip"
  | "refresh"
  | "replay"
  | "locked"
  | "error"
  | "missing-client";

type EngineResult = {
  success: boolean;
  command: OverlayCommand;
  item: any | null;
  mission: any | null;
  isOwner: boolean;
  message?: string;
};

function normalizeType(type: any): OverlayType {
  return String(type) === "mission" ? "mission" : "item";
}

function makeCurrentKey(type: OverlayType, id: number, suffix?: string) {
  return `${type}-${id}${suffix ? `-${suffix}` : ""}`;
}

async function ensureEngineState(conn: any) {
  await conn.query(`
    INSERT IGNORE INTO overlay_engine_state
    (
      id,
      owner_client_id,
      owner_seen_at,
      current_type,
      current_id,
      current_started_at,
      current_key,
      updated_at
    )
    VALUES
    (1, NULL, NULL, NULL, NULL, NULL, NULL, NOW())
  `);
}

async function ensureControlRow(conn: any) {
  await conn.query(`
    INSERT IGNORE INTO overlay_queue_control
    (
      id,
      command,
      target_type,
      target_id,
      updated_at
    )
    VALUES
    (1, 'none', NULL, NULL, NOW())
  `);
}

async function getSelectedMission(conn: any) {
  const [rows]: any = await conn.query(`
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

  return rows[0] || null;
}

async function getItem(conn: any, id: number) {
  const [rows]: any = await conn.query(
    `
    SELECT
      id,
      'item' AS type,
      NULL AS alert_type,
      nickname,
      item_name AS title,
      item_image,
      item_audio,
      message,
      overlay_text,
      0 AS dotori_amount,
      status,
      locked_by,
      started_at,
      created_at,
      played_at
    FROM item_use_alerts
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function getMissionAlert(conn: any, id: number) {
  const [rows]: any = await conn.query(
    `
    SELECT
      id,
      'mission' AS type,
      alert_type,
      nickname,
      mission_title AS title,
      NULL AS item_image,
      NULL AS item_audio,
      '' AS message,
      NULL AS overlay_text,
      dotori_amount,
      status,
      locked_by,
      started_at,
      created_at,
      played_at
    FROM mission_overlay_alerts
    WHERE id = ?
    LIMIT 1
    `,
    [id]
  );

  return rows[0] || null;
}

async function getCurrentItem(conn: any, type: any, id: any) {
  const currentId = Number(id || 0);

  if (!currentId) return null;

  if (String(type) === "mission") {
    return getMissionAlert(conn, currentId);
  }

  if (String(type) === "item") {
    return getItem(conn, currentId);
  }

  return null;
}

async function clearCurrent(conn: any) {
  await conn.query(`
    UPDATE overlay_engine_state
    SET current_type = NULL,
        current_id = NULL,
        current_started_at = NULL,
        current_key = NULL,
        updated_at = NOW()
    WHERE id = 1
  `);
}

async function resetControl(conn: any) {
  await conn.query(`
    UPDATE overlay_queue_control
    SET command = 'none',
        target_type = NULL,
        target_id = NULL,
        updated_at = NOW()
    WHERE id = 1
  `);
}

async function getNextPending(conn: any) {
  const [itemRows]: any = await conn.query(`
    SELECT
      id,
      'item' AS type,
      NULL AS alert_type,
      nickname,
      item_name AS title,
      item_image,
      item_audio,
      message,
      overlay_text,
      0 AS dotori_amount,
      status,
      locked_by,
      started_at,
      created_at
    FROM item_use_alerts
    WHERE status = 'pending'
    ORDER BY created_at ASC, id ASC
    LIMIT 1
    FOR UPDATE
  `);

  const [missionRows]: any = await conn.query(`
    SELECT
      id,
      'mission' AS type,
      alert_type,
      nickname,
      mission_title AS title,
      NULL AS item_image,
      NULL AS item_audio,
      '' AS message,
      NULL AS overlay_text,
      dotori_amount,
      status,
      locked_by,
      started_at,
      created_at
    FROM mission_overlay_alerts
    WHERE status = 'pending'
    ORDER BY created_at ASC, id ASC
    LIMIT 1
    FOR UPDATE
  `);

  const rows = [...itemRows, ...missionRows];

  rows.sort((a, b) => {
    const at = new Date(a.created_at || 0).getTime();
    const bt = new Date(b.created_at || 0).getTime();

    if (at !== bt) return at - bt;

    if (a.type !== b.type) {
      return a.type === "mission" ? -1 : 1;
    }

    return Number(a.id) - Number(b.id);
  });

  return rows[0] || null;
}

async function markPendingAsPlaying(conn: any, item: any, clientId: string) {
  const id = Number(item.id);
  const type = normalizeType(item.type);

  if (type === "mission") {
    await conn.query(
      `
      UPDATE mission_overlay_alerts
      SET status = 'playing',
          locked_by = ?,
          started_at = NOW()
      WHERE id = ?
        AND status = 'pending'
      `,
      [clientId, id]
    );

    return getMissionAlert(conn, id);
  }

  await conn.query(
    `
    UPDATE item_use_alerts
    SET status = 'playing',
        locked_by = ?,
        started_at = NOW()
    WHERE id = ?
      AND status = 'pending'
    `,
    [clientId, id]
  );

  return getItem(conn, id);
}

async function markCurrentAsSkipped(conn: any) {
  await conn.query(`
    UPDATE item_use_alerts
    SET status = 'skipped',
        played_at = NOW()
    WHERE status = 'playing'
  `);

  await conn.query(`
    UPDATE mission_overlay_alerts
    SET status = 'skipped',
        played_at = NOW()
    WHERE status = 'playing'
  `);

  await clearCurrent(conn);
}

export const OverlayEngine = {
  async tick(clientId: string): Promise<EngineResult> {
    if (!clientId.trim()) {
      return {
        success: false,
        command: "missing-client",
        item: null,
        mission: null,
        isOwner: false,
        message: "clientId가 없습니다.",
      };
    }

    const conn = await (db as any).getConnection();

    try {
      const [lockRows]: any = await conn.query(
        "SELECT GET_LOCK('wangchu_overlay_engine_core_lock', 2) AS got_lock"
      );

      if (Number(lockRows[0]?.got_lock || 0) !== 1) {
        return {
          success: true,
          command: "locked",
          item: null,
          mission: null,
          isOwner: false,
        };
      }

      await conn.beginTransaction();

      await ensureEngineState(conn);
      await ensureControlRow(conn);

      const [stateRows]: any = await conn.query(`
        SELECT
          owner_client_id,
          owner_seen_at,
          current_type,
          current_id,
          current_started_at,
          current_key,
          TIMESTAMPDIFF(SECOND, owner_seen_at, NOW()) AS owner_age
        FROM overlay_engine_state
        WHERE id = 1
        LIMIT 1
        FOR UPDATE
      `);

      const state = stateRows[0] || {};
      const ownerClientId = state.owner_client_id || "";
      const ownerAge = Number(state.owner_age || 9999);

      const isOwner =
        !ownerClientId || ownerClientId === clientId || ownerAge >= 8;

      if (isOwner) {
        await conn.query(
          `
          UPDATE overlay_engine_state
          SET owner_client_id = ?,
              owner_seen_at = NOW(),
              updated_at = NOW()
          WHERE id = 1
          `,
          [clientId]
        );
      }

      const mission = await getSelectedMission(conn);

      const [controlRows]: any = await conn.query(`
        SELECT command, target_type, target_id
        FROM overlay_queue_control
        WHERE id = 1
        LIMIT 1
        FOR UPDATE
      `);

      const control = controlRows[0] || {
        command: "none",
        target_type: null,
        target_id: null,
      };

      if (isOwner && control.command === "refresh") {
        await resetControl(conn);
        await conn.commit();

        return {
          success: true,
          command: "refresh",
          item: null,
          mission,
          isOwner,
        };
      }

      if (isOwner && control.command === "skip") {
        await markCurrentAsSkipped(conn);
        await resetControl(conn);
        await conn.commit();

        return {
          success: true,
          command: "skip",
          item: null,
          mission,
          isOwner,
        };
      }

      if (isOwner && control.command === "replay" && control.target_id) {
        const type = normalizeType(control.target_type);
        const id = Number(control.target_id);
        const replayItem = await getCurrentItem(conn, type, id);

        if (replayItem) {
          if (type === "mission") {
            await conn.query(
              `
              UPDATE mission_overlay_alerts
              SET status = 'playing',
                  locked_by = ?,
                  started_at = NOW()
              WHERE id = ?
              `,
              [clientId, id]
            );
          } else {
            await conn.query(
              `
              UPDATE item_use_alerts
              SET status = 'playing',
                  locked_by = ?,
                  started_at = NOW()
              WHERE id = ?
              `,
              [clientId, id]
            );
          }

          const activeReplayItem = await getCurrentItem(conn, type, id);

          await conn.query(
            `
            UPDATE overlay_engine_state
            SET current_type = ?,
                current_id = ?,
                current_started_at = NOW(),
                current_key = ?,
                updated_at = NOW()
            WHERE id = 1
            `,
            [type, id, makeCurrentKey(type, id, `replay-${Date.now()}`)]
          );

          await resetControl(conn);
          await conn.commit();

          return {
            success: true,
            command: "replay",
            item: activeReplayItem || replayItem,
            mission,
            isOwner,
          };
        }

        await resetControl(conn);
        await conn.commit();

        return {
          success: true,
          command: "replay",
          item: replayItem || null,
          mission,
          isOwner,
        };
      }

      let currentItem = await getCurrentItem(
        conn,
        state.current_type,
        state.current_id
      );

      if (currentItem && currentItem.status !== "playing") {
        await clearCurrent(conn);
        currentItem = null;
      }

      if (currentItem) {
        await conn.commit();

        return {
          success: true,
          command: isOwner ? "playing" : "observe",
          item: currentItem,
          mission,
          isOwner,
        };
      }

      if (!isOwner) {
        await conn.commit();

        return {
          success: true,
          command: "none",
          item: null,
          mission,
          isOwner,
        };
      }

      const nextItem = await getNextPending(conn);

      if (!nextItem) {
        await conn.commit();

        return {
          success: true,
          command: "none",
          item: null,
          mission,
          isOwner,
        };
      }

      const lockedItem = await markPendingAsPlaying(conn, nextItem, clientId);
      const type = normalizeType(nextItem.type);
      const id = Number(nextItem.id);

      await conn.query(
        `
        UPDATE overlay_engine_state
        SET current_type = ?,
            current_id = ?,
            current_started_at = NOW(),
            current_key = ?,
            updated_at = NOW()
        WHERE id = 1
        `,
        [type, id, makeCurrentKey(type, id)]
      );

      await conn.commit();

      return {
        success: true,
        command: "play",
        item: lockedItem || nextItem,
        mission,
        isOwner,
      };
    } catch (error) {
      try {
        await conn.rollback();
      } catch {}

      console.error(error);

      return {
        success: false,
        command: "error",
        item: null,
        mission: null,
        isOwner: false,
        message: "오버레이 엔진 오류",
      };
    } finally {
      try {
        await conn.query("SELECT RELEASE_LOCK('wangchu_overlay_engine_core_lock')");
      } catch {}

      conn.release();
    }
  },

  async done(input: { id: number; type: OverlayType; clientId: string }) {
    const conn = await (db as any).getConnection();

    try {
      const id = Number(input.id || 0);
      const type = normalizeType(input.type);
      const clientId = String(input.clientId || "").trim();

      if (!id || !clientId) {
        return {
          success: false,
          ignored: true,
          message: "잘못된 완료 요청입니다.",
        };
      }

      const [lockRows]: any = await conn.query(
        "SELECT GET_LOCK('wangchu_overlay_engine_done_core_lock', 2) AS got_lock"
      );

      if (Number(lockRows[0]?.got_lock || 0) !== 1) {
        return {
          success: true,
          ignored: true,
          message: "다른 완료 처리가 진행 중입니다.",
        };
      }

      await conn.beginTransaction();

      await ensureEngineState(conn);

      const [stateRows]: any = await conn.query(`
        SELECT owner_client_id, current_type, current_id
        FROM overlay_engine_state
        WHERE id = 1
        LIMIT 1
        FOR UPDATE
      `);

      const state = stateRows[0] || {};
      const ownerClientId = state.owner_client_id || "";
      const currentType = state.current_type || "";
      const currentId = Number(state.current_id || 0);

      if (ownerClientId !== clientId) {
        await conn.commit();

        return {
          success: true,
          ignored: true,
          message: "대표 재생자가 아니므로 무시했습니다.",
        };
      }

      if (currentType !== type || currentId !== id) {
        await conn.commit();

        return {
          success: true,
          ignored: true,
          message: "현재 재생 항목이 아니므로 무시했습니다.",
        };
      }

      if (type === "mission") {
        await conn.query(
          `
          UPDATE mission_overlay_alerts
          SET status = 'done',
              played_at = NOW()
          WHERE id = ?
            AND status = 'playing'
          `,
          [id]
        );
      } else {
        await conn.query(
          `
          UPDATE item_use_alerts
          SET status = 'done',
              played_at = NOW()
          WHERE id = ?
            AND status = 'playing'
          `,
          [id]
        );
      }

      await conn.query(`
        UPDATE overlay_engine_state
        SET current_type = NULL,
            current_id = NULL,
            current_started_at = NULL,
            current_key = NULL,
            owner_seen_at = NOW(),
            updated_at = NOW()
        WHERE id = 1
      `);

      await conn.commit();

      return {
        success: true,
      };
    } catch (error) {
      try {
        await conn.rollback();
      } catch {}

      console.error(error);

      return {
        success: false,
        message: "완료 처리 중 오류가 발생했습니다.",
      };
    } finally {
      try {
        await conn.query(
          "SELECT RELEASE_LOCK('wangchu_overlay_engine_done_core_lock')"
        );
      } catch {}

      conn.release();
    }
  },

  async getAdminStatus() {
    try {
      const [stateRows]: any = await db.query(`
        SELECT current_type, current_id
        FROM overlay_engine_state
        WHERE id = 1
        LIMIT 1
      `);

      const state = stateRows[0] || {};
      let playing = null;

      if (state.current_type && state.current_id) {
        const conn = await (db as any).getConnection();

        try {
          playing = await getCurrentItem(
            conn,
            state.current_type,
            state.current_id
          );
        } finally {
          conn.release();
        }
      }

      const [itemWaiting]: any = await db.query(`
        SELECT
          id,
          'item' AS type,
          nickname,
          item_name AS title,
          message,
          overlay_text,
          status,
          created_at,
          played_at
        FROM item_use_alerts
        WHERE status = 'pending'
        ORDER BY created_at ASC, id ASC
        LIMIT 30
      `);

      const [missionWaiting]: any = await db.query(`
        SELECT
          id,
          'mission' AS type,
          nickname,
          mission_title AS title,
          '' AS message,
          NULL AS overlay_text,
          status,
          created_at,
          played_at
        FROM mission_overlay_alerts
        WHERE status = 'pending'
        ORDER BY created_at ASC, id ASC
        LIMIT 30
      `);

      const waiting = [...itemWaiting, ...missionWaiting].sort((a, b) => {
        const at = new Date(a.created_at || 0).getTime();
        const bt = new Date(b.created_at || 0).getTime();

        if (at !== bt) return at - bt;
        return Number(a.id) - Number(b.id);
      });

      const [itemLogs]: any = await db.query(`
        SELECT
          id,
          'item' AS type,
          nickname,
          item_name AS title,
          message,
          overlay_text,
          status,
          created_at,
          played_at
        FROM item_use_alerts
        WHERE status IN ('done', 'skipped')
        ORDER BY played_at DESC, id DESC
        LIMIT 20
      `);

      const [missionLogs]: any = await db.query(`
        SELECT
          id,
          'mission' AS type,
          nickname,
          mission_title AS title,
          '' AS message,
          NULL AS overlay_text,
          status,
          created_at,
          played_at
        FROM mission_overlay_alerts
        WHERE status IN ('done', 'skipped')
        ORDER BY played_at DESC, id DESC
        LIMIT 20
      `);

      const recentLogs = [...itemLogs, ...missionLogs]
        .sort((a, b) => {
          const at = new Date(a.played_at || a.created_at || 0).getTime();
          const bt = new Date(b.played_at || b.created_at || 0).getTime();

          if (at !== bt) return bt - at;
          return Number(b.id) - Number(a.id);
        })
        .slice(0, 20);

      return {
        success: true,
        playing,
        waiting,
        recentLogs,
      };
    } catch (error) {
      console.error(error);

      return {
        success: false,
        playing: null,
        waiting: [],
        recentLogs: [],
      };
    }
  },

  async control(input: {
    command: string;
    targetType?: string | null;
    targetId?: number | null;
  }) {
    const conn = await (db as any).getConnection();

    try {
      const command = String(input.command || "none");
      const targetType = input.targetType
        ? normalizeType(input.targetType)
        : null;
      const targetId = input.targetId ? Number(input.targetId) : null;

      if (!["refresh", "skip", "replay"].includes(command)) {
        return {
          success: false,
          message: "알 수 없는 명령입니다.",
        };
      }

      await conn.beginTransaction();
      await ensureControlRow(conn);

      if (command === "refresh") {
        await conn.query(`
          UPDATE overlay_queue_control
          SET command = 'refresh',
              target_type = NULL,
              target_id = NULL,
              updated_at = NOW()
          WHERE id = 1
        `);

        await conn.commit();

        return { success: true };
      }

      if (command === "skip") {
        await conn.query(`
          UPDATE overlay_queue_control
          SET command = 'skip',
              target_type = NULL,
              target_id = NULL,
              updated_at = NOW()
          WHERE id = 1
        `);

        await conn.commit();

        return { success: true };
      }

      if (command === "replay") {
        if (!targetType || !targetId) {
          await conn.rollback();

          return {
            success: false,
            message: "재생할 항목이 없습니다.",
          };
        }

        await conn.query(
          `
          UPDATE overlay_queue_control
          SET command = 'replay',
              target_type = ?,
              target_id = ?,
              updated_at = NOW()
          WHERE id = 1
          `,
          [targetType, targetId]
        );

        await conn.commit();

        return { success: true };
      }

      await conn.commit();

      return { success: true };
    } catch (error) {
      try {
        await conn.rollback();
      } catch {}

      console.error(error);

      return {
        success: false,
        message: "명령 처리 중 오류가 발생했습니다.",
      };
    } finally {
      conn.release();
    }
  },
};