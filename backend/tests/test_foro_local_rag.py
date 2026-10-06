import inspect


def test_foro_background_rag_task_is_async() -> None:
    import app.routers.foro as foro

    assert inspect.iscoroutinefunction(foro._generar_sugerencia_ia)
