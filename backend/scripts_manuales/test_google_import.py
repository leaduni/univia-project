try:
    from google import genai
    print("Import successful! Version:", genai.__version__ if hasattr(genai, '__version__') else "unknown")
except ImportError as e:
    print(f"Import failed: {e}")
except Exception as e:
    print(f"Other error: {e}")
