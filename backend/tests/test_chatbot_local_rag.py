import pytest


@pytest.mark.asyncio
async def test_async_duda_handler_uses_local_retriever(monkeypatch) -> None:
    import app.chatbot.handlers as handlers
    import app.rag.retriever as retriever_module

    class FakeRetriever:
        def __init__(self, *, token: str) -> None:
            assert token == "token"

        async def buscar_contexto_async(self, pregunta: str, **kwargs):
            assert pregunta == "explica derivadas"
            assert kwargs["curso_id"] == 20
            assert kwargs["limit"] == handlers.MAX_CANDIDATOS_RAG * handlers.MAX_CHUNKS_POR_RECURSO_CON_CURSO
            return [
                {
                    "recurso_id": 7,
                    "curso_id": 20,
                    "contenido": "La derivada mide la razón de cambio.",
                    "similarity": 0.9,
                    "curso_nombre": "Cálculo I",
                    "titulo_recurso": "Semana 1",
                    "tipo_recurso": "Separata",
                    "profesor": "Ada",
                    "metadata": {},
                }
            ]

    monkeypatch.setattr(retriever_module, "SyllabusRetriever", FakeRetriever)
    monkeypatch.setattr(handlers, "rag_store_name", lambda: "postgres")
    monkeypatch.setattr(handlers, "_cursos_de_la_facultad", lambda supabase, user: [{"id": 20}])
    monkeypatch.setattr(handlers, "_detectar_curso", lambda mensaje, cursos: {"id": 20})
    monkeypatch.setattr(handlers, "_resolver_profesor", lambda mensaje, supabase: None)

    contexto = await handlers._handler_duda_academica_async(
        "explica derivadas", object(), object(), "token"
    )

    assert "La derivada mide la razón de cambio." in contexto.bloque
    assert contexto.adjuntos["fragmentos"] == 1
    assert "no añadas afirmaciones técnicas que el material no respalde" in contexto.system_extra
    assert "Si el material basta, no añadas información externa" in contexto.system_extra
    assert "contesta en una o dos frases y termina después de citarla" in contexto.system_extra
    assert "No ofrezcas recomendaciones, remedios, ejemplos ni preguntas" in contexto.system_extra
    assert "complétalo con tu conocimiento" not in contexto.system_extra


@pytest.mark.asyncio
async def test_supabase_chatbot_search_schedules_shadow_with_same_embedding(monkeypatch) -> None:
    from types import SimpleNamespace

    import app.chatbot.handlers as handlers
    import app.rag.retriever as retriever_module

    rows = [{
        "id": "chunk-1", "recurso_id": 7, "curso_id": 20,
        "contenido": "La derivada mide la razón de cambio.", "similarity": 0.8,
        "curso_nombre": "Cálculo I", "titulo_recurso": "Semana 1",
        "tipo_recurso": "Separata", "metadata": {},
    }]
    calls = {}

    class FakeSupabase:
        def rpc(self, name, params):
            calls["rpc"] = (name, params)
            return self

        def execute(self):
            return SimpleNamespace(data=rows)

    class FakeRetriever:
        def __init__(self, *, token):
            self.supabase = FakeSupabase()

        def vectorizar_pregunta(self, pregunta):
            calls["query"] = pregunta
            return [0.25] * 1536

        def schedule_shadow_read(self, *args, **kwargs):
            calls["shadow"] = (args, kwargs)

    monkeypatch.setattr(retriever_module, "SyllabusRetriever", FakeRetriever)
    monkeypatch.setattr(handlers, "rag_store_name", lambda: "supabase")
    monkeypatch.setattr(handlers, "_cursos_de_la_facultad", lambda supabase, user: [{"id": 20}])
    monkeypatch.setattr(handlers, "_detectar_curso", lambda mensaje, cursos: {"id": 20})
    monkeypatch.setattr(handlers, "_resolver_profesor", lambda mensaje, supabase: None)

    contexto = await handlers._handler_duda_academica_async(
        "explica derivadas", object(), object(), "token"
    )

    rpc_name, params = calls["rpc"]
    assert rpc_name == "search_chatbot_resource_chunks"
    assert params["query_text"] == "explica derivadas"
    assert params["filter_curso_id"] == 20
    assert calls["shadow"][0][1] == [0.25] * 1536
    assert calls["shadow"][1]["max_chunks_per_resource"] == handlers.MAX_CHUNKS_POR_RECURSO_CON_CURSO
    assert contexto.adjuntos["fragmentos"] == 1


@pytest.mark.asyncio
async def test_supabase_async_dispatch_routes_academic_doubt_to_shadow_capable_handler(monkeypatch) -> None:
    import app.chatbot.handlers as handlers
    from app.chatbot import intents

    async def fake_handler(*args, **kwargs):
        return handlers.Contexto(bloque="supabase primary + shadow")

    monkeypatch.setattr(handlers, "rag_store_name", lambda: "supabase")
    monkeypatch.setattr(handlers, "_handler_duda_academica_async", fake_handler)
    monkeypatch.setattr(
        handlers,
        "construir_contexto",
        lambda *args, **kwargs: pytest.fail("La ruta académica debe ser asíncrona para programar shadow-read"),
    )

    contexto = await handlers.construir_contexto_async(
        intents.DUDA_ACADEMICA, "explica derivadas", object(), object(), "token"
    )

    assert contexto.bloque == "supabase primary + shadow"


@pytest.mark.asyncio
async def test_async_context_dispatches_duda_to_local_handler(monkeypatch) -> None:
    import app.chatbot.handlers as handlers
    from app.chatbot import intents

    async def fake_local_handler(*args, **kwargs):
        return handlers.Contexto(bloque="resultado local")

    monkeypatch.setattr(handlers, "rag_store_name", lambda: "postgres")
    monkeypatch.setattr(handlers, "_handler_duda_academica_async", fake_local_handler)

    contexto = await handlers.construir_contexto_async(
        intents.DUDA_ACADEMICA, "explica derivadas", object(), object(), "token"
    )

    assert contexto.bloque == "resultado local"


@pytest.mark.asyncio
async def test_confirmed_resource_uses_local_chunks(monkeypatch) -> None:
    import app.chatbot.handlers as handlers
    import app.rag.retriever as retriever_module

    class FakeRetriever:
        def __init__(self, *, token: str):
            pass

        async def buscar_contexto_async(self, mensaje: str, **kwargs):
            assert kwargs["recurso_id"] == 7
            assert kwargs["umbral_similitud"] == 0.0
            return [{"recurso_id": 7, "curso_id": 20, "contenido": "Texto local",
                     "metadata": {}, "titulo_recurso": "PC", "curso_nombre": "Cálculo I"}]

    monkeypatch.setattr(retriever_module, "SyllabusRetriever", FakeRetriever)
    monkeypatch.setattr(handlers, "_resolver_profesor", lambda mensaje, supabase: None)
    monkeypatch.setattr(handlers, "_fragmentos_recurso_exacto", lambda *args: pytest.fail("Acceso legado a Supabase"))

    contexto = await handlers._handler_duda_academica_async(
        "explícame esta práctica", object(), object(), "token",
        recurso_id_forzado=7,
    )

    assert "Texto local" in contexto.bloque


@pytest.mark.asyncio
async def test_docentes_fallback_runs_local_rag_on_main_loop(monkeypatch) -> None:
    import asyncio
    import app.chatbot.handlers as handlers
    from app.chatbot import intents

    main_loop = asyncio.get_running_loop()
    calls = []

    def fake_relational_handler(mensaje, supabase, user, token, **kwargs):
        assert kwargs["rag_fallback"] is not None
        rag = kwargs["rag_fallback"](
            mensaje, supabase, user, token, curso_id_forzado=20
        )
        return handlers.Contexto(bloque=f"Docentes\n{rag.bloque}")

    async def fake_local_rag(*args, **kwargs):
        assert asyncio.get_running_loop() is main_loop
        calls.append(kwargs)
        return handlers.Contexto(bloque="chunk en PostgreSQL")

    monkeypatch.setattr(handlers, "rag_store_name", lambda: "postgres")
    monkeypatch.setattr(handlers, "_handler_consulta_docentes", fake_relational_handler)
    monkeypatch.setattr(handlers, "_handler_duda_academica_async", fake_local_rag)

    contexto = await handlers.construir_contexto_async(
        intents.CONSULTA_DOCENTES, "docente de cálculo", object(), object(), "token"
    )

    assert "chunk en PostgreSQL" in contexto.bloque
    assert calls[0]["curso_id_forzado"] == 20
    assert calls[0]["fallback_relacional"] is True


@pytest.mark.asyncio
async def test_open_resource_fallback_runs_local_rag(monkeypatch) -> None:
    import app.chatbot.handlers as handlers
    from app.chatbot import intents

    def fake_resource_handler(mensaje, supabase, user, token, **kwargs):
        return kwargs["rag_fallback"](mensaje, supabase, user, token)

    async def fake_local_rag(*args, **kwargs):
        return handlers.Contexto(bloque="recurso en PostgreSQL")

    monkeypatch.setattr(handlers, "rag_store_name", lambda: "postgres")
    monkeypatch.setattr(handlers, "_handler_recurso", fake_resource_handler)
    monkeypatch.setattr(handlers, "_handler_duda_academica_async", fake_local_rag)

    contexto = await handlers.construir_contexto_async(
        intents.RECURSO, "quiero material", object(), object(), "token"
    )

    assert contexto.bloque == "recurso en PostgreSQL"
