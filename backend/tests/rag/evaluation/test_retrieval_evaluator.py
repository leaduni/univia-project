from app.rag.evaluation.retrieval import EvaluationCase, evaluate_retrieval


def test_evaluator_scores_positive_and_unanswerable_cases() -> None:
    cases = [
        EvaluationCase("q1", "regla de la cadena", frozenset({"b"}), frozenset({2})),
        EvaluationCase("q2", "tema inexistente", frozenset(), frozenset()),
    ]
    rankings = {
        "q1": [
            {"id": "a", "recurso_id": 1, "similarity": 0.8},
            {"id": "b", "recurso_id": 2, "similarity": 0.7},
        ],
        "q2": [],
    }

    report = evaluate_retrieval(cases, rankings, k=2)

    assert report["positive_cases"] == 1
    assert report["unanswerable_cases"] == 1
    assert report["recall_at_k"] == 1.0
    assert report["precision_at_k"] == 0.5
    assert report["mrr_at_k"] == 0.5
    assert report["resource_hit_rate"] == 1.0
    assert report["unanswerable_false_positive_rate"] == 0.0
    assert report["mean_top_similarity"] == 0.8


def test_evaluator_counts_negative_results_as_false_positives() -> None:
    cases = [EvaluationCase("q1", "tema inexistente", frozenset(), frozenset())]

    report = evaluate_retrieval(cases, {"q1": [{"id": "a", "recurso_id": 1, "similarity": 0.6}]})

    assert report["unanswerable_false_positive_rate"] == 1.0
    assert report["positive_cases"] == 0
