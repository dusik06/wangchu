import { NextResponse } from "next/server";
import db from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  const [settingRows]: any = await db.query(
    "SELECT title, show_title, title_font_size, header_font_size, body_font_size, row_height, scale_percent, border_width, border_radius, show_shadow, title_align, column_gap, use_commas, first_color, second_color, third_color FROM contribution_rank_settings WHERE id = 1 LIMIT 1"
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
      showTitle: Number(settingRows[0]?.show_title ?? 1) === 1,
      display: {
        titleFontSize: Number(settingRows[0]?.title_font_size || 24),
        headerFontSize: Number(settingRows[0]?.header_font_size || 13),
        bodyFontSize: Number(settingRows[0]?.body_font_size || 15),
        rowHeight: Number(settingRows[0]?.row_height || 42),
        scalePercent: Number(settingRows[0]?.scale_percent || 100),
        borderWidth: Number(settingRows[0]?.border_width || 5),
        borderRadius: Number(settingRows[0]?.border_radius || 18),
        showShadow: Number(settingRows[0]?.show_shadow ?? 1) === 1,
        titleAlign: String(settingRows[0]?.title_align || "center"),
        columnGap: Number(settingRows[0]?.column_gap || 0),
        useCommas: Number(settingRows[0]?.use_commas ?? 1) === 1,
        firstColor: String(settingRows[0]?.first_color || "#ef3340"),
        secondColor: String(settingRows[0]?.second_color || "#00b94f"),
        thirdColor: String(settingRows[0]?.third_color || "#1769e8"),
      },
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
