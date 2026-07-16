import os
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_ANON_KEY")

if not url or not key:
    raise ValueError("SUPABASE_URL y SUPABASE_ANON_KEY deben estar configurados en el archivo .env")

supabase: Client = create_client(url, key)

def get_supabase(token: str = None):
    if token:
        # Create a new client for authenticated requests to ensure thread safety and correct auth context
        client = create_client(url, key)
        client.postgrest.auth(token)
        return client
    return supabase
