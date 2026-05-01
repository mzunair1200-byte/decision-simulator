🚀 StrategyEngine: AI-Powered Decision Simulator
StrategyEngine is a full-stack Decision Support System (DSS) that uses advanced AI to simulate potential outcomes and calculate risk factors for any scenario. Whether you're considering a business pivot, a financial investment, or a career move, StrategyEngine provides a data-driven "Strategic Audit" to help you decide.
![alt text](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)

![alt text](https://img.shields.io/badge/FastAPI-Python-009688?style=flat-square&logo=fastapi)

![alt text](https://img.shields.io/badge/AI-Llama_3.3_70B-orange?style=flat-square)

![alt text](https://img.shields.io/badge/Database-Vercel_Postgres-blue?style=flat-square&logo=postgresql)
✨ Features
Strategic Risk Audit: Generates a precise Risk Percentage and simulates "Worst Case," "Likely Case," and "Healthy Outcome" scenarios.
AI-Driven Insights: Powered by Llama 3.3 70B via Groq for ultra-fast, professional-grade strategic advice.
Audit Trail: Automatically saves simulation history to Vercel Postgres so users can track their decision logic over time.
Professional Dashboard: A sleek, modern UI built with Next.js, Tailwind CSS, and Framer Motion for smooth animations.
One-Click Share: Easily copy your strategic report to the clipboard to share with team members or advisors.
🛠️ Tech Stack
Frontend
Framework: Next.js 15 (App Router)
Styling: Tailwind CSS + Lucide Icons
Animations: Framer Motion
Authentication: Local-storage based User Management (MVP)
Backend
Framework: FastAPI (Python 3.12)
AI Inference: Groq SDK (Llama 3.3 70B Model)
ORM: SQLModel (SQLAlchemy 2.0 based)
Database: Vercel Postgres (Serverless)
🏗️ Architecture
The application is built as a monorepo optimized for Vercel:
The /frontend (root) handles the user interface and client-side logic.
The /api folder contains the Python serverless functions that interact with the Groq AI and the PostgreSQL database.
Traffic is routed via vercel.json rewrites.
🚀 Installation & Setup
1. Clone the repo
code
Bash
git clone https://github.com/your-username/decision-simulator.git
cd decision-simulator
2. Frontend Setup
code
Bash
npm install
npm run dev
3. Backend Setup
code
Bash
cd api
python -m venv venv
source venv/bin/activate  # Or .\venv\Scripts\activate on Windows
pip install -r requirements.txt
python -m uvicorn index:app --reload
4. Environment Variables
Create a .env file in the root:
code
Text
GROQ_API_KEY=your_key
POSTGRES_URL=your_vercel_postgres_url
📈 Roadmap

Implement Google OAuth (NextAuth.js)

Export analysis as PDF reports

Add Multi-variable "What If" scenarios

Visual Risk Matrix charts (High Impact vs High Probability)
🤝 Contributing
Contributions are welcome! Feel free to open an issue or submit a pull request.
📝 License
Distributed under the MIT License.
Developed with ❤️ by MUHAMMAD ZUNAIR 
