"""
LLM service for blog synthesis.

Supports:
1. Ollama (local, free) - preferred
2. OpenAI (cloud, paid) - fallback
3. Mock (template-based) - development fallback
"""

import os
import logging
import httpx
from typing import Optional

logger = logging.getLogger(__name__)

# ============================================================
# CONFIGURATION
# ============================================================

LLM_MODE = os.getenv('LLM_MODE', 'ollama').lower()  # ollama, openai, mock
LLM_URL = os.getenv('LLM_URL', 'http://127.0.0.1:11434')  # Ollama default
LLM_MODEL = os.getenv("OLLAMA_MODEL") or os.getenv("LLM_MODEL", "llama3.1:8b")  # Ollama model
OPENAI_API_KEY = os.getenv('OPENAI_API_KEY', '')


# ============================================================
# OLLAMA INTERFACE
# ============================================================

def call_ollama(prompt: str, model: str = LLM_MODEL) -> Optional[str]:
    """
    Call local Ollama instance.
    
    Args:
        prompt: Full prompt for LLM
        model: Model name (e.g., 'llama3.1:8b', 'llama3:latest', 'qwen2.5-coder:7b')
    
    Returns:
        Generated text or None if failed
    """
    try:
        with httpx.Client(timeout=120) as client:  # Blog generation can take 30-60s
            response = client.post(
                f"{LLM_URL}/api/generate",
                json={
                    "model": model,
                    "prompt": prompt,
                    "stream": False,
                },
            )
            
            if response.status_code == 200:
                data = response.json()
                return data.get("response", "").strip()
            else:
                logger.error(f"Ollama returned {response.status_code}: {response.text}")
                return None
                
    except httpx.ConnectError:
        logger.warning(f"Could not connect to Ollama at {LLM_URL}. Is it running?")
        return None
    except Exception as e:
        logger.error(f"Ollama error: {e}")
        return None


# ============================================================
# OPENAI INTERFACE
# ============================================================

def call_openai(prompt: str, model: str = "gpt-3.5-turbo") -> Optional[str]:
    """
    Call OpenAI API.
    
    Args:
        prompt: Full prompt for LLM
        model: OpenAI model name
    
    Returns:
        Generated text or None if failed
    """
    if not OPENAI_API_KEY:
        logger.warning("OPENAI_API_KEY not set; cannot use OpenAI mode")
        return None
    
    try:
        import openai
        openai.api_key = OPENAI_API_KEY
        
        response = openai.ChatCompletion.create(
            model=model,
            messages=[
                {"role": "system", "content": "You are a professional blog writer."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.7,
            max_tokens=2000,
        )
        
        return response.choices[0].message.content.strip()
        
    except Exception as e:
        logger.error(f"OpenAI error: {e}")
        return None


# ============================================================
# MOCK INTERFACE (Fallback)
# ============================================================

def call_mock(prompt: str) -> str:
    """
    Generate mock blog content (template-based).
    
    Used when LLM services unavailable.
    """
    return """
## Introduction
This is a blog post generated in mock mode because no LLM service was available.

The system attempted to use RAG (Retrieval-Augmented Generation) to find relevant context,
but since the LLM synthesis layer was unavailable, a template response is shown instead.

### What Happened
1. Your search query was embedded and sent to the vector store
2. Relevant chunks were retrieved from the database
3. These chunks would normally be used to synthesize a real blog post via LLM
4. Since the LLM is offline, you're seeing this placeholder

### Next Steps
- **On Mac**: Start Ollama (`ollama run llama2`) and try again
- **On Borg1**: The system will use local Ollama or configured LLM
- **In Production**: Configure OpenAI API key for reliable synthesis

### To Fix This
1. Install Ollama: https://ollama.ai
2. Run: `ollama run llama2`
3. Reload the admin page and try generating again

---
*This message appears when no LLM service is available. Configure LLM_MODE in .env to use Ollama or OpenAI.*
"""


# ============================================================
# UNIFIED LLM CLIENT
# ============================================================

def generate_blog(
    topic: str,
    context_snippets: str,
    audience: str = "general",
    length: str = "medium",
) -> str:
    """
    Generate a blog post using available LLM.
    
    Args:
        topic: Blog topic/title
        context_snippets: Retrieved context from RAG
        audience: Target audience (general, technical, business)
        length: Desired length (short, medium, long)
    
    Returns:
        Generated blog post markdown
    """
    
    # Build prompt
    length_guidance = {
        "short": "200-400 words",
        "medium": "600-900 words",
        "long": "1200-1500 words",
    }.get(length, "600-900 words")
    
    audience_guidance = {
        "general": "Use simple, accessible language for a general audience.",
        "technical": "Use technical terminology and assume knowledge of the field.",
        "business": "Focus on business value, ROI, and practical applications.",
    }.get(audience, "Use accessible language.")
    
    prompt = f"""Write a professional blog post based on the following information:

**Topic**: {topic}

**Target Audience**: {audience}
{audience_guidance}

**Desired Length**: {length_guidance}

**Source Material** (use this as context):
{context_snippets}

**Requirements**:
- Write in markdown format
- Include a compelling title and introduction
- Use the provided source material as context
- Add section headers for clarity
- Include a brief conclusion
- Do NOT make up facts; only use information from the source material

Please write the blog post now:"""

    # Try LLM modes in order of preference
    logger.info(f"Attempting to generate blog via {LLM_MODE}...")
    
    result = None
    
    if LLM_MODE == 'ollama':
        result = call_ollama(prompt)
        if result:
            logger.info("Successfully generated blog via Ollama")
            return result
        # Fall through to other modes
        logger.warning("Ollama failed; trying OpenAI...")
    
    if LLM_MODE == 'openai' or not result:
        result = call_openai(prompt)
        if result:
            logger.info("Successfully generated blog via OpenAI")
            return result
        # Fall through to mock
        logger.warning("OpenAI failed; using mock...")
    
    # Final fallback: mock
    logger.warning("All LLM services unavailable; using mock template")
    return call_mock(prompt)


def check_ollama_availability() -> bool:
    """Check if Ollama is running and accessible."""
    try:
        with httpx.Client(timeout=5) as client:
            response = client.get(f"{LLM_URL}/api/tags")
            return response.status_code == 200
    except:
        return False
