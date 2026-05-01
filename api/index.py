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
# Guard against missing URL
DATABASE_URL = os.environ.get("POSTGRES_URL") 

if not DATABASE_URL:
    print("WARNING: POSTGRES_URL not found, falling back to SQLite")
    DATABASE_URL = "sqlite:///./database.db"
elif DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql://", 1)

# Create engine with a shorter timeout for serverless
engine = create_engine(DATABASE_URL, pool_pre_ping=True)

# --- MODELS ---
class Decision(SQLModel, table=True):
    __table_args__ = {"extend_existing": True} 
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str
    prompt: str
    risk_percentage: int
    worst_case: str
    likely_case: str
    healthy_outcome: str
    suggestions: str  
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

# --- APP SETUP ---
app = FastAPI()

app.add_middleware(
    CORSMiddleware, 
    allow_origins=["*"], 
    allow_methods=["*"], 
    allow_headers=["*"]
)

# Initialize Groq with a guard
GRO_KEY = os.environ.get("GROQ_API_KEY")
client = None
if GRO_KEY:
    client = Groq(api_key=GRO_KEY)

class DecisionRequest(BaseModel):
    prompt: str
    username: str

# --- ROUTES ---

@app.get("/api/python")
def hello():
    return {
        "status": "online",
        "database": "connected" if "postgresql" in DATABASE_URL else "sqlite",
        "ai_ready": client is not None
    }

@app.post("/api/predict")
async def analyze_decision(request: DecisionRequest):
    if not client:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY is not configured in Vercel")
    
    try:
        # Create tables right before we need them (Safe for Serverless)
        SQLModel.metadata.create_all(engine)

        completion = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are a World-Class Strategic Risk Consultant and Decision Scientist. "
                        "Your goal is to provide a brutal, data-driven analysis of the user's decision. "
                        "Follow these rules strictly:\n"
                        "1. Risk Percentage: Be precise. Use numbers like 67% or 12%, not just 50%.\n"
                        "2. Worst Case: Describe the 'Point of No Return'—what happens if everything fails.\n"
                        "3. Likely Case: Describe the most statistically probable outcome based on current trends.\n"
                        "4. Healthy Outcome: Define what success looks like with optimal execution.\n"
                        "5. Suggestions: Provide 5 non-obvious, high-impact steps to mitigate the specific risks mentioned.\n"
                        "6. Tone: Analytical, professional, and realistic. Do not give generic 'follow your heart' advice.\n"
                        "Return ONLY a JSON object with keys: "
                        "'risk_percentage' (int), 'worst_case' (str), 'likely_case' (str), "
                        "'healthy_outcome' (str), 'suggestions' (list of strings)."
                    )
                },
                {
                    "role": "user",
                    "content": f"Analyze this decision: {request.prompt}"
                }
            ],
            response_format={"type": "json_object"}
        )
        
        ai_data = json.loads(completion.choices[0].message.content)

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
        print(f"Prediction Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/api/history/{username}")
async def get_history(username: str):
    try:
        SQLModel.metadata.create_all(engine)
        with Session(engine) as session:
            statement = select(Decision).where(Decision.username == username).order_by(Decision.id.desc())
            results = session.exec(statement).all()
            
            return [{
                "id": r.id,
                "prompt": r.prompt,
                "risk_percentage": r.risk_percentage,
                "worst_case": r.worst_case,
                "likely_case": r.likely_case,
                "healthy_outcome": r.healthy_outcome,
                "suggestions": json.loads(r.suggestions),
                "timestamp": r.timestamp
            } for r in results]
    except Exception as e:
        print(f"History Error: {str(e)}")
        raise HTTPException(status_code=500, detail=str(e))