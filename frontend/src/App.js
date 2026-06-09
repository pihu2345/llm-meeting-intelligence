/*import { useState, useEffect, useCallback } from "react";

const API = "http://localhost:8000";

const C = {
  bg: "#0B0F1A", surface: "#121929", card: "#1A2236", border: "#1E2D47",
  accent: "#3B82F6", accentDim: "#1E3A5F", green: "#10B981", red: "#EF4444",
  yellow: "#F59E0B", orange: "#F97316", text: "#E2E8F0", muted: "#64748B", highlight: "#93C5FD",
};

const sev = {
  critical: C.red, high: C.orange, medium: C.yellow, low: C.green,
  open: C.red, active: C.orange, pending: C.yellow, completed: C.green,
  resolved: C.green, "at_risk": C.orange,
};

function Badge({ label, color }) {
  return (
    <span style={{
      background: color + "22", color, border: `1px solid ${color}44`,
      borderRadius: 4, padding: "2px 8px", fontSize: 11, fontWeight: 600,
      textTransform: "uppercase", letterSpacing: 1,
    }}>{label}</span>
  );
}

function Card({ children, style }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`,
      borderRadius: 12, padding: 20, ...style,
    }}>{children}</div>
  );
}

function Stat({ label, value, color, sub }) {
  return (
    <div style={{
      background: C.card, border: `1px solid ${C.border}`, borderRadius: 12,
      padding: "20px 24px", display: "flex", flexDirection: "column", gap: 4,
    }}>
      <div style={{ color: C.muted, fontSize: 12, fontWeight: 600, textTransform: "uppercase", letterSpacing: 1 }}>{label}</div>
      <div style={{ color: color || C.text, fontSize: 36, fontWeight: 800, lineHeight: 1 }}>{value}</div>
      {sub && <div style={{ color: C.muted, fontSize: 12 }}>{sub}</div>}
    </div>
  );
}

function PriorityDot({ priority }) {
  const colors = { high: C.red, medium: C.yellow, low: C.green };
  return <span style={{ width: 8, height: 8, borderRadius: "50%", background: colors[priority] || C.muted, display: "inline-block", marginRight: 6 }} />;
}

function IngestPanel({ onIngested }) {
  const [content, setContent] = useState("");
  const [title, setTitle] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loadingExample, setLoadingExample] = useState(false);

  async function submit() {
    if (!content.trim()) return;
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`${API}/api/meetings/ingest`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: title || "Untitled Meeting", content }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setResult(data);
      setContent(""); setTitle("");
      onIngested?.();
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function loadExamples() {
    setLoadingExample(true);
    try {
      await fetch(`${API}/api/meetings/example/load`);
      onIngested?.();
    } catch (e) {}
    setLoadingExample(false);
  }

  async function uploadFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true); setError(null);
    const fd = new FormData();
    fd.append("file", file);
    try {
      const res = await fetch(`${API}/api/meetings/ingest/file`, { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail);
      setResult(data);
      onIngested?.();
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <h2 style={{ color: C.text, margin: 0, flex: 1 }}>Ingest Meeting</h2>
        <button onClick={loadExamples} disabled={loadingExample} style={btnStyle(C.accentDim, C.highlight)}>
          {loadingExample ? "Loading..." : "Load 3 Example Meetings"}
        </button>
        <label style={{ ...btnStyle("#1E2D47", C.muted), cursor: "pointer" }}>
          Upload .txt / .md
          <input type="file" accept=".txt,.md" onChange={uploadFile} style={{ display: "none" }} />
        </label>
      </div>

      <input
        placeholder="Meeting title (optional)"
        value={title} onChange={e => setTitle(e.target.value)}
        style={inputStyle}
      />
      <textarea
        placeholder="Paste raw meeting transcript, summary, or discussion notes here..."
        value={content} onChange={e => setContent(e.target.value)}
        rows={10} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit" }}
      />
      <button onClick={submit} disabled={loading || !content.trim()} style={btnStyle(C.accent, "#fff")}>
        {loading ? "⏳ Extracting Intelligence..." : "⚡ Extract Intelligence"}
      </button>

      {error && <div style={{ color: C.red, background: C.red + "11", borderRadius: 8, padding: 12, border: `1px solid ${C.red}33` }}>Error: {error}</div>}

      {result && (
        <Card style={{ borderColor: C.green + "44" }}>
          <div style={{ color: C.green, fontWeight: 700, marginBottom: 12 }}>✓ Intelligence Extracted — {result.title}</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 12 }}>
            {Object.entries(result.counts).map(([k, v]) => (
              <div key={k} style={{ textAlign: "center" }}>
                <div style={{ color: C.accent, fontSize: 24, fontWeight: 800 }}>{v}</div>
                <div style={{ color: C.muted, fontSize: 11 }}>{k.replace("_", " ")}</div>
              </div>
            ))}
          </div>
          {result.extracted?.summary && (
            <div style={{ color: C.text, marginTop: 12, paddingTop: 12, borderTop: `1px solid ${C.border}`, fontSize: 14, lineHeight: 1.6 }}>
              <span style={{ color: C.muted }}>Summary: </span>{result.extracted.summary}
            </div>
          )}
        </Card>
      )}
    </div>
  );
}

function Dashboard({ refresh }) {
  const [data, setData] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/dashboard`).then(r => r.json()).then(setData).catch(() => {});
  }, [refresh]);

  if (!data) return <div style={{ color: C.muted, padding: 40, textAlign: "center" }}>Loading dashboard...</div>;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
        <Stat label="Total Meetings" value={data.total_meetings} color={C.accent} />
        <Stat label="Open Escalations" value={data.open_escalations} color={data.open_escalations > 0 ? C.red : C.green} />
        <Stat label="Active Blockers" value={data.active_blockers} color={data.active_blockers > 0 ? C.orange : C.green} />
        <Stat label="Pending Actions" value={data.pending_actions} color={C.yellow} />
        <Stat label="High Priority" value={data.high_priority_actions} color={C.red} sub="pending action items" />
        <Stat label="At-Risk Projects" value={data.at_risk_projects} color={data.at_risk_projects > 0 ? C.orange : C.green} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Card>
          <h3 style={{ color: C.text, margin: "0 0 16px 0", fontSize: 14, fontWeight: 700 }}>🚨 Recent Escalations</h3>
          {data.recent_escalations.length === 0
            ? <div style={{ color: C.muted, fontSize: 13 }}>No open escalations</div>
            : data.recent_escalations.map(e => (
              <div key={e.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ color: C.text, fontSize: 13, marginBottom: 4 }}>{e.description}</div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <Badge label={e.severity} color={sev[e.severity] || C.muted} />
                  {e.raised_by && <span style={{ color: C.muted, fontSize: 11 }}>by {e.raised_by}</span>}
                </div>
              </div>
            ))
          }
        </Card>

        <Card>
          <h3 style={{ color: C.text, margin: "0 0 16px 0", fontSize: 14, fontWeight: 700 }}>🔴 Active Blockers</h3>
          {data.recent_blockers.length === 0
            ? <div style={{ color: C.muted, fontSize: 13 }}>No active blockers</div>
            : data.recent_blockers.map(b => (
              <div key={b.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}` }}>
                <div style={{ color: C.text, fontSize: 13, marginBottom: 4 }}>{b.description}</div>
                {b.affected_project && <span style={{ color: C.muted, fontSize: 11 }}>→ {b.affected_project}</span>}
              </div>
            ))
          }
        </Card>
      </div>

      <Card>
        <h3 style={{ color: C.text, margin: "0 0 16px 0", fontSize: 14, fontWeight: 700 }}>⚡ Pending Action Items</h3>
        {data.pending_action_items.length === 0
          ? <div style={{ color: C.muted, fontSize: 13 }}>No pending actions</div>
          : <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
              <thead>
                <tr style={{ color: C.muted }}>
                  {["Priority", "Task", "Owner", "Deadline"].map(h => (
                    <th key={h} style={{ textAlign: "left", padding: "6px 8px", fontWeight: 600, fontSize: 11, textTransform: "uppercase", letterSpacing: 1 }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.pending_action_items.map(a => (
                  <tr key={a.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: "8px" }}><PriorityDot priority={a.priority} /><Badge label={a.priority} color={sev[a.priority] || C.muted} /></td>
                    <td style={{ padding: "8px", color: C.text }}>{a.description}</td>
                    <td style={{ padding: "8px", color: C.highlight }}>{a.owner || "—"}</td>
                    <td style={{ padding: "8px", color: C.muted }}>{a.deadline || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </Card>

      <Card>
        <h3 style={{ color: C.text, margin: "0 0 12px 0", fontSize: 14, fontWeight: 700 }}>📅 Recent Meetings</h3>
        {data.recent_meetings.map(m => (
          <div key={m.id} style={{ padding: "10px 0", borderBottom: `1px solid ${C.border}`, display: "flex", justifyContent: "space-between" }}>
            <span style={{ color: C.text, fontSize: 13 }}>{m.title}</span>
            <span style={{ color: C.muted, fontSize: 12 }}>{new Date(m.created_at).toLocaleString()}</span>
          </div>
        ))}
      </Card>
    </div>
  );
}

function MeetingsList({ refresh }) {
  const [meetings, setMeetings] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/meetings`).then(r => r.json()).then(setMeetings).catch(() => {});
  }, [refresh]);

  async function loadDetail(id) {
    setSelected(id);
    const data = await fetch(`${API}/api/meetings/${id}`).then(r => r.json());
    setDetail(data);
  }

  if (selected && detail) {
    return (
      <div>
        <button onClick={() => { setSelected(null); setDetail(null); }} style={{ ...btnStyle("#1E2D47", C.muted), marginBottom: 16 }}>
          ← Back to Meetings
        </button>
        <h2 style={{ color: C.text, marginBottom: 20 }}>{detail.title}</h2>

        {[
          ["🎯 Projects", detail.projects, p => <div key={p.id} style={{ marginBottom: 12 }}><div style={{ color: C.text, fontWeight: 600 }}>{p.name}</div><div style={{ color: C.muted, fontSize: 13 }}>{p.description}</div><Badge label={p.status} color={sev[p.status] || C.muted} /></div>],
          ["⚡ Action Items", detail.action_items, a => <div key={a.id} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: `1px solid ${C.border}` }}><div style={{ color: C.text }}>{a.description}</div><div style={{ display: "flex", gap: 8, marginTop: 6 }}><Badge label={a.priority} color={sev[a.priority] || C.muted} />{a.owner && <span style={{ color: C.highlight, fontSize: 12 }}>👤 {a.owner}</span>}{a.deadline && <span style={{ color: C.muted, fontSize: 12 }}>📅 {a.deadline}</span>}</div></div>],
          ["🚨 Escalations", detail.escalations, e => <div key={e.id} style={{ marginBottom: 12 }}><div style={{ color: C.text }}>{e.description}</div><div style={{ display: "flex", gap: 8, marginTop: 6 }}><Badge label={e.severity} color={sev[e.severity] || C.muted} />{e.raised_by && <span style={{ color: C.muted, fontSize: 12 }}>by {e.raised_by}</span>}</div></div>],
          ["⚠️ Risks", detail.risks, r => <div key={r.id} style={{ marginBottom: 12 }}><div style={{ color: C.text }}>{r.description}</div>{r.mitigation && <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Mitigation: {r.mitigation}</div>}</div>],
          ["🔴 Blockers", detail.blockers, b => <div key={b.id} style={{ marginBottom: 12 }}><div style={{ color: C.text }}>{b.description}</div>{b.affected_project && <div style={{ color: C.muted, fontSize: 12 }}>→ {b.affected_project}</div>}</div>],
          ["✅ Decisions", detail.decisions, d => <div key={d.id} style={{ marginBottom: 12 }}><div style={{ color: C.text }}>{d.description}</div>{d.rationale && <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>Rationale: {d.rationale}</div>}</div>],
          ["👥 Stakeholders", detail.stakeholders, s => <div key={s.id} style={{ display: "inline-flex", gap: 6, marginRight: 8, marginBottom: 8, background: C.accentDim, borderRadius: 6, padding: "4px 10px" }}><span style={{ color: C.highlight }}>{s.name}</span>{s.team && <span style={{ color: C.muted, fontSize: 12 }}>({s.team})</span>}</div>],
        ].map(([label, items, render]) => items?.length > 0 && (
          <Card key={label} style={{ marginBottom: 16 }}>
            <h3 style={{ color: C.text, margin: "0 0 16px 0", fontSize: 14 }}>{label}</h3>
            {items.map(render)}
          </Card>
        ))}

        <Card>
          <h3 style={{ color: C.text, margin: "0 0 8px 0", fontSize: 14 }}>📝 Raw Content</h3>
          <pre style={{ color: C.muted, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", margin: 0 }}>{detail.raw_content}</pre>
        </Card>
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: C.text, marginBottom: 20 }}>All Meetings ({meetings.length})</h2>
      {meetings.length === 0
        ? <div style={{ color: C.muted, textAlign: "center", padding: 40 }}>No meetings ingested yet. Go to Ingest to add meetings.</div>
        : meetings.map(m => (
          <div key={m.id} onClick={() => loadDetail(m.id)} style={{
            background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: "16px 20px",
            marginBottom: 10, cursor: "pointer", display: "flex", justifyContent: "space-between",
          }}
            onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
            onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
          >
            <span style={{ color: C.text, fontWeight: 600 }}>{m.title}</span>
            <span style={{ color: C.muted, fontSize: 12 }}>{new Date(m.created_at).toLocaleString()}</span>
          </div>
        ))
      }
    </div>
  );
}

function EscalationsView({ refresh }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");

  const load = useCallback(() => {
    const url = filter === "all" ? `${API}/api/escalations` : `${API}/api/escalations?status=${filter}`;
    fetch(url).then(r => r.json()).then(setItems).catch(() => {});
  }, [filter, refresh]);

  useEffect(() => { load(); }, [load]);

  async function resolve(id) {
    await fetch(`${API}/api/escalations/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "resolved" }),
    });
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: C.text, margin: 0 }}>Escalations ({items.length})</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "open", "resolved"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={btnStyle(filter === f ? C.accent : "#1E2D47", filter === f ? "#fff" : C.muted)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>
      {items.map(e => (
        <Card key={e.id} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontWeight: 600, marginBottom: 8 }}>{e.description}</div>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <Badge label={e.severity} color={sev[e.severity] || C.muted} />
                <Badge label={e.status} color={sev[e.status] || C.muted} />
                {e.raised_by && <span style={{ color: C.muted, fontSize: 12 }}>Raised by: <span style={{ color: C.highlight }}>{e.raised_by}</span></span>}
                {e.meeting_title && <span style={{ color: C.muted, fontSize: 12 }}>Meeting: {e.meeting_title}</span>}
              </div>
            </div>
            {e.status === "open" && (
              <button onClick={() => resolve(e.id)} style={{ ...btnStyle(C.green + "33", C.green), marginLeft: 12, whiteSpace: "nowrap" }}>
                Resolve
              </button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

function ActionItemsView({ refresh }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("pending");

  const load = useCallback(() => {
    const url = filter === "all" ? `${API}/api/action-items` : `${API}/api/action-items?status=${filter}`;
    fetch(url).then(r => r.json()).then(setItems).catch(() => {});
  }, [filter, refresh]);

  useEffect(() => { load(); }, [load]);

  async function complete(id) {
    await fetch(`${API}/api/action-items/${id}/status`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });
    load();
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <h2 style={{ color: C.text, margin: 0 }}>Action Items ({items.length})</h2>
        <div style={{ display: "flex", gap: 8 }}>
          {["all", "pending", "completed"].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={btnStyle(filter === f ? C.accent : "#1E2D47", filter === f ? "#fff" : C.muted)}>
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ color: C.muted }}>
            {["Priority", "Task", "Owner", "Deadline", "Meeting", "Status", ""].map(h => (
              <th key={h} style={{ textAlign: "left", padding: "8px 12px", fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, borderBottom: `1px solid ${C.border}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {items.map(a => (
            <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}
              onMouseEnter={e => e.currentTarget.style.background = C.card + "88"}
              onMouseLeave={e => e.currentTarget.style.background = ""}
            >
              <td style={{ padding: "10px 12px" }}><Badge label={a.priority} color={sev[a.priority] || C.muted} /></td>
              <td style={{ padding: "10px 12px", color: C.text, maxWidth: 260 }}>{a.description}</td>
              <td style={{ padding: "10px 12px", color: C.highlight, fontSize: 13 }}>{a.owner || "—"}</td>
              <td style={{ padding: "10px 12px", color: C.muted, fontSize: 13 }}>{a.deadline || "—"}</td>
              <td style={{ padding: "10px 12px", color: C.muted, fontSize: 12 }}>{a.meeting_title}</td>
              <td style={{ padding: "10px 12px" }}><Badge label={a.status} color={sev[a.status] || C.muted} /></td>
              <td style={{ padding: "10px 12px" }}>
                {a.status === "pending" && (
                  <button onClick={() => complete(a.id)} style={{ ...btnStyle(C.green + "22", C.green), padding: "4px 10px", fontSize: 11 }}>Done</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function QueryPanel() {
  const [question, setQuestion] = useState("");
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const examples = [
    "What are the current unresolved escalations?",
    "Which projects are at risk?",
    "Show all pending tasks assigned to Rahul",
    "List all high-priority blockers",
    "Who are the stakeholders mentioned across meetings?",
    "What decisions were made in recent meetings?",
  ];

  async function ask() {
    if (!question.trim()) return;
    setLoading(true);
    const q = question;
    setQuestion("");
    const res = await fetch(`${API}/api/query`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question: q }),
    }).then(r => r.json()).catch(e => ({ error: e.message }));

    setHistory(h => [{ question: q, answer: res.answer || res.error, ts: new Date() }, ...h]);
    setLoading(false);
  }

  return (
    <div>
      <h2 style={{ color: C.text, marginBottom: 4 }}>Natural Language Query</h2>
      <p style={{ color: C.muted, marginTop: 0, marginBottom: 20, fontSize: 14 }}>Ask anything about your organization's meetings, tasks, risks, and escalations.</p>

      <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
        <input
          value={question} onChange={e => setQuestion(e.target.value)}
          onKeyDown={e => e.key === "Enter" && ask()}
          placeholder="Ask a question about your meetings..."
          style={{ ...inputStyle, flex: 1 }}
        />
        <button onClick={ask} disabled={loading || !question.trim()} style={btnStyle(C.accent, "#fff")}>
          {loading ? "..." : "Ask"}
        </button>
      </div>

      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 24 }}>
        {examples.map(ex => (
          <button key={ex} onClick={() => setQuestion(ex)} style={{ ...btnStyle("#1E2D47", C.muted), fontSize: 12 }}>{ex}</button>
        ))}
      </div>

      {history.map((h, i) => (
        <Card key={i} style={{ marginBottom: 16 }}>
          <div style={{ color: C.highlight, fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Q: {h.question}</div>
          <div style={{ color: C.text, fontSize: 14, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{h.answer}</div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>{h.ts.toLocaleTimeString()}</div>
        </Card>
      ))}
    </div>
  );
}

function RisksView({ refresh }) {
  const [risks, setRisks] = useState([]);
  useEffect(() => {
    fetch(`${API}/api/risks`).then(r => r.json()).then(setRisks).catch(() => {});
  }, [refresh]);

  return (
    <div>
      <h2 style={{ color: C.text, marginBottom: 20 }}>Risk Register ({risks.length})</h2>
      {risks.map(r => (
        <Card key={r.id} style={{ marginBottom: 12 }}>
          <div style={{ color: C.text, fontWeight: 600, marginBottom: 8 }}>{r.description}</div>
          <div style={{ display: "flex", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
            <span style={{ color: C.muted, fontSize: 12 }}>Impact: <Badge label={r.impact} color={sev[r.impact] || C.muted} /></span>
            <span style={{ color: C.muted, fontSize: 12 }}>Likelihood: <Badge label={r.likelihood} color={sev[r.likelihood] || C.muted} /></span>
            {r.meeting_title && <span style={{ color: C.muted, fontSize: 12 }}>Source: {r.meeting_title}</span>}
          </div>
          {r.mitigation && <div style={{ color: C.muted, fontSize: 13, background: "#0B0F1A", padding: "8px 12px", borderRadius: 6, marginTop: 6 }}>🛡 Mitigation: {r.mitigation}</div>}
        </Card>
      ))}
    </div>
  );
}

const inputStyle = {
  background: C.card, border: `1px solid ${C.border}`, borderRadius: 8,
  padding: "10px 14px", color: C.text, fontSize: 14, outline: "none", width: "100%", boxSizing: "border-box",
};

function btnStyle(bg, color) {
  return {
    background: bg, color, border: `1px solid ${color}33`, borderRadius: 8,
    padding: "8px 16px", cursor: "pointer", fontSize: 13, fontWeight: 600,
  };
}

const TABS = [
  { id: "dashboard", label: "📊 Dashboard" },
  { id: "ingest", label: "⚡ Ingest" },
  { id: "meetings", label: "📅 Meetings" },
  { id: "escalations", label: "🚨 Escalations" },
  { id: "actions", label: "✅ Action Items" },
  { id: "risks", label: "⚠️ Risks" },
  { id: "query", label: "🔍 Query" },
];

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [refresh, setRefresh] = useState(0);
  const [apiStatus, setApiStatus] = useState("checking");

  useEffect(() => {
    fetch(`${API}/`).then(r => {
      setApiStatus(r.ok ? "ok" : "error");
    }).catch(() => setApiStatus("error"));
  }, []);

  const onIngested = () => setRefresh(r => r + 1);

  const renderPanel = () => {
    if (apiStatus === "error") {
      return (
        <Card style={{ borderColor: C.red + "44", textAlign: "center", padding: 40 }}>
          <div style={{ fontSize: 48, marginBottom: 16 }}>⚠️</div>
          <div style={{ color: C.red, fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Backend Not Connected</div>
          <div style={{ color: C.muted, fontSize: 14, lineHeight: 1.6 }}>
            Start the FastAPI backend with:<br />
            <code style={{ color: C.highlight, background: "#0B0F1A", padding: "4px 8px", borderRadius: 4 }}>
              cd backend && uvicorn main:app --reload
            </code>
          </div>
        </Card>
      );
    }
    switch (tab) {
      case "dashboard": return <Dashboard refresh={refresh} />;
      case "ingest": return <IngestPanel onIngested={onIngested} />;
      case "meetings": return <MeetingsList refresh={refresh} />;
      case "escalations": return <EscalationsView refresh={refresh} />;
      case "actions": return <ActionItemsView refresh={refresh} />;
      case "risks": return <RisksView refresh={refresh} />;
      case "query": return <QueryPanel />;
      default: return null;
    }
  };

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Inter', system-ui, sans-serif", color: C.text }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: "0 24px" }}>
        <div style={{ maxWidth: 1200, margin: "0 auto", display: "flex", alignItems: "center", height: 60 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginRight: 40 }}>
            <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${C.accent}, #7C3AED)`, borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }}>🧠</div>
            <div>
              <div style={{ color: C.text, fontWeight: 800, fontSize: 15, lineHeight: 1 }}>MeetingIQ</div>
              <div style={{ color: C.muted, fontSize: 10, letterSpacing: 1 }}>INTELLIGENCE SYSTEM</div>
            </div>
          </div>
          <nav style={{ display: "flex", gap: 2 }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? C.accentDim : "transparent",
                color: tab === t.id ? C.highlight : C.muted,
                border: "none", borderRadius: 8, padding: "8px 14px",
                cursor: "pointer", fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
              }}>{t.label}</button>
            ))}
          </nav>
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: apiStatus === "ok" ? C.green : apiStatus === "error" ? C.red : C.yellow,
            }} />
            <span style={{ color: C.muted, fontSize: 12 }}>
              {apiStatus === "ok" ? "Connected" : apiStatus === "error" ? "Offline" : "Connecting..."}
            </span>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {renderPanel()}
      </div>
    </div>
  );
}*/

import React, { useState, useEffect, useRef, useCallback } from 'react';

const API = 'http://localhost:8000';

const C = {
  bg: '#0B0F1A', surface: '#121929', card: '#1A2236', border: '#1E2D47',
  accent: '#3B82F6', accentDim: '#1E3A5F', green: '#10B981', red: '#EF4444',
  yellow: '#F59E0B', orange: '#F97316', text: '#E2E8F0', muted: '#64748B', highlight: '#93C5FD',
};

const sentimentColor = { positive: C.green, neutral: C.muted, negative: C.red, urgent: C.orange };
const urgencyColor = { low: C.green, medium: C.yellow, high: C.orange, critical: C.red };
const sevColor = { critical: C.red, high: C.orange, medium: C.yellow, low: C.green, open: C.red, pending: C.yellow, completed: C.green, resolved: C.green, active: C.orange };

function Badge({ label, color }) {
  return <span style={{ background: color + '22', color, border: `1px solid ${color}44`, borderRadius: 4, padding: '2px 8px', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>{label}</span>;
}
function Card({ children, style }) {
  return <div style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: 20, ...style }}>{children}</div>;
}
function Loader() {
  return <div style={{ color: C.muted, padding: 40, textAlign: 'center' }}>Loading...</div>;
}
function btn(bg, color, extra) {
  return { background: bg, color, border: `1px solid ${color}33`, borderRadius: 8, padding: '9px 18px', cursor: 'pointer', fontSize: 13, fontWeight: 600, ...extra };
}
const inputStyle = { background: C.card, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 14, outline: 'none', width: '100%', boxSizing: 'border-box' };

const TABS = [
  { id: 'dashboard', label: '📊 Dashboard' },
  { id: 'ingest',    label: '⚡ Ingest' },
  { id: 'meetings',  label: '📅 Meetings' },
  { id: 'escalations', label: '🚨 Escalations' },
  { id: 'actions',   label: '✅ Action Items' },
  { id: 'risks',     label: '⚠️ Risks' },
  { id: 'sentiment', label: '🎭 Sentiment' },
  { id: 'query',     label: '🔍 Query' },
];

export default function App() {
  const [tab, setTab] = useState('ingest');
  const [refresh, setRefresh] = useState(0);
  const [apiStatus, setApiStatus] = useState('checking');

  useEffect(() => {
    fetch(`${API}/`).then(r => setApiStatus(r.ok ? 'ok' : 'error')).catch(() => setApiStatus('error'));
  }, []);

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: "'Inter', system-ui, sans-serif", color: C.text }}>
      <div style={{ background: C.surface, borderBottom: `1px solid ${C.border}`, padding: '0 24px' }}>
        <div style={{ maxWidth: 1300, margin: '0 auto', display: 'flex', alignItems: 'center', height: 60, gap: 4 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginRight: 24 }}>
            <div style={{ width: 32, height: 32, background: `linear-gradient(135deg, ${C.accent}, #7C3AED)`, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🧠</div>
            <div>
              <div style={{ color: C.text, fontWeight: 800, fontSize: 15, lineHeight: 1 }}>MeetingIQ</div>
              <div style={{ color: C.muted, fontSize: 10, letterSpacing: 1 }}>INTELLIGENCE SYSTEM</div>
            </div>
          </div>
          <nav style={{ display: 'flex', gap: 2, flex: 1, overflowX: 'auto' }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)} style={{
                background: tab === t.id ? C.accentDim : 'transparent',
                color: tab === t.id ? C.highlight : C.muted,
                border: 'none', borderRadius: 8, padding: '8px 14px',
                cursor: 'pointer', fontSize: 13, fontWeight: tab === t.id ? 700 : 500,
                whiteSpace: 'nowrap',
              }}>{t.label}</button>
            ))}
          </nav>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginLeft: 16 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: apiStatus === 'ok' ? C.green : apiStatus === 'error' ? C.red : C.yellow }} />
            <span style={{ color: C.muted, fontSize: 12 }}>{apiStatus === 'ok' ? 'Connected' : apiStatus === 'error' ? 'Offline' : 'Connecting...'}</span>
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 1300, margin: '0 auto', padding: '32px 24px' }}>
        {tab === 'dashboard'   && <Dashboard refresh={refresh} />}
        {tab === 'ingest'      && <Ingest onIngested={() => setRefresh(r => r + 1)} />}
        {tab === 'meetings'    && <Meetings refresh={refresh} />}
        {tab === 'escalations' && <Escalations refresh={refresh} />}
        {tab === 'actions'     && <ActionItems refresh={refresh} />}
        {tab === 'risks'       && <Risks refresh={refresh} />}
        {tab === 'sentiment'   && <Sentiment refresh={refresh} />}
        {tab === 'query'       && <Query />}
      </div>
    </div>
  );
}

// ── Ingest ────────────────────────────────────────────────────────────────────
function Ingest({ onIngested }) {
  const [title, setTitle]       = useState('');
  const [content, setContent]   = useState('');
  const [loading, setLoading]   = useState(false);
  const [result, setResult]     = useState(null);
  const [error, setError]       = useState('');
  const [email, setEmail]       = useState('');
  const [emailLoading, setEmailLoading] = useState(false);
  const [slackUrl, setSlackUrl] = useState('');
  const fileRef = useRef();

  const ingest = async () => {
    if (!content.trim()) { setError('Content is required'); return; }
    setLoading(true); setError(''); setResult(null); setEmail('');
    try {
      const r = await fetch(`${API}/api/meetings/ingest`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title || 'Untitled Meeting', content }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Failed');
      setResult(d);
      setContent(''); setTitle('');
      onIngested?.();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const loadExamples = async () => {
    setLoading(true); setError(''); setResult(null); setEmail('');
    try {
      const r = await fetch(`${API}/api/meetings/example/load`);
      const d = await r.json();
      setResult({ _exampleMsg: `✅ Loaded ${d.loaded} example meetings!` });
      onIngested?.();
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const uploadFile = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setLoading(true); setError(''); setResult(null); setEmail('');
    try {
      const fd = new FormData();
      fd.append('file', file);
      const r = await fetch(`${API}/api/meetings/ingest/file`, { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Upload failed');
      setResult(d);
      onIngested?.();
    } catch (e) { setError(e.message); }
    setLoading(false);
    e.target.value = '';
  };

  const generateEmail = async () => {
    if (!result?.meeting_id) return;
    setEmailLoading(true);
    try {
      const r = await fetch(`${API}/api/meetings/generate-email`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: result.meeting_id }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.detail || 'Email generation failed');
      setEmail(d.email);
    } catch (e) { setError(e.message); }
    setEmailLoading(false);
  };

  const sendSlack = async () => {
    if (!result?.meeting_id || !slackUrl.trim()) return;
    try {
      const r = await fetch(`${API}/api/slack/notify`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: result.meeting_id, webhook_url: slackUrl }),
      });
      const d = await r.json();
      alert(d.message || 'Sent!');
    } catch (e) { alert('Slack error: ' + e.message); }
  };

  return (
    <div style={{ maxWidth: 900 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20, flexWrap: 'wrap', gap: 10 }}>
        <h2 style={{ color: C.text, margin: 0 }}>⚡ Ingest Meeting</h2>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={loadExamples} disabled={loading} style={btn(C.accentDim, C.highlight)}>📋 Load 3 Example Meetings</button>
          <button onClick={() => fileRef.current.click()} disabled={loading} style={btn('#1E2D47', C.muted)}>📁 Upload .txt / .md</button>
          <input ref={fileRef} type="file" accept=".txt,.md" style={{ display: 'none' }} onChange={uploadFile} />
        </div>
      </div>

      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Meeting title (optional)" style={{ ...inputStyle, marginBottom: 10 }} />
      <textarea value={content} onChange={e => setContent(e.target.value)}
        placeholder="Paste raw meeting transcript, summary, or discussion notes here..."
        rows={10} style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit', marginBottom: 10 }} />

      {error && <div style={{ color: C.red, background: C.red + '11', borderRadius: 8, padding: 12, marginBottom: 10, border: `1px solid ${C.red}33` }}>❌ {error}</div>}

      <button onClick={ingest} disabled={loading || !content.trim()} style={{ ...btn(C.accent, '#fff'), width: '100%', padding: 14, fontSize: 15 }}>
        {loading ? '⏳ Extracting Intelligence...' : '⚡ Extract Intelligence'}
      </button>

      {/* RESULT SECTION */}
      {result && (
        <Card style={{ marginTop: 20, borderColor: C.green + '44' }}>
          {result._exampleMsg ? (
            <div style={{ color: C.green, fontWeight: 700, fontSize: 15 }}>{result._exampleMsg}</div>
          ) : (
            <>
              <div style={{ color: C.green, fontWeight: 700, marginBottom: 12, fontSize: 15 }}>
                ✅ Ingested: <span style={{ color: C.highlight }}>{result.title}</span>
              </div>

              {/* Counts */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 14 }}>
                {Object.entries(result.counts || {}).map(([k, v]) => (
                  <div key={k} style={{ background: C.bg, borderRadius: 8, padding: '8px 14px', textAlign: 'center' }}>
                    <div style={{ color: C.accent, fontSize: 22, fontWeight: 800 }}>{v}</div>
                    <div style={{ color: C.muted, fontSize: 11 }}>{k.replace('_', ' ')}</div>
                  </div>
                ))}
              </div>

              {/* Sentiment + Urgency */}
              {result.sentiment && (
                <div style={{ display: 'flex', gap: 16, marginBottom: 16, fontSize: 13 }}>
                  <span>🎭 Sentiment: <Badge label={result.sentiment} color={sentimentColor[result.sentiment] || C.muted} /></span>
                  <span>⚡ Urgency: <Badge label={result.urgency_level} color={urgencyColor[result.urgency_level] || C.muted} /></span>
                </div>
              )}

              {/* Email + Slack buttons */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <button onClick={generateEmail} disabled={emailLoading} style={btn(C.accentDim, C.highlight)}>
                  {emailLoading ? '⏳ Generating...' : '📧 Generate Follow-up Email'}
                </button>
                <input value={slackUrl} onChange={e => setSlackUrl(e.target.value)}
                  placeholder="Slack Webhook URL (optional)"
                  style={{ ...inputStyle, width: 240, padding: '8px 12px', fontSize: 12 }} />
                <button onClick={sendSlack} disabled={!slackUrl.trim()} style={btn('#4a154b', '#fff')}>
                  💬 Send to Slack
                </button>
              </div>
            </>
          )}
        </Card>
      )}

      {/* Email Output */}
      {email && (
        <Card style={{ marginTop: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <h3 style={{ color: C.text, margin: 0, fontSize: 15 }}>📧 Generated Follow-up Email</h3>
            <button onClick={() => { navigator.clipboard.writeText(email); alert('Copied!'); }} style={btn(C.accentDim, C.highlight, { padding: '6px 12px', fontSize: 12 })}>📋 Copy</button>
          </div>
          <pre style={{ whiteSpace: 'pre-wrap', fontSize: 13, lineHeight: 1.7, color: C.text, margin: 0 }}>{email}</pre>
        </Card>
      )}
    </div>
  );
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
function Dashboard({ refresh }) {
  const [data, setData] = useState(null);
  useEffect(() => { fetch(`${API}/api/dashboard`).then(r => r.json()).then(setData).catch(() => {}); }, [refresh]);
  if (!data) return <Loader />;

  const cards = [
    { label: 'Total Meetings', value: data.total_meetings, color: C.accent },
    { label: 'Open Escalations', value: data.open_escalations, color: data.open_escalations > 0 ? C.red : C.green },
    { label: 'Active Blockers', value: data.active_blockers, color: data.active_blockers > 0 ? C.orange : C.green },
    { label: 'Pending Actions', value: data.pending_actions, color: C.yellow },
    { label: 'High Priority', value: data.high_priority_actions, color: C.red },
    { label: 'At-Risk Projects', value: data.at_risk_projects, color: data.at_risk_projects > 0 ? C.orange : C.green },
    { label: 'Duplicate Escalations', value: data.duplicate_escalations || 0, color: '#8b5cf6' },
    { label: 'Critical Risks', value: data.critical_risks || 0, color: C.red },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h2 style={{ color: C.text, margin: 0 }}>📊 Dashboard</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 14 }}>
        {cards.map(c => (
          <div key={c.label} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 12, padding: '18px 20px' }}>
            <div style={{ color: c.color, fontSize: 32, fontWeight: 800, lineHeight: 1 }}>{c.value}</div>
            <div style={{ color: C.muted, fontSize: 12, marginTop: 4 }}>{c.label}</div>
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <h3 style={{ color: C.text, margin: '0 0 14px 0', fontSize: 14 }}>🎭 Sentiment</h3>
          {Object.entries(data.sentiment_breakdown || {}).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: sentimentColor[k] || C.muted, fontSize: 13, textTransform: 'capitalize' }}>{k}</span>
              <span style={{ fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </Card>
        <Card>
          <h3 style={{ color: C.text, margin: '0 0 14px 0', fontSize: 14 }}>⚡ Urgency</h3>
          {Object.entries(data.urgency_breakdown || {}).map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
              <span style={{ color: urgencyColor[k] || C.muted, fontSize: 13, textTransform: 'capitalize' }}>{k}</span>
              <span style={{ fontWeight: 700 }}>{v}</span>
            </div>
          ))}
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <h3 style={{ color: C.text, margin: '0 0 14px 0', fontSize: 14 }}>🚨 Top Escalations</h3>
          {(data.recent_escalations || []).map(e => (
            <div key={e.id} style={{ borderLeft: `3px solid ${C.red}`, paddingLeft: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 13 }}>{e.description}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>by {e.raised_by || 'N/A'} • score: {e.severity_score}</div>
            </div>
          ))}
        </Card>
        <Card>
          <h3 style={{ color: C.text, margin: '0 0 14px 0', fontSize: 14 }}>⚠️ Top Risks</h3>
          {(data.top_risks || []).map(r => (
            <div key={r.id} style={{ borderLeft: `3px solid ${C.orange}`, paddingLeft: 10, marginBottom: 10 }}>
              <div style={{ fontSize: 13 }}>{r.description}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>score: {r.severity_score}</div>
            </div>
          ))}
        </Card>
      </div>

      <Card>
        <h3 style={{ color: C.text, margin: '0 0 14px 0', fontSize: 14 }}>✅ Pending Action Items</h3>
        {(data.pending_action_items || []).length === 0
          ? <div style={{ color: C.muted, fontSize: 13 }}>No pending actions</div>
          : <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>{['Priority', 'Task', 'Owner', 'Deadline'].map(h => <th key={h} style={{ textAlign: 'left', padding: '6px 8px', color: C.muted, fontSize: 11, textTransform: 'uppercase' }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {data.pending_action_items.map(a => (
                  <tr key={a.id} style={{ borderTop: `1px solid ${C.border}` }}>
                    <td style={{ padding: '8px' }}><Badge label={a.priority} color={sevColor[a.priority] || C.muted} /></td>
                    <td style={{ padding: '8px', color: C.text }}>{a.description}</td>
                    <td style={{ padding: '8px', color: C.highlight }}>{a.owner || '—'}</td>
                    <td style={{ padding: '8px', color: C.muted }}>{a.deadline || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
        }
      </Card>
    </div>
  );
}

// ── Meetings ──────────────────────────────────────────────────────────────────
function Meetings({ refresh }) {
  const [meetings, setMeetings] = useState([]);
  const [detail, setDetail] = useState(null);
  useEffect(() => { fetch(`${API}/api/meetings`).then(r => r.json()).then(setMeetings).catch(() => {}); }, [refresh]);

  if (detail) {
    return (
      <div>
        <button onClick={() => setDetail(null)} style={{ ...btn('#1E2D47', C.muted), marginBottom: 16 }}>← Back</button>
        <h2 style={{ color: C.text, marginBottom: 20 }}>{detail.title}</h2>
        {[
          ['⚡ Action Items', detail.action_items, a => <div key={a.id} style={{ marginBottom: 10, paddingBottom: 10, borderBottom: `1px solid ${C.border}` }}><div style={{ color: C.text }}>{a.description}</div><div style={{ display: 'flex', gap: 8, marginTop: 4 }}><Badge label={a.priority} color={sevColor[a.priority] || C.muted} />{a.owner && <span style={{ color: C.highlight, fontSize: 12 }}>👤 {a.owner}</span>}{a.deadline && <span style={{ color: C.muted, fontSize: 12 }}>📅 {a.deadline}</span>}</div></div>],
          ['🚨 Escalations', detail.escalations, e => <div key={e.id} style={{ marginBottom: 10 }}><div style={{ color: C.text }}>{e.description}</div><div style={{ display: 'flex', gap: 8, marginTop: 4 }}><Badge label={e.severity} color={sevColor[e.severity] || C.muted} />{e.raised_by && <span style={{ color: C.muted, fontSize: 12 }}>by {e.raised_by}</span>}</div></div>],
          ['⚠️ Risks', detail.risks, r => <div key={r.id} style={{ marginBottom: 10 }}><div style={{ color: C.text }}>{r.description}</div>{r.mitigation && <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Mitigation: {r.mitigation}</div>}</div>],
          ['🔴 Blockers', detail.blockers, b => <div key={b.id} style={{ marginBottom: 10 }}><div style={{ color: C.text }}>{b.description}</div>{b.affected_project && <div style={{ color: C.muted, fontSize: 12 }}>→ {b.affected_project}</div>}</div>],
          ['✅ Decisions', detail.decisions, d => <div key={d.id} style={{ marginBottom: 10 }}><div style={{ color: C.text }}>{d.description}</div>{d.rationale && <div style={{ color: C.muted, fontSize: 12, marginTop: 2 }}>Rationale: {d.rationale}</div>}</div>],
          ['👥 Stakeholders', detail.stakeholders, s => <span key={s.id} style={{ display: 'inline-flex', gap: 4, marginRight: 8, marginBottom: 8, background: C.accentDim, borderRadius: 6, padding: '4px 10px' }}><span style={{ color: C.highlight }}>{s.name}</span>{s.team && <span style={{ color: C.muted, fontSize: 12 }}>({s.team})</span>}</span>],
        ].map(([label, items, render]) => items?.length > 0 && (
          <Card key={label} style={{ marginBottom: 16 }}>
            <h3 style={{ color: C.text, margin: '0 0 14px 0', fontSize: 14 }}>{label}</h3>
            {items.map(render)}
          </Card>
        ))}
      </div>
    );
  }

  return (
    <div>
      <h2 style={{ color: C.text, marginBottom: 20 }}>📅 Meetings ({meetings.length})</h2>
      {meetings.map(m => (
        <div key={m.id} onClick={() => fetch(`${API}/api/meetings/${m.id}`).then(r => r.json()).then(setDetail)}
          style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '14px 18px', marginBottom: 10, cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = C.accent}
          onMouseLeave={e => e.currentTarget.style.borderColor = C.border}>
          <div>
            <div style={{ fontWeight: 600, color: C.text }}>{m.title}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 3 }}>{new Date(m.created_at).toLocaleString()}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {m.sentiment && <Badge label={m.sentiment} color={sentimentColor[m.sentiment] || C.muted} />}
            {m.urgency_level && <Badge label={m.urgency_level} color={urgencyColor[m.urgency_level] || C.muted} />}
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Escalations ───────────────────────────────────────────────────────────────
function Escalations({ refresh }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('all');

  const load = useCallback(() => {
    const url = filter === 'all' ? `${API}/api/escalations` : `${API}/api/escalations?status=${filter}`;
    fetch(url).then(r => r.json()).then(setItems).catch(() => {});
  }, [filter, refresh]);

  useEffect(() => { load(); }, [load]);

  const resolve = async (id) => {
    await fetch(`${API}/api/escalations/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'resolved' }) });
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: C.text, margin: 0 }}>🚨 Escalations ({items.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'open', 'resolved'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={btn(filter === f ? C.accent : '#1E2D47', filter === f ? '#fff' : C.muted)}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
      </div>
      {items.map(e => (
        <Card key={e.id} style={{ marginBottom: 12, borderLeft: `4px solid ${e.is_duplicate ? '#8b5cf6' : C.red}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: C.text, fontWeight: 600, marginBottom: 8 }}>{e.description}</div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <Badge label={e.severity} color={sevColor[e.severity] || C.muted} />
                <Badge label={e.status} color={sevColor[e.status] || C.muted} />
                {e.raised_by && <span style={{ color: C.muted, fontSize: 12 }}>by <span style={{ color: C.highlight }}>{e.raised_by}</span></span>}
                {e.severity_score > 0 && <span style={{ color: C.orange, fontSize: 12 }}>score: {e.severity_score}</span>}
                {e.is_duplicate === 1 && <Badge label="DUPLICATE" color="#8b5cf6" />}
                {e.meeting_title && <span style={{ color: C.muted, fontSize: 12 }}>{e.meeting_title}</span>}
              </div>
            </div>
            {e.status === 'open' && (
              <button onClick={() => resolve(e.id)} style={{ ...btn(C.green + '33', C.green), marginLeft: 12 }}>Resolve</button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Action Items ──────────────────────────────────────────────────────────────
function ActionItems({ refresh }) {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState('pending');

  const load = useCallback(() => {
    const url = filter === 'all' ? `${API}/api/action-items` : `${API}/api/action-items?status=${filter}`;
    fetch(url).then(r => r.json()).then(setItems).catch(() => {});
  }, [filter, refresh]);

  useEffect(() => { load(); }, [load]);

  const complete = async (id) => {
    await fetch(`${API}/api/action-items/${id}/status`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'completed' }) });
    load();
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h2 style={{ color: C.text, margin: 0 }}>✅ Action Items ({items.length})</h2>
        <div style={{ display: 'flex', gap: 8 }}>
          {['all', 'pending', 'completed'].map(f => (
            <button key={f} onClick={() => setFilter(f)} style={btn(filter === f ? C.accent : '#1E2D47', filter === f ? '#fff' : C.muted)}>{f.charAt(0).toUpperCase() + f.slice(1)}</button>
          ))}
        </div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr>{['Priority', 'Task', 'Owner', 'Deadline', 'Meeting', 'Status', ''].map(h => (
            <th key={h} style={{ textAlign: 'left', padding: '8px 12px', color: C.muted, fontSize: 11, textTransform: 'uppercase', borderBottom: `1px solid ${C.border}` }}>{h}</th>
          ))}</tr>
        </thead>
        <tbody>
          {items.map(a => (
            <tr key={a.id} style={{ borderBottom: `1px solid ${C.border}` }}>
              <td style={{ padding: '10px 12px' }}><Badge label={a.priority} color={sevColor[a.priority] || C.muted} /></td>
              <td style={{ padding: '10px 12px', color: C.text, maxWidth: 260 }}>{a.description}</td>
              <td style={{ padding: '10px 12px', color: C.highlight }}>{a.owner || '—'}</td>
              <td style={{ padding: '10px 12px', color: C.muted }}>{a.deadline || '—'}</td>
              <td style={{ padding: '10px 12px', color: C.muted, fontSize: 12 }}>{a.meeting_title}</td>
              <td style={{ padding: '10px 12px' }}><Badge label={a.status} color={sevColor[a.status] || C.muted} /></td>
              <td style={{ padding: '10px 12px' }}>
                {a.status === 'pending' && <button onClick={() => complete(a.id)} style={{ ...btn(C.green + '22', C.green), padding: '4px 10px', fontSize: 11 }}>Done</button>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Risks ─────────────────────────────────────────────────────────────────────
function Risks({ refresh }) {
  const [risks, setRisks] = useState([]);
  useEffect(() => { fetch(`${API}/api/risks`).then(r => r.json()).then(setRisks).catch(() => {}); }, [refresh]);
  const scoreColor = s => s >= 0.75 ? C.red : s >= 0.5 ? C.orange : C.yellow;

  return (
    <div>
      <h2 style={{ color: C.text, marginBottom: 20 }}>⚠️ Risks ({risks.length})</h2>
      {risks.map(r => (
        <Card key={r.id} style={{ marginBottom: 12, borderLeft: `4px solid ${scoreColor(r.severity_score)}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ color: C.text, fontWeight: 600, marginBottom: 8 }}>{r.description}</div>
            <div style={{ background: scoreColor(r.severity_score), borderRadius: 20, padding: '2px 10px', fontSize: 12, fontWeight: 700, color: '#fff' }}>{r.severity_score}</div>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', fontSize: 12, color: C.muted }}>
            <span>Impact: <Badge label={r.impact} color={sevColor[r.impact] || C.muted} /></span>
            <span>Likelihood: <Badge label={r.likelihood} color={sevColor[r.likelihood] || C.muted} /></span>
            {r.mitigation && <span>🛡 {r.mitigation}</span>}
            {r.meeting_title && <span>📅 {r.meeting_title}</span>}
          </div>
        </Card>
      ))}
    </div>
  );
}

// ── Sentiment ─────────────────────────────────────────────────────────────────
function Sentiment({ refresh }) {
  const [data, setData] = useState(null);
  useEffect(() => { fetch(`${API}/api/sentiment`).then(r => r.json()).then(setData).catch(() => {}); }, [refresh]);
  if (!data) return <Loader />;

  return (
    <div>
      <h2 style={{ color: C.text, marginBottom: 20 }}>🎭 Sentiment & Urgency</h2>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
        <Card>
          <h3 style={{ color: C.text, margin: '0 0 14px 0', fontSize: 14 }}>Sentiment Breakdown</h3>
          {Object.entries(data.sentiment_breakdown || {}).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: sentimentColor[k] || C.muted, fontSize: 13, textTransform: 'capitalize' }}>{k}</span>
                <span style={{ fontSize: 13 }}>{v}</span>
              </div>
              <div style={{ background: C.bg, borderRadius: 4, height: 6 }}>
                <div style={{ background: sentimentColor[k] || C.muted, height: 6, borderRadius: 4, width: `${Math.min(100, (v / (data.meetings?.length || 1)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </Card>
        <Card>
          <h3 style={{ color: C.text, margin: '0 0 14px 0', fontSize: 14 }}>Urgency Breakdown</h3>
          {Object.entries(data.urgency_breakdown || {}).map(([k, v]) => (
            <div key={k} style={{ marginBottom: 10 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                <span style={{ color: urgencyColor[k] || C.muted, fontSize: 13, textTransform: 'capitalize' }}>{k}</span>
                <span style={{ fontSize: 13 }}>{v}</span>
              </div>
              <div style={{ background: C.bg, borderRadius: 4, height: 6 }}>
                <div style={{ background: urgencyColor[k] || C.muted, height: 6, borderRadius: 4, width: `${Math.min(100, (v / (data.meetings?.length || 1)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </Card>
      </div>
      <h3 style={{ color: C.text, marginBottom: 12 }}>All Meetings</h3>
      {(data.meetings || []).map(m => (
        <div key={m.id} style={{ background: C.card, border: `1px solid ${C.border}`, borderRadius: 10, padding: '12px 16px', marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 13, color: C.text }}>{m.title}</div>
            <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{new Date(m.created_at).toLocaleString()}</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Badge label={m.sentiment} color={sentimentColor[m.sentiment] || C.muted} />
            <Badge label={m.urgency_level} color={urgencyColor[m.urgency_level] || C.muted} />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Query ─────────────────────────────────────────────────────────────────────
function Query() {
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);

  const examples = [
    'What are the current unresolved escalations?',
    'Which projects are at risk?',
    'Show all pending tasks assigned to Rahul',
    'List all high-priority blockers',
    'Which meetings had negative sentiment?',
    'What are the critical risks?',
  ];

  const ask = async () => {
    if (!question.trim()) return;
    setLoading(true);
    const q = question; setQuestion('');
    const res = await fetch(`${API}/api/query`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: q }),
    }).then(r => r.json()).catch(e => ({ answer: 'Error: ' + e.message }));
    setHistory(h => [{ question: q, answer: res.answer, ts: new Date() }, ...h]);
    setLoading(false);
  };

  return (
    <div style={{ maxWidth: 860 }}>
      <h2 style={{ color: C.text, marginBottom: 4 }}>🔍 Query Intelligence</h2>
      <p style={{ color: C.muted, marginTop: 0, marginBottom: 20, fontSize: 14 }}>Ask anything about your meetings, tasks, risks, and escalations.</p>
      <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
        <input value={question} onChange={e => setQuestion(e.target.value)} onKeyDown={e => e.key === 'Enter' && ask()}
          placeholder="Ask a question..." style={{ ...inputStyle, flex: 1 }} />
        <button onClick={ask} disabled={loading || !question.trim()} style={btn(C.accent, '#fff')}>{loading ? '...' : 'Ask'}</button>
      </div>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 24 }}>
        {examples.map(ex => <button key={ex} onClick={() => setQuestion(ex)} style={{ ...btn('#1E2D47', C.muted), fontSize: 11 }}>{ex}</button>)}
      </div>
      {history.map((h, i) => (
        <Card key={i} style={{ marginBottom: 14 }}>
          <div style={{ color: C.highlight, fontWeight: 600, marginBottom: 8, fontSize: 13 }}>Q: {h.question}</div>
          <div style={{ color: C.text, fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{h.answer}</div>
          <div style={{ color: C.muted, fontSize: 11, marginTop: 8 }}>{h.ts.toLocaleTimeString()}</div>
        </Card>
      ))}
    </div>
  );
}

