Overview

This project is an AI-powered Meeting Intelligence System that converts unstructured meeting notes, summaries, and transcripts into structured, searchable, and actionable insights.

It extracts important information like:

Tasks & Action Items
Owners & Stakeholders
Risks & Blockers
Escalations
Deadlines & Decisions
🚀 Problem Statement

In organizations, important meeting information is often lost in long transcripts and notes.

This system solves that problem by using Generative AI (LLMs) to automatically extract and organize key insights from meetings and make them searchable.

⚙️ Tech Stack
Python / Node.js (Backend)
FastAPI (API Layer)
Groq API / OpenAI API (LLM)
MongoDB / PostgreSQL (Database)
Neo4j (Optional for relationships)
React.js (Frontend - optional)
🏗️ System Workflow
User inputs meeting text (API / UI)
LLM processes and extracts entities
Data is structured into JSON format
Stored in database (SQL / NoSQL / Graph DB)
Users query using natural language
📥 API Endpoint
POST /process-meeting
Input:
{
  "meeting_text": "Vendor API is unstable. Rahul will fix it before Friday..."
}
Output:
{
  "project": "Payment Integration",
  "blocker": "Vendor API instability",
  "owner": "Rahul",
  "deadline": "Friday",
  "risk": "Delay in release",
  "escalation_by": "Priya"
}
💬 Features
AI-based information extraction
Structured JSON output
Natural language querying (future scope)
Relationship mapping (people, tasks, projects)
Risk & escalation tracking
📊 Use Cases
Project Management
Team Meeting Analysis
Enterprise Knowledge Tracking
Risk Monitoring
Task Accountability System
💡 Future Improvements
Chat-based query system
Real-time meeting assistant
Slack/Teams integration
Dashboard for leadership insights
Automatic task creation (Jira/Trello)

🏁 Goal

Convert unstructured meetings → structured intelligence → actionable insights

🔥 Short Advice (important)

Interview me
