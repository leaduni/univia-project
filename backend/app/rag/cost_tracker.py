"""Telemetría en memoria de uso y costo del pipeline RAG."""


class CostTracker:
    """Acumula métricas de procesamiento durante una sesión de ingesta."""

    COSTO_VISION_INPUT_POR_TOKEN = 0.0000004
    COSTO_VISION_OUTPUT_POR_TOKEN = 0.0000016
    COSTO_EMBEDDING_POR_TOKEN = 0.00000002

    def __init__(self) -> None:
        self.paginas_nativo = 0
        self.paginas_vision = 0
        self.tokens_vision_input = 0
        self.tokens_vision_output = 0
        self.tokens_embeddings = 0

    def registrar_vision(self, prompt_tokens: int, completion_tokens: int) -> None:
        self.paginas_vision += 1
        self.tokens_vision_input += prompt_tokens
        self.tokens_vision_output += completion_tokens

    def registrar_embeddings(self, tokens: int) -> None:
        self.tokens_embeddings += tokens

    def registrar_nativo(self, paginas: int) -> None:
        self.paginas_nativo += paginas

    def obtener_costo_total_usd(self) -> float:
        return (
            self.tokens_vision_input * self.COSTO_VISION_INPUT_POR_TOKEN
            + self.tokens_vision_output * self.COSTO_VISION_OUTPUT_POR_TOKEN
            + self.tokens_embeddings * self.COSTO_EMBEDDING_POR_TOKEN
        )


cost_tracker = CostTracker()
