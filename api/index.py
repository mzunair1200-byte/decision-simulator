import os
import json
from datetime import datetime
from typing import List, Optional
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from groq import Groq
from dotenv import load_dotenv
from sqlmodel import Field, SQLModel, create_engine, Session, select

load_dotenv()
from datetime import datetime, timezone # Update this import

# ... (Database config stays the same)

class Decision(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str
    prompt: str
    risk_percentage: int
    worst_case: str
    likely_case: str
    healthy_outcome: str
    suggestions: str 
    # Use timezone-aware UTC
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# Create tables logic
@app.on_event("startup")
def on_startup():
    SQLModel.metadata.create_all(engine)

# --- DATABASE CONFIGURATION ---
# Vercel provides POSTGRES_URL. Locally, we use SQLite.
DATABASE_URL = os.environ.get("POSTGRES_URL") 
if DATABASE_URL and DATABASE_URL.startswith("postgres://"):
    # Fix for SQLAlchemy/Postgres compatibility
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)
else:
    DATABASE_URL = "sqlite:///./database.db"

# Create engine (use_follower is a Postgres-only optimization, safe to ignore)
engine = create_engine(DATABASE_URL)

class Decision(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str
    prompt: str
    risk_percentage: int
    worst_case: str
    likely_case: str
    healthy_outcome: str
    suggestions: str  # Stored as JSON string
    timestamp: datetime = Field(default_factory=datetime.utcnow)

# Create tables if they don't exist
SQLModel.metadata.create_all(engine)

# --- APP SETUP ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"]
)

client = Groq(api_key=os.environ.get("GROQ_API_KEY"))

class DecisionRequest(BaseModel):
    prompt: str
    username: str

# --- ROUTES ---

@app.get("/api/python")
def hello():
    return {"message": "Backend is active!"}

@app.post("/api/predict")
async def analyze_decision(request: DecisionRequest):
    try:
        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": "Analyze and return JSON: risk_percentage(int), worst_case(str), likely_case(str), healthy_outcome(str), suggestions(list)."},
                {"role": "user", "content": request.prompt}
            ],
            response_format={"type": "json_object"}
        )
        
        data = json.loads(completion.choices[0].message.content)

        # SAVE TO DATABASE
        new_decision = Decision(
            username=request.username,
            prompt=request.prompt,
            risk_percentage=data['risk_percentage'],
            worst_case=data['worst_case'],
            likely_case=data['likely_case'],
            healthy_outcome=data['healthy_outcome'],
            suggestions=json.dumps(data['suggestions'])
        )
        
        with Session(engine) as session:
            session.add(new_decision)
            session.commit()
            session.refresh(new_decision)

        return data
    except Exception as e:
        print(f"Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history/{username}")
async def get_history(username: str):
    try:
        with Session(engine) as session:
            statement = select(Decision).where(Decision.username == username).order_by(Decision.timestamp.desc())
            results = session.exec(statement).all()
            
            # Clean up the JSON suggestions back into lists for the frontend
            clean_results = []
            for r in results:
                item = r.dict()
                item['suggestions'] = json.loads(r.suggestions)
                clean_results.append(item)
            return clean_results
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))