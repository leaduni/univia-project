import json
from pathlib import Path

from scripts.rag.run_dimension_benchmark import pending_dimensions, save_checkpoint


def test_checkpoint_skips_completed_dimensions_and_keeps_new_results(tmp_path: Path) -> None:
    output = tmp_path / "dimension_benchmark.json"
    save_checkpoint(output, cases=17, results=[{"dimensions": 256, "recall_at_10": 0.5}])

    pending = pending_dimensions(output, requested=[256, 512, 768])

    assert pending == [512, 768]
    assert json.loads(output.read_text(encoding="utf-8"))["results"] == [
        {"dimensions": 256, "recall_at_10": 0.5}
    ]
