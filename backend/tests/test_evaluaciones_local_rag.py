import pytest


@pytest.mark.asyncio
async def test_recuperar_contexto_uses_async_retriever(monkeypatch) -> None:
    import app.routers.evaluaciones as evaluaciones

    class FakeRetriever:
        async def buscar_contexto_por_nombre_async(self, *args, **kwargs):
            assert args[0] == "derivadas"
            assert kwargs["curso_nombre"] == "Cálculo I"
            return [{"contenido": "regla de la cadena"}]

    monkeypatch.setattr(evaluaciones, "get_retriever", lambda token: FakeRetriever())
    monkeypatch.setattr(evaluaciones, "obtener_nombre_curso", lambda curso_id, token: "Cálculo I")

    rows = await evaluaciones.recuperar_contexto_semantico("derivadas", 20, token="token")

    assert rows == [{"contenido": "regla de la cadena"}]


@pytest.mark.asyncio
async def test_recuperar_contexto_keeps_the_three_best_ranked_sources(monkeypatch) -> None:
    import app.routers.evaluaciones as evaluaciones

    class FakeRetriever:
        async def buscar_contexto_por_nombre_async(self, *args, **kwargs):
            return [
                {"id": str(index), "contenido": f"Fragmento {index}", "similarity": 1 - index / 10}
                for index in range(4)
            ]

    monkeypatch.setattr(evaluaciones, "get_retriever", lambda token: FakeRetriever())
    monkeypatch.setattr(evaluaciones, "obtener_nombre_curso", lambda curso_id, token: "Cálculo I")

    rows = await evaluaciones.recuperar_contexto_semantico("derivadas", 20)

    assert [row["id"] for row in rows] == ["0", "1", "2"]


@pytest.mark.asyncio
async def test_recuperar_contexto_falls_back_to_course_id_when_name_is_unavailable(monkeypatch) -> None:
    import app.routers.evaluaciones as evaluaciones

    class FakeRetriever:
        async def buscar_contexto_async(self, *args, **kwargs):
            assert args[0] == "derivadas"
            assert kwargs["curso_id"] == 20
            assert kwargs["profesor_id"] == 7
            assert kwargs["estricto"] is True
            return [{"curso_id": 20, "contenido": "regla de la cadena"}]

        async def buscar_contexto_por_nombre_async(self, *args, **kwargs):
            pytest.fail("No debe buscar sin filtro de curso")

    monkeypatch.setattr(evaluaciones, "get_retriever", lambda token: FakeRetriever())
    monkeypatch.setattr(evaluaciones, "obtener_nombre_curso", lambda curso_id, token: None)

    rows = await evaluaciones.recuperar_contexto_semantico(
        "derivadas", 20, profesor_id=7, token="token",
    )

    assert rows == [{"curso_id": 20, "contenido": "regla de la cadena"}]
