from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional
import json
import uuid
import re
from datetime import datetime
from groq import Groq
import sqlite3
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Meeting Intelligence System", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

client = Groq(api_key=os.getenv("GROQ_API_KEY"))
DB_PATH = "meetings.db"

def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.executescript("""
        CREATE TABLE IF NOT EXISTS meetings (
            id TEXT PRIMARY KEY, title TEXT, raw_content TEXT, created_at TEXT,
            sentiment TEXT DEFAULT 'neutral', sentiment_score REAL DEFAULT 0.0,
            urgency_level TEXT DEFAULT 'medium'
        );
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY, meeting_id TEXT, name TEXT, description TEXT, status TEXT,
            FOREIGN KEY(meeting_id) REFERENCES meetings(id)
        );
        CREATE TABLE IF NOT EXISTS action_items (
            id TEXT PRIMARY KEY, meeting_id TEXT, description TEXT, owner TEXT,
            deadline TEXT, priority TEXT, status TEXT DEFAULT 'pending',
            severity_score REAL DEFAULT 0.0,
            FOREIGN KEY(meeting_id) REFERENCES meetings(id)
        );
        CREATE TABLE IF NOT EXISTS escalations (
            id TEXT PRIMARY KEY, meeting_id TEXT, description TEXT, raised_by TEXT,
            severity TEXT, status TEXT DEFAULT 'open', severity_score REAL DEFAULT 0.0,
            is_duplicate INTEGER DEFAULT 0, duplicate_of TEXT,
            FOREIGN KEY(meeting_id) REFERENCES meetings(id)
        );
        CREATE TABLE IF NOT EXISTS risks (
            id TEXT PRIMARY KEY, meeting_id TEXT, description TEXT, impact TEXT,
            likelihood TEXT, mitigation TEXT, severity_score REAL DEFAULT 0.0,
            FOREIGN KEY(meeting_id) REFERENCES meetings(id)
        );
        CREATE TABLE IF NOT EXISTS decisions (
            id TEXT PRIMARY KEY, meeting_id TEXT, description TEXT, rationale TEXT, decided_by TEXT,
            FOREIGN KEY(meeting_id) REFERENCES meetings(id)
        );
        CREATE TABLE IF NOT EXISTS blockers (
            id TEXT PRIMARY KEY, meeting_id TEXT, description TEXT, affected_project TEXT,
            owner TEXT, status TEXT DEFAULT 'active',
            FOREIGN KEY(meeting_id) REFERENCES meetings(id)
        );
        CREATE TABLE IF NOT EXISTS stakeholders (
            id TEXT PRIMARY KEY, meeting_id TEXT, name TEXT, role TEXT, team TEXT,
            FOREIGN KEY(meeting_id) REFERENCES meetings(id)
        );
    """)
    conn.commit()
    conn.close()

init_db()

def migrate_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    migrations = [
        ("escalations", "is_duplicate", "INTEGER DEFAULT 0"),
        ("escalations", "duplicate_of", "TEXT"),
        ("escalations", "severity_score", "REAL DEFAULT 0.0"),
        ("action_items", "severity_score", "REAL DEFAULT 0.0"),
        ("risks", "severity_score", "REAL DEFAULT 0.0"),
        ("meetings", "sentiment", "TEXT DEFAULT 'neutral'"),
        ("meetings", "sentiment_score", "REAL DEFAULT 0.0"),
        ("meetings", "urgency_level", "TEXT DEFAULT 'medium'"),
    ]
    for table, column, col_type in migrations:
        try:
            c.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_type}")
        except sqlite3.OperationalError:
            pass
    conn.commit()
    conn.close()

migrate_db()

class MeetingInput(BaseModel):
    title: Optional[str] = "Untitled Meeting"
    content: str

class QueryInput(BaseModel):
    question: str

class UpdateStatusInput(BaseModel):
    status: str

class EmailRequest(BaseModel):
    meeting_id: str
    recipient_name: Optional[str] = "Team"

class SlackRequest(BaseModel):
    meeting_id: str
    webhook_url: str

EXTRACTION_PROMPT = """You are an expert Meeting Intelligence Analyst. Analyze the meeting content and extract structured intelligence.

Return ONLY a valid JSON object (no markdown, no extra text):
{
  "projects": [{"name": "...", "description": "...", "status": "active|at_risk|completed"}],
  "action_items": [{"description": "...", "owner": "...", "deadline": "...", "priority": "high|medium|low"}],
  "escalations": [{"description": "...", "raised_by": "...", "severity": "critical|high|medium|low"}],
  "risks": [{"description": "...", "impact": "high|medium|low", "likelihood": "high|medium|low", "mitigation": "..."}],
  "decisions": [{"description": "...", "rationale": "...", "decided_by": "..."}],
  "blockers": [{"description": "...", "affected_project": "...", "owner": "..."}],
  "stakeholders": [{"name": "...", "role": "...", "team": "..."}],
  "summary": "2-3 sentence executive summary.",
  "sentiment": "positive|neutral|negative|urgent",
  "sentiment_score": 0.0,
  "urgency_level": "low|medium|high|critical",
  "urgency_signals": ["signal1", "signal2"]
}

Meeting Content:
"""

def calculate_severity_score(item: dict, item_type: str) -> float:
    score = 0.0
    severity_map = {"critical": 1.0, "high": 0.75, "medium": 0.5, "low": 0.25}
    impact_map = {"high": 1.0, "medium": 0.5, "low": 0.25}
    if item_type == "escalation":
        score = severity_map.get(item.get("severity", "medium"), 0.5)
    elif item_type == "risk":
        impact = impact_map.get(item.get("impact", "medium"), 0.5)
        likelihood = impact_map.get(item.get("likelihood", "medium"), 0.5)
        score = (impact + likelihood) / 2
    elif item_type == "action":
        priority_map = {"high": 0.9, "medium": 0.6, "low": 0.3}
        score = priority_map.get(item.get("priority", "medium"), 0.5)
        if item.get("deadline"):
            score = min(1.0, score + 0.1)
    return round(score, 2)

def check_duplicate_escalation(new_desc: str, conn) -> Optional[str]:
    c = conn.cursor()
    c.execute("SELECT id, description FROM escalations WHERE is_duplicate=0")
    existing = c.fetchall()
    new_words = set(new_desc.lower().split())
    for eid, edesc in existing:
        existing_words = set(edesc.lower().split())
        if len(new_words) == 0:
            continue
        similarity = len(new_words & existing_words) / len(new_words | existing_words)
        if similarity > 0.6:
            return eid
    return None

def extract_intelligence(content: str) -> dict:
    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": EXTRACTION_PROMPT + content}]
    )
    raw = response.choices[0].message.content.strip()
    raw = re.sub(r"^```(?:json)?\s*", "", raw)
    raw = re.sub(r"\s*```$", "", raw)
    return json.loads(raw)

@app.get("/")
def root():
    return {"message": "Meeting Intelligence System API", "version": "2.0.0"}

@app.post("/api/meetings/ingest")
def ingest_meeting(data: MeetingInput):
    meeting_id = str(uuid.uuid4())
    created_at = datetime.utcnow().isoformat()
    try:
        extracted = extract_intelligence(data.content)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"AI extraction failed: {str(e)}")

    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO meetings VALUES (?,?,?,?,?,?,?)", (
        meeting_id, data.title, data.content, created_at,
        extracted.get("sentiment", "neutral"),
        extracted.get("sentiment_score", 0.0),
        extracted.get("urgency_level", "medium")
    ))
    for p in extracted.get("projects", []):
        c.execute("INSERT INTO projects VALUES (?,?,?,?,?)",
                  (str(uuid.uuid4()), meeting_id, p.get("name",""), p.get("description",""), p.get("status","active")))
    for a in extracted.get("action_items", []):
        score = calculate_severity_score(a, "action")
        c.execute("INSERT INTO action_items VALUES (?,?,?,?,?,?,?,?)",
                  (str(uuid.uuid4()), meeting_id, a.get("description",""), a.get("owner",""),
                   a.get("deadline",""), a.get("priority","medium"), "pending", score))
    for e in extracted.get("escalations", []):
        score = calculate_severity_score(e, "escalation")
        dup_id = check_duplicate_escalation(e.get("description",""), conn)
        is_dup = 1 if dup_id else 0
        c.execute("INSERT INTO escalations VALUES (?,?,?,?,?,?,?,?,?)",
                  (str(uuid.uuid4()), meeting_id, e.get("description",""), e.get("raised_by",""),
                   e.get("severity","medium"), "open", score, is_dup, dup_id))
    for r in extracted.get("risks", []):
        score = calculate_severity_score(r, "risk")
        c.execute("INSERT INTO risks VALUES (?,?,?,?,?,?,?)",
                  (str(uuid.uuid4()), meeting_id, r.get("description",""), r.get("impact","medium"),
                   r.get("likelihood","medium"), r.get("mitigation",""), score))
    for d in extracted.get("decisions", []):
        c.execute("INSERT INTO decisions VALUES (?,?,?,?,?)",
                  (str(uuid.uuid4()), meeting_id, d.get("description",""), d.get("rationale",""), d.get("decided_by","")))
    for b in extracted.get("blockers", []):
        c.execute("INSERT INTO blockers VALUES (?,?,?,?,?,?)",
                  (str(uuid.uuid4()), meeting_id, b.get("description",""), b.get("affected_project",""),
                   b.get("owner",""), "active"))
    for s in extracted.get("stakeholders", []):
        c.execute("INSERT INTO stakeholders VALUES (?,?,?,?,?)",
                  (str(uuid.uuid4()), meeting_id, s.get("name",""), s.get("role",""), s.get("team","")))
    conn.commit()
    conn.close()

    return {
        "meeting_id": meeting_id, "title": data.title, "created_at": created_at,
        "extracted": extracted,
        "sentiment": extracted.get("sentiment", "neutral"),
        "urgency_level": extracted.get("urgency_level", "medium"),
        "urgency_signals": extracted.get("urgency_signals", []),
        "counts": {
            "projects": len(extracted.get("projects", [])),
            "action_items": len(extracted.get("action_items", [])),
            "escalations": len(extracted.get("escalations", [])),
            "risks": len(extracted.get("risks", [])),
            "decisions": len(extracted.get("decisions", [])),
            "blockers": len(extracted.get("blockers", [])),
            "stakeholders": len(extracted.get("stakeholders", [])),
        }
    }

@app.post("/api/meetings/ingest/file")
async def ingest_file(file: UploadFile = File(...)):
    content = await file.read()
    text = content.decode("utf-8", errors="ignore")
    title = file.filename.replace(".txt","").replace(".md","").replace("_"," ").title()
    return ingest_meeting(MeetingInput(title=title, content=text))

@app.get("/api/meetings/example/load")
def load_example():
    examples = [
        {"title": "Q3 Payment Integration Sync", "content": """The payment integration is delayed because the Vendor API is unstable.
Rahul will coordinate with the backend team before Friday. If this issue continues, it may impact the Phase-2 release.
Priya escalated the concern to leadership. The team decided to implement a fallback payment processor as a contingency plan.
Anika from DevOps will set up monitoring alerts for API uptime by Wednesday.
Risk identified: If Phase-2 slips by more than 2 weeks, Q3 revenue targets will be at risk.
The mobile team is blocked waiting for the API fix before they can start integration testing."""},
        {"title": "Product Roadmap Review - Week 24", "content": """Engineering sync: The authentication service migration is 80% complete.
Siddharth owns the final testing phase, deadline is end of sprint (June 20).
Critical blocker: The staging environment is down due to a database misconfiguration. DevOps team (lead: Karan) needs to resolve this today.
Risk: If staging is not restored by tomorrow, the release will need to be pushed back by one week.
Decision made: The team agreed to skip optional performance improvements in this sprint to meet the deadline.
Escalation from QA team: Test coverage dropped below 70% threshold - Meera raised this to the VP of Engineering.
Dependency: Frontend team waiting on API schema from backend (owner: Vikram) - needed by Thursday."""},
        {"title": "Customer Success & Support Triage", "content": """Three enterprise clients have reported data export failures in the last 48 hours.
Escalation: Tanvir from enterprise support escalated to product team - this is affecting SLA commitments.
Root cause analysis assigned to Deepak (backend), target: identify root cause within 24 hours.
Risk: Potential SLA breach for 3 accounts worth $2.4M ARR if not resolved by end of day Friday.
Action item: Customer success team (Sunita) to send holding communication to affected clients immediately.
Action item: Product team to prepare hotfix and deploy to production by Thursday noon.
Decision: Rollback to v2.3.1 approved as contingency if hotfix is not ready in time. Approved by CTO.
Blocker: Access to production logs requires security team approval - Arjun to expedite this request today."""}
    ]
    results = []
    for ex in examples:
        result = ingest_meeting(MeetingInput(**ex))
        results.append({"title": ex["title"], "meeting_id": result["meeting_id"]})
    return {"loaded": len(results), "meetings": results}

@app.get("/api/meetings")
def list_meetings():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT id, title, created_at, sentiment, urgency_level FROM meetings ORDER BY created_at DESC")
    rows = c.fetchall()
    conn.close()
    return [{"id": r[0], "title": r[1], "created_at": r[2], "sentiment": r[3], "urgency_level": r[4]} for r in rows]

@app.get("/api/meetings/{meeting_id}")
def get_meeting(meeting_id: str):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM meetings WHERE id=?", (meeting_id,))
    m = c.fetchone()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    def fetch(table):
        c.execute(f"SELECT * FROM {table} WHERE meeting_id=?", (meeting_id,))
        return [dict(r) for r in c.fetchall()]
    result = dict(m)
    for table in ["projects","action_items","escalations","risks","decisions","blockers","stakeholders"]:
        result[table] = fetch(table)
    conn.close()
    return result

@app.get("/api/dashboard")
def dashboard():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    def count(table, where=""):
        c.execute(f"SELECT COUNT(*) FROM {table} {where}")
        return c.fetchone()[0]
    def rows(query):
        c.execute(query)
        cols = [d[0] for d in c.description]
        return [dict(zip(cols, r)) for r in c.fetchall()]
    stats = {
        "total_meetings": count("meetings"),
        "open_escalations": count("escalations", "WHERE status='open'"),
        "active_blockers": count("blockers", "WHERE status='active'"),
        "pending_actions": count("action_items", "WHERE status='pending'"),
        "high_priority_actions": count("action_items", "WHERE priority='high' AND status='pending'"),
        "at_risk_projects": count("projects", "WHERE status='at_risk'"),
        "duplicate_escalations": count("escalations", "WHERE is_duplicate=1"),
        "critical_risks": count("risks", "WHERE severity_score >= 0.75"),
        "sentiment_breakdown": {
            "positive": count("meetings", "WHERE sentiment='positive'"),
            "neutral": count("meetings", "WHERE sentiment='neutral'"),
            "negative": count("meetings", "WHERE sentiment='negative'"),
            "urgent": count("meetings", "WHERE sentiment='urgent'"),
        },
        "urgency_breakdown": {
            "critical": count("meetings", "WHERE urgency_level='critical'"),
            "high": count("meetings", "WHERE urgency_level='high'"),
            "medium": count("meetings", "WHERE urgency_level='medium'"),
            "low": count("meetings", "WHERE urgency_level='low'"),
        },
        "recent_escalations": rows("SELECT * FROM escalations ORDER BY severity_score DESC LIMIT 5"),
        "recent_blockers": rows("SELECT * FROM blockers WHERE status='active' ORDER BY rowid DESC LIMIT 5"),
        "pending_action_items": rows("SELECT * FROM action_items WHERE status='pending' ORDER BY severity_score DESC LIMIT 10"),
        "recent_meetings": rows("SELECT id, title, created_at, sentiment, urgency_level FROM meetings ORDER BY created_at DESC LIMIT 5"),
        "top_risks": rows("SELECT * FROM risks ORDER BY severity_score DESC LIMIT 5"),
    }
    conn.close()
    return stats

@app.get("/api/escalations")
def get_escalations(status: Optional[str] = None):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    if status:
        c.execute("SELECT e.*, m.title as meeting_title FROM escalations e JOIN meetings m ON e.meeting_id=m.id WHERE e.status=? ORDER BY e.severity_score DESC", (status,))
    else:
        c.execute("SELECT e.*, m.title as meeting_title FROM escalations e JOIN meetings m ON e.meeting_id=m.id ORDER BY e.severity_score DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@app.get("/api/action-items")
def get_action_items(owner: Optional[str] = None, priority: Optional[str] = None, status: Optional[str] = None):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    query = "SELECT a.*, m.title as meeting_title FROM action_items a JOIN meetings m ON a.meeting_id=m.id WHERE 1=1"
    params = []
    if owner:
        query += " AND LOWER(a.owner) LIKE ?"
        params.append(f"%{owner.lower()}%")
    if priority:
        query += " AND a.priority=?"
        params.append(priority)
    if status:
        query += " AND a.status=?"
        params.append(status)
    query += " ORDER BY a.severity_score DESC"
    c.execute(query, params)
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@app.get("/api/risks")
def get_risks():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT r.*, m.title as meeting_title FROM risks r JOIN meetings m ON r.meeting_id=m.id ORDER BY r.severity_score DESC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@app.get("/api/blockers")
def get_blockers(status: Optional[str] = "active"):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT b.*, m.title as meeting_title FROM blockers b JOIN meetings m ON b.meeting_id=m.id WHERE b.status=? ORDER BY b.rowid DESC", (status,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

@app.get("/api/duplicates")
def get_duplicate_escalations():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""SELECT e.*, m.title as meeting_title FROM escalations e
                 JOIN meetings m ON e.meeting_id=m.id
                 WHERE e.is_duplicate=1 ORDER BY e.rowid DESC""")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return {"duplicate_count": len(rows), "duplicates": rows}

@app.get("/api/sentiment")
def get_sentiment_analysis():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT id, title, created_at, sentiment, sentiment_score, urgency_level FROM meetings ORDER BY created_at DESC")
    meetings = [dict(r) for r in c.fetchall()]
    c.execute("SELECT sentiment, COUNT(*) as count FROM meetings GROUP BY sentiment")
    breakdown = {r[0]: r[1] for r in c.fetchall()}
    c.execute("SELECT urgency_level, COUNT(*) as count FROM meetings GROUP BY urgency_level")
    urgency = {r[0]: r[1] for r in c.fetchall()}
    conn.close()
    return {"meetings": meetings, "sentiment_breakdown": breakdown, "urgency_breakdown": urgency}

@app.get("/api/risk-scores")
def get_risk_scores():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("""SELECT r.*, m.title as meeting_title FROM risks r
                 JOIN meetings m ON r.meeting_id=m.id
                 ORDER BY r.severity_score DESC""")
    risks = [dict(r) for r in c.fetchall()]
    c.execute("""SELECT e.*, m.title as meeting_title FROM escalations e
                 JOIN meetings m ON e.meeting_id=m.id
                 ORDER BY e.severity_score DESC""")
    escalations = [dict(r) for r in c.fetchall()]
    conn.close()
    return {
        "risks_by_severity": risks,
        "escalations_by_severity": escalations,
        "critical_count": len([r for r in risks if r["severity_score"] >= 0.75]),
        "high_count": len([r for r in risks if 0.5 <= r["severity_score"] < 0.75]),
    }

@app.post("/api/meetings/generate-email")
def generate_followup_email(req: EmailRequest):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM meetings WHERE id=?", (req.meeting_id,))
    m = c.fetchone()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    def fetch(table):
        c.execute(f"SELECT * FROM {table} WHERE meeting_id=?", (req.meeting_id,))
        return [dict(r) for r in c.fetchall()]
    meeting_data = dict(m)
    meeting_data["action_items"] = fetch("action_items")
    meeting_data["escalations"] = fetch("escalations")
    meeting_data["risks"] = fetch("risks")
    meeting_data["decisions"] = fetch("decisions")
    conn.close()

    prompt = f"""Generate a professional follow-up email for this meeting. Be concise and actionable.

Meeting: {meeting_data['title']}
Date: {meeting_data['created_at']}
Action Items: {json.dumps(meeting_data['action_items'], indent=2)}
Escalations: {json.dumps(meeting_data['escalations'], indent=2)}
Risks: {json.dumps(meeting_data['risks'], indent=2)}
Decisions: {json.dumps(meeting_data['decisions'], indent=2)}

Write a professional follow-up email with subject line, summary, decisions, action items, escalations, and next steps."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )
    return {"meeting_id": req.meeting_id, "email": response.choices[0].message.content}

@app.post("/api/slack/notify")
async def send_slack_notification(req: SlackRequest):
    import urllib.request
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM meetings WHERE id=?", (req.meeting_id,))
    m = c.fetchone()
    if not m:
        raise HTTPException(status_code=404, detail="Meeting not found")
    def fetch(table):
        c.execute(f"SELECT * FROM {table} WHERE meeting_id=?", (req.meeting_id,))
        return [dict(r) for r in c.fetchall()]
    action_items = fetch("action_items")
    escalations = fetch("escalations")
    risks = fetch("risks")
    conn.close()

    blocks = [
        {"type": "header", "text": {"type": "plain_text", "text": f"Meeting Summary: {m['title']}"}},
        {"type": "section", "text": {"type": "mrkdwn", "text": f"*Sentiment:* {m['sentiment']} | *Urgency:* {m['urgency_level']}"}},
    ]
    if escalations:
        esc_text = "\n".join([f"• {e['description']} (raised by: {e['raised_by']})" for e in escalations[:3]])
        blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": f"*Escalations:*\n{esc_text}"}})
    if action_items:
        ai_text = "\n".join([f"• {a['description']} -> {a['owner']} (by {a['deadline']})" for a in action_items[:3]])
        blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": f"*Action Items:*\n{ai_text}"}})
    if risks:
        risk_text = "\n".join([f"• {r['description']}" for r in risks[:3]])
        blocks.append({"type": "section", "text": {"type": "mrkdwn", "text": f"*Risks:*\n{risk_text}"}})

    payload = json.dumps({"blocks": blocks}).encode("utf-8")
    try:
        req_obj = urllib.request.Request(req.webhook_url, data=payload, headers={"Content-Type": "application/json"}, method="POST")
        with urllib.request.urlopen(req_obj, timeout=10) as response:
            return {"success": True, "message": "Slack notification sent successfully!"}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Slack error: {str(e)}")

@app.post("/api/query")
def natural_language_query(data: QueryInput):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    def fetch_all(table):
        c.execute(f"SELECT * FROM {table}")
        cols = [d[0] for d in c.description]
        return [dict(zip(cols, r)) for r in c.fetchall()]
    context = {k: fetch_all(k) for k in ["meetings","action_items","escalations","risks","blockers","decisions","stakeholders","projects"]}
    conn.close()

    prompt = f"""You are an AI assistant for a Meeting Intelligence System. Answer using only the data below.

Organizational Data:
{json.dumps(context, indent=2)}

User Question: {data.question}

Provide a clear, concise, structured answer."""

    response = client.chat.completions.create(
        model="llama-3.3-70b-versatile",
        messages=[{"role": "user", "content": prompt}]
    )
    return {"question": data.question, "answer": response.choices[0].message.content}

@app.patch("/api/action-items/{item_id}/status")
def update_action_status(item_id: str, data: UpdateStatusInput):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE action_items SET status=? WHERE id=?", (data.status, item_id))
    conn.commit()
    conn.close()
    return {"id": item_id, "status": data.status}

@app.patch("/api/escalations/{esc_id}/status")
def update_escalation_status(esc_id: str, data: UpdateStatusInput):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE escalations SET status=? WHERE id=?", (data.status, esc_id))
    conn.commit()
    conn.close()
    return {"id": esc_id, "status": data.status}

@app.patch("/api/blockers/{blocker_id}/status")
def update_blocker_status(blocker_id: str, data: UpdateStatusInput):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE blockers SET status=? WHERE id=?", (data.status, blocker_id))
    conn.commit()
    conn.close()
    return {"id": blocker_id, "status": data.status}