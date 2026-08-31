import os
from supabase import create_client, Client, ClientOptions
from dotenv import load_dotenv

load_dotenv()

url: str = os.getenv("SUPABASE_URL")
key: str = os.getenv("SUPABASE_ANON_KEY")
service_key: str = os.getenv("SUPABASE_SERVICE_ROLE_KEY")

if not url or not key:
    raise ValueError("SUPABASE_URL y SUPABASE_ANON_KEY deben estar configurados en el archivo .env")

if not service_key:
    raise ValueError("SUPABASE_SERVICE_ROLE_KEY debe estar configurado en el archivo .env")

supabase: Client = create_client(url, key, options=ClientOptions(postgrest_client_timeout=120))

def get_supabase(token: str = None):
    if token:
        client = create_client(url, key, options=ClientOptions(postgrest_client_timeout=120))
        client.postgrest.auth(token)
        return client
    return supabase


def get_admin_client() -> Client:
    return create_client(url, service_key, options=ClientOptions(postgrest_client_timeout=120))
