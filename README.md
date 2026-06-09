 🧠 MeetingIQ — AI-Powered Meeting Intelligence System

Convert unstructured meeting discussions into structured, queryable organizational intelligence using Generative AI.

---

## 🚀 Features

| Feature | Description |
|--------|-------------|
| **Meeting Ingestion** | Paste transcripts, summaries, or upload `.txt`/`.md` files |
| **AI Extraction** | Automatically extracts projects, action items, escalations, risks, decisions, blockers, and stakeholders |
| **Structured Storage** | SQLite database with relational linking between meetings and extracted entities |
| **Natural Language Query** | Ask questions like "Show all blockers assigned to Rahul" |
| **Dashboard** | Real-time org-wide stats — open escalations, active blockers, pending actions |
| **Status Tracking** | Resolve escalations, complete action items — directly in the UI |
| **Example Data** | One-click load of 3 realistic example meetings |

---

## 📁 Project Structure

```
meeting-intelligence/
├── backend/
│   ├── main.py              # FastAPI app with all endpoints
│   ├── requirements.txt
│   └── meetings.db          # SQLite database (auto-created)
├── frontend/
│   ├── src/
|    |   ├── App.js       
│   │   ├── App.jsx          # Full React UI
│   │   └── index.js
│   ├── public/index.html
│   └── package.json
└── README.md
```

---

## ⚙️ Setup & Run

### Prerequisites
- Python 3.9+
- Node.js 18+
- An **Anthropic API key**

---

### 1. Backend Setup

```bash
cd backend

# Install dependencies
pip install -r requirements.txt

# Set your Anthropic API key
export ANTHROPIC_API_KEY=sk-ant-...

# Start the server
uvicorn main:app --reload --port 8000
```

The API will be available at `http://localhost:8000`  
Interactive docs: `http://localhost:8000/docs`

---

### 2. Frontend Setup

```bash
cd frontend

# Install dependencies
npm install

# Start the app
npm start
```

The UI will open at `http://localhost:3000`

---

## 📡 API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/meetings/ingest` | Ingest raw meeting text |
| `POST` | `/api/meetings/ingest/file` | Upload .txt/.md file |
| `GET` | `/api/meetings/example/load` | Load 3 example meetings |
| `GET` | `/api/meetings` | List all meetings |
| `GET` | `/api/meetings/{id}` | Full meeting detail with extracted data |
| `GET` | `/api/dashboard` | Org-wide stats and summaries |
| `GET` | `/api/escalations` | All escalations (filter by status) |
| `GET` | `/api/action-items` | All action items (filter by owner/priority/status) |
| `GET` | `/api/risks` | All identified risks |
| `GET` | `/api/blockers` | Active blockers |
| `POST` | `/api/query` | Natural language query over all data |
| `PATCH` | `/api/action-items/{id}/status` | Update action item status |
| `PATCH` | `/api/escalations/{id}/status` | Resolve an escalation |
| `PATCH` | `/api/blockers/{id}/status` | Update blocker status |

---

## 🧪 Example Meeting Input

```
The payment integration is delayed because the Vendor API is unstable. 
Rahul will coordinate with the backend team before Friday. If this issue continues, 
it may impact the Phase-2 release. Priya escalated the concern to leadership.
Anika from DevOps will set up monitoring alerts for API uptime by Wednesday.
```

### AI Extracted Output:
- **Project:** Payment Integration
- **Blocker:** Vendor API instability (Owner: Rahul, Deadline: Friday)
- **Risk:** Delay in Phase-2 release (Impact: High)
- **Escalation:** Raised by Priya → Leadership
- **Action Item:** Monitoring alerts (Owner: Anika, Deadline: Wednesday)
- **Stakeholders:** Rahul, Priya, Anika, Backend Team, DevOps

---

## 💡 Natural Language Queries

- "What are the current unresolved escalations?"
- "Show all pending tasks assigned to Rahul"
- "Which projects are at risk this week?"
- "List all high-priority blockers across teams"
- "Who raised the most escalations?"
- "What decisions were made in the last meeting?"

---

## 🏗️ Architecture

```
User Input (text/file)
        ↓
FastAPI Backend (/api/meetings/ingest)
        
        ↓
Structured JSON (projects, actions, escalations, risks, decisions, blockers, stakeholders)
        ↓
SQLite Database (relational storage)
        ↓
React Dashboard (visualization, filtering, querying)
        ↓
Natural Language Query (Claude reads DB → answers questions)
```

---

## 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| AI Model | Anthropic Claude (claude-opus-4-5) |
| Backend | FastAPI + Python |
| Database | SQLite (drop-in, zero config) |
| Frontend | React 18 |
| Styling | Pure CSS-in-JS (no dependencies) |

---

## 📦 Bonus Capabilities Included

- ✅ File upload ingestion (.txt, .md)
- ✅ Example data loader (3 realistic meetings)
- ✅ Status management (resolve, complete, track)
- ✅ Natural language query with full DB context
- ✅ Cross-meeting analytics dashboard
- ✅ Priority-based filtering and sorting
