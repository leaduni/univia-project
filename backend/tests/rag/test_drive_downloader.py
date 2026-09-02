from pathlib import Path
from unittest.mock import Mock, patch

import pytest
from requests.exceptions import ConnectionError as RequestsConnectionError
from requests.exceptions import HTTPError as RequestsHTTPError

from app.rag.drive_downloader import (
    InvalidPdfError,
    NetworkDownloadError,
    RecursoInaccesible,
    download_drive_file,
)


def test_download_network_error_retry(tmp_path):
    with (
        patch(
            "app.rag.drive_downloader.gdown.download",
            side_effect=RequestsConnectionError("Fallo DNS"),
        ) as download_mock,
        patch("app.rag.drive_downloader.time.sleep") as sleep_mock,
        pytest.raises(NetworkDownloadError),
    ):
        download_drive_file("archivo-red", tmp_path / "archivo.pdf", max_retries=2)

    assert download_mock.call_count == 3
    assert sleep_mock.call_args_list[0].args == (1,)
    assert sleep_mock.call_args_list[1].args == (2,)


def test_download_inaccessible_no_retry(tmp_path):
    response = Mock(status_code=403)
    error = RequestsHTTPError("Forbidden", response=response)

    with (
        patch(
            "app.rag.drive_downloader.gdown.download",
            side_effect=error,
        ) as download_mock,
        patch("app.rag.drive_downloader.time.sleep") as sleep_mock,
        pytest.raises(RecursoInaccesible),
    ):
        download_drive_file("archivo-privado", tmp_path / "archivo.pdf")

    assert download_mock.call_count == 1
    sleep_mock.assert_not_called()


def test_download_invalid_pdf_content(tmp_path):
    output_path = tmp_path / "archivo.pdf"
    temporal = Path(f"{output_path}.part")

    def descargar_html(*_, output, **__):
        Path(output).write_text("<html>Acceso denegado</html>", encoding="utf-8")
        return output

    with (
        patch(
            "app.rag.drive_downloader.gdown.download",
            side_effect=descargar_html,
        ),
        pytest.raises(InvalidPdfError),
    ):
        download_drive_file("archivo-html", output_path)

    assert not temporal.exists()
    assert not output_path.exists()
