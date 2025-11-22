"use client";
import { useMemo, useState } from "react";

type MetricRow = {
  platform: string; // e.g., TikTok, YouTube, Instagram
  postId: string;
  date: string; // ISO
  hour: number; // 0-23
  contentType: string; // short, long, image, carousel
  title: string;
  hashtags: string[];
  views: number;
  likes: number;
  comments: number;
  shares: number;
  watchTimeSec?: number;
};

function parseCSV(text: string): MetricRow[] {
  const lines = text.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return [];
  const header = lines[0].split(",").map((h) => h.trim().toLowerCase());
  const idx = (key: string) => header.indexOf(key.toLowerCase());
  return lines.slice(1).map((l) => {
    const cols = l.split(",");
    const hashtags = (cols[idx("hashtags")] || "").split(/[ #]+/).filter(Boolean);
    return {
      platform: cols[idx("platform")] || "",
      postId: cols[idx("postId")] || cols[idx("post_id")] || Math.random().toString(36).slice(2),
      date: cols[idx("date")] || new Date().toISOString(),
      hour: Number(cols[idx("hour")] || 0),
      contentType: cols[idx("contentType")] || cols[idx("content_type")] || "short",
      title: cols[idx("title")] || "",
      hashtags,
      views: Number(cols[idx("views")] || 0),
      likes: Number(cols[idx("likes")] || 0),
      comments: Number(cols[idx("comments")] || 0),
      shares: Number(cols[idx("shares")] || 0),
      watchTimeSec: Number(cols[idx("watchTimeSec")] || cols[idx("watch_time_sec")] || 0),
    } as MetricRow;
  });
}

function sampleData(): MetricRow[] {
  return [
    { platform: "TikTok", postId: "tt1", date: "2024-11-01", hour: 18, contentType: "short", title: "AI Tools", hashtags: ["ai","productivity"], views: 12000, likes: 1300, comments: 120, shares: 80, watchTimeSec: 19 },
    { platform: "TikTok", postId: "tt2", date: "2024-11-03", hour: 12, contentType: "short", title: "Editing Hack", hashtags: ["editing","capcut"], views: 6000, likes: 430, comments: 32, shares: 20, watchTimeSec: 12 },
    { platform: "YouTube", postId: "yt1", date: "2024-11-05", hour: 17, contentType: "long", title: "AI Workflow", hashtags: ["ai","workflow"], views: 4500, likes: 380, comments: 55, shares: 10, watchTimeSec: 720 },
    { platform: "Instagram", postId: "ig1", date: "2024-11-02", hour: 20, contentType: "image", title: "Setup", hashtags: ["desk","setup"], views: 5200, likes: 610, comments: 41, shares: 22 },
  ];
}

export default function Page() {
  const [raw, setRaw] = useState("");
  const [rows, setRows] = useState<MetricRow[]>(sampleData());
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const totals = useMemo(() => {
    const totalViews = rows.reduce((a, r) => a + r.views, 0);
    const totalLikes = rows.reduce((a, r) => a + r.likes, 0);
    const totalComments = rows.reduce((a, r) => a + r.comments, 0);
    const totalShares = rows.reduce((a, r) => a + r.shares, 0);
    return { totalViews, totalLikes, totalComments, totalShares };
  }, [rows]);

  async function analyze() {
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rows }),
      });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      console.error(e);
      setResult({ error: "Failed to analyze" });
    } finally {
      setLoading(false);
    }
  }

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    if (!f) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || "");
      const parsed = parseCSV(text);
      if (parsed.length) setRows(parsed);
    };
    reader.readAsText(f);
  }

  return (
    <div className="container">
      <div className="header">
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <div className="badge">Viralytics v1.0</div>
          <h2 style={{ margin: 0 }}>AI Growth Advisor</h2>
        </div>
        <button className="secondary" onClick={() => setRows(sampleData())}>Load Sample</button>
      </div>

      <div className="grid">
        <div className="panel">
          <h3>Upload or Paste Metrics</h3>
          <p className="muted">CSV headers: platform,postId,date,hour,contentType,title,hashtags,views,likes,comments,shares,watchTimeSec</p>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
            <input type="file" accept=".csv" onChange={onFile} />
            <button onClick={() => { const p = parseCSV(raw); if (p.length) setRows(p); }}>Parse Pasted CSV</button>
            <button onClick={analyze} disabled={loading}>{loading ? "Analyzing?" : "Analyze"}</button>
          </div>
          <textarea rows={6} placeholder="Paste CSV here" value={raw} onChange={(e) => setRaw(e.target.value)} style={{ marginTop: 12 }} />
        </div>
        <div className="panel">
          <h3>KPIs</h3>
          <div className="kpi">
            <div className="card"><div>Total Views</div><div style={{ fontSize: 22, fontWeight: 700 }}>{totals.totalViews.toLocaleString()}</div></div>
            <div className="card"><div>Total Likes</div><div style={{ fontSize: 22, fontWeight: 700 }}>{totals.totalLikes.toLocaleString()}</div></div>
            <div className="card"><div>Comments</div><div style={{ fontSize: 22, fontWeight: 700 }}>{totals.totalComments.toLocaleString()}</div></div>
            <div className="card"><div>Shares</div><div style={{ fontSize: 22, fontWeight: 700 }}>{totals.totalShares.toLocaleString()}</div></div>
          </div>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 16 }}>
        <h3>Recent Posts</h3>
        <table className="table">
          <thead>
            <tr>
              <th>Platform</th>
              <th>Title</th>
              <th>Type</th>
              <th>Hour</th>
              <th>Views</th>
              <th>Likes</th>
              <th>Comments</th>
              <th>Shares</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.postId}>
                <td>{r.platform}</td>
                <td style={{ maxWidth: 260, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.title}</td>
                <td>{r.contentType}</td>
                <td>{r.hour}</td>
                <td>{r.views.toLocaleString()}</td>
                <td>{r.likes.toLocaleString()}</td>
                <td>{r.comments.toLocaleString()}</td>
                <td>{r.shares.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result && (
        <div className="grid" style={{ marginTop: 16 }}>
          <div className="panel">
            <h3>Strategy</h3>
            {result.error && <div style={{ color: "tomato" }}>{result.error}</div>}
            {!result.error && (
              <>
                <h4>Action Plan (Next 7 Days)</h4>
                <ul className="actions">
                  {result?.actions?.map((a: string, i: number) => (
                    <li key={i}>? {a}</li>
                  ))}
                </ul>
                <h4 style={{ marginTop: 12 }}>Best Post Times</h4>
                <div>{result?.bestHours?.map((h: number) => `${h}:00`).join(", ")}</div>
                <h4 style={{ marginTop: 12 }}>High-Performing Hashtags</h4>
                <div>{result?.topHashtags?.slice(0, 10).map((h: string) => `#${h}`).join("  ")}</div>
              </>
            )}
          </div>
          <div className="panel">
            <h3>Diagnostics</h3>
            <pre style={{ whiteSpace: "pre-wrap" }}>{JSON.stringify(result?.diagnostics || {}, null, 2)}</pre>
          </div>
        </div>
      )}

      <div className="footer">? 2024 Viralytics. All rights reserved.</div>
    </div>
  );
}
