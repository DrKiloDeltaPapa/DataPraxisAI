import os
from server.config import get_settings
from server.rag.seagate import SeagateRag
from server.rag.local import LocalRag
#from server.rag.agent import AgentRag  # stub for future

class DimensionMismatch(Exception):
    pass
class LakehouseUnavailable(Exception):
    pass

class RagClient:
    def __init__(self, settings=None):
        self.settings = settings or get_settings()
        mode = self.settings.rag_mode.lower()
        if mode == "seagate":
            self.backend = SeagateRag(self.settings)
        elif mode == "local":
            self.backend = LocalRag(self.settings)
        else:
            raise NotImplementedError(f"RAG_MODE '{mode}' not supported yet")

    def search(self, query, top_k=None):
        return self.backend.search(query, top_k=top_k)
