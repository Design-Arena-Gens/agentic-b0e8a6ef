import { NextResponse } from "next/server";

type MetricRow = {
  platform: string;
  postId: string;
  date: string;
  hour: number;
  contentType: string;
  title: string;
  hashtags: string[];
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTimeSec?: number;
};

type AnalyzeBody = { rows: MetricRow[] };

function safeRate(num: number, den: number): number {
  return den > 0 ? Number((num / den).toFixed(4)) : 0;
}

function topN<T>(entries: [T, number][], n: number): T[] {
  return entries.sort((a, b) => b[1] - a[1]).slice(0, n).map(([k]) => k);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as AnalyzeBody;
    const rows = (body?.rows || []).filter((r) => r && typeof r.views === "number");
    if (!rows.length) return NextResponse.json({ error: "No data provided" }, { status: 400 });

    const byHour = new Map<number, { views: number; posts: number }>();
    const byType = new Map<string, { views: number; posts: number; likes: number; comments: number; shares: number }>();
    const hashtagStats = new Map<string, { views: number; uses: number }>();

    for (const r of rows) {
      const hour = Math.max(0, Math.min(23, Number(r.hour || 0)));
      const hAgg = byHour.get(hour) || { views: 0, posts: 0 };
      hAgg.views += r.views;
      hAgg.posts += 1;
      byHour.set(hour, hAgg);

      const tAgg = byType.get(r.contentType || "unknown") || { views: 0, posts: 0, likes: 0, comments: 0, shares: 0 };
      tAgg.views += r.views;
      tAgg.likes += r.likes;
      tAgg.comments += r.comments;
      tAgg.shares += r.shares;
      tAgg.posts += 1;
      byType.set(r.contentType || "unknown", tAgg);

      for (const h of r.hashtags || []) {
        const key = (h || "").replace(/[#\s]+/g, "").toLowerCase();
        if (!key) continue;
        const stat = hashtagStats.get(key) || { views: 0, uses: 0 };
        stat.views += r.views;
        stat.uses += 1;
        hashtagStats.set(key, stat);
      }
    }

    const bestHours = topN(Array.from(byHour.entries()).map(([h, v]) => [h, safeRate(v.views, v.posts)] as [number, number]), 3) as number[];

    const typeScores = Array.from(byType.entries()).map(([type, v]) => {
      const engagement = v.likes + v.comments * 2 + v.shares * 3;
      const engagementRate = safeRate(engagement, v.views || v.posts);
      const viewPerPost = safeRate(v.views, v.posts);
      const score = viewPerPost * 0.7 + engagementRate * 0.3;
      return { type, score: Number(score.toFixed(6)), viewPerPost, engagementRate };
    }).sort((a, b) => b.score - a.score);

    const topHashtags = topN(Array.from(hashtagStats.entries()).map(([k, v]) => [k, safeRate(v.views, v.uses)] as [string, number]), 15);

    const actions: string[] = [];
    if (typeScores[0]) actions.push(`Double down on ${typeScores[0].type} content (top format).`);
    if (bestHours.length) actions.push(`Post at ${bestHours.map((h) => `${h}:00`).join(", ")} local time.`);
    if (topHashtags.length) actions.push(`Use 1-3 of: ${topHashtags.slice(0, 5).map((h) => `#${h}`).join(" ")}.`);

    const lowTypes = typeScores.slice(-1);
    if (lowTypes[0]) actions.push(`De-prioritize ${lowTypes[0].type} until performance improves.`);

    const plannedCadence = Math.min(14, Math.max(5, Math.round(rows.length * 0.6)));
    actions.push(`Publish ~${plannedCadence} posts next 7 days with 70/20/10: top/experimental/brand.`);

    const diagnostics = {
      byHour: Object.fromEntries(byHour),
      byType: Object.fromEntries(byType),
      typeScores,
      hashtagLeaders: Array.from(hashtagStats.entries()).sort((a,b)=>b[1].views-a[1].views).slice(0, 20),
    };

    return NextResponse.json({ bestHours, topHashtags, actions, diagnostics });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
