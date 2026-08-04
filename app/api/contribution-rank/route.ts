import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [settingRows]: any = await db.query(
    "SELECT title FROM contribution_rank_settings WHERE id = 1 LIMIT 1"
  );

  const [categoryRows]: any = await db.query(
    `SELECT id, name, is_calculated, display_order
     FROM contribution_rank_categories
     ORDER BY display_order ASC, id ASC`
  );

  const [participantRows]: any = await db.query(
    `SELECT id, rank_name, streamer_name, manual_contribution, display_order
     FROM contribution_rank_participants
     WHERE is_active = 1
     ORDER BY display_order ASC, id ASC`
  );

  const [amountRows]: any = await db.query(
    `SELECT participant_id, category_id, amount
     FROM contribution_rank_amounts`
  );

  const amountMap = new Map<string, number>();
  for (const row of amountRows) {
    amountMap.set(
      `${Number(row.participant_id)}:${Number(row.category_id)}`,
      Number(row.amount || 0)
    );
  }

  const categories = categoryRows.map((row: any) => ({
    id: Number(row.id),
    name: String(row.name),
    isCalculated: Number(row.is_calculated) === 1,
    displayOrder: Number(row.display_order || 0),
  }));

  const participants = participantRows.map((row: any) => {
    const amounts: Record<string, number> = {};
    let calculatedAmount = 0;

    for (const category of categories) {
      const amount = amountMap.get(`${Number(row.id)}:${category.id}`) || 0;
      amounts[String(category.id)] = amount;
      if (category.isCalculated) calculatedAmount += amount;
    }

    const manualContribution = Number(row.manual_contribution || 0);
    const contribution = Math.floor(calculatedAmount / 10000) + manualContribution;

    return {
      id: Number(row.id),
      rankName: String(row.rank_name || ""),
      streamerName: String(row.streamer_name || ""),
      manualContribution,
      contribution,
      calculatedAmount,
      amounts,
      displayOrder: Number(row.display_order || 0),
    };
  });

  participants.sort((a: any, b: any) => {
    if (b.contribution !== a.contribution) return b.contribution - a.contribution;
    if (b.calculatedAmount !== a.calculatedAmount) return b.calculatedAmount - a.calculatedAmount;
    return a.displayOrder - b.displayOrder;
  });

  return NextResponse.json(
    {
      title: settingRows[0]?.title || "기여도 순위",
      categories,
      participants,
      updatedAt: Date.now(),
    },
    {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    }
  );
}
