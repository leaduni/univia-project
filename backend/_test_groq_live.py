import os, json
from dotenv import load_dotenv
load_dotenv()
from openai import OpenAI

key = os.getenv('GROQ_API_KEY')
c = OpenAI(api_key=key, base_url='https://api.groq.com/openai/v1', timeout=30, max_retries=0)

models = c.models.list()
activos = [m.id for m in models.data]
print('TODOS LOS MODELOS:')
for a in activos:
    print(' -', a)
objetivos = ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'openai/gpt-oss-120b',
             'meta-llama/llama-4-maverick-17b-128e-instruct', 'meta-llama/llama-4-scout-17b-16e-instruct',
             'qwen/qwen3.8-27b', 'moonshotai/kimi-k2-instruct']
for m in objetivos:
    print(f'{m} activo: {m in activos}')

modelo_ok = next((m for m in objetivos if m in activos and 'llama' in m or m == 'openai/gpt-oss-120b'), 'openai/gpt-oss-120b')
r = c.chat.completions.create(
    model=modelo_ok,
    max_tokens=200,
    messages=[{'role': 'user', 'content': 'Responde solo con JSON: {"ok": true}'}],
    response_format={'type': 'json_object'},
)
print('JSON_OBJECT OK:', r.choices[0].message.content[:80], '| finish:', r.choices[0].finish_reason)
