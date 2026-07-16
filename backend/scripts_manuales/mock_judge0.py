from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
import uvicorn
import json

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/submissions")
async def create_submission(request: Request):
    body = await request.json()
    source_code = body.get("source_code", "")
    
    # Simple mock: if it's the test case or a print statement, return the expected result.
    # We can just return exactly what's inside the print statement for simplicity.
    stdout_val = "True\n"
    if "10+10" in source_code:
        stdout_val = "20\n"
    elif "Hola" in source_code:
        stdout_val = "Hola\n"

    return {
        "stdout": stdout_val,
        "time": "0.010",
        "memory": 1024,
        "stderr": None,
        "token": "fake-token-12345",
        "compile_output": None,
        "message": None,
        "status": {
            "id": 3,
            "description": "Accepted"
        }
    }

if __name__ == "__main__":
    uvicorn.run(app, host="127.0.0.1", port=2358)
