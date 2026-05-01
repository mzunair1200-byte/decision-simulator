import os
import json
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
from sqlmodel import Field, SQLModel, create_engine, Session, select

load_dotenv()

# --- DATABASE CONFIGURATION ---
DATABASE_URL = os.environ.get("POSTGRES_URL") 
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    # Critical fix for SQLAlchemy 2.0+ compatibility with Vercel Postgres
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    # Fallback for local development
    DATABASE_URL = "sqlite:///./database.db"

# Create engine
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# --- MODELS ---
class Decision(SQLModel, table=True):
    # FIX: This prevents the "Table already defined" error on Vercel redeploys
    __table_args__ = {"extend_existing": True} 

    id: Optional[int] = Field(default=None, primary_key=True)
    username: str
    prompt: str
    risk_percentage: int
    worst_case: str
    likely_case: str
    healthy_outcome: str
    suggestions: str  # Stored as JSON string
    # FIX: Updated for Python 3.12 compatibility
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Create tables logic
def create_db_and_tables():
    SQLModel.metadata.create_all(engine)

# --- APP SETUP ---
app = FastAPI()

# Create tables on startup
@app.on_event("startup")
def on_startup():
    create_db_and_tables()

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# Initialize Groq
client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

class DecisionRequest(BaseModel):
    prompt: str
    username: str

# --- ROUTES ---

@app.get("/api/python")
def hello():
    return {"message": "Backend is active and database is connected!"}

@app.post("/api/predict")
async def analyze_decision(request: DecisionRequest):
    try:
        # 1. AI Analysis via Groq
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system", 
                    "content": "You are a risk analyst. Analyze the user's prompt and return ONLY a JSON object with keys: risk_percentage (int), worst_case (str), likely_case (str), healthy_outcome (str), suggestions (list of strings)."
                },
                {"role": "user", "content": request.prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        # Parse AI response
        ai_data = json.loads(completion.choices[0].message.content)

        # 2. Save to Database
        with Session(engine) as session:
            new_decision = Decision(
                username=request.username,
                prompt=request.prompt,
                risk_percentage=ai_data.get('risk_percentage', 0),
                worst_case=ai_data.get('worst_case', "N/A"),
                likely_case=ai_data.get('likely_case', "N/A"),
                healthy_outcome=ai_data.get('healthy_outcome', "N/A"),
                suggestions=json.dumps(ai_data.get('suggestions', []))
            )
            session.add(new_decision)
            session.commit()
            session.refresh(new_decision)

        return ai_data

    except Exception as e:
        print(f"Error during prediction: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history/{username}")
async def get_history(username: str):
    try:
        with Session(engine) as session:
            # Query history for the specific user
            statement = select(Decision).where(Decision.username == username).order_by(Decision.id.desc())
            results = session.exec(statement).all()
            
            # Prepare data for frontend
            history_list = []
            for r in results:
                history_list.append({
                    "id": r.id,
                    "prompt": r.prompt,
                    "risk_percentage": r.risk_percentage,
                    "worst_case": r.worst_case,
                    "likely_case": r.likely_case,
                    "healthy_outcome": r.healthy_outcome,
                    "suggestions": json.loads(r.suggestions),
                    "timestamp": r.timestamp
                })
            return history_list
    except Exception as e:
        print(f"Error fetching history: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))