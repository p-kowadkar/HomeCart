from fastapi import FastAPI, Depends
from supabase import create_client, Client
import os
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(title="Cartographer Backend")

# Supabase Setup
url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

@app.get("/")
async def root():
    return {"message": "Cartographer API is running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

@app.get("/profile/{user_id}")
async def get_profile(user_id: str):
    response = supabase.table("profiles").select("*").eq("id", user_id).execute()
    return response.data[0] if response.data else {"error": "Profile not found"}
