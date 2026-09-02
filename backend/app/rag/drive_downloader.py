"""Descarga segura de documentos PDF alojados en Google Drive."""

import os
import socket
import time
from pathlib import Path
from urllib.error import HTTPError, URLError

import gdown
from requests.exceptions import ConnectionError as RequestsConnectionError
from requests.exceptions import HTTPError as RequestsHTTPError
from requests.exceptions import Timeout
from urllib3.exceptions import NameResolutionError


class NetworkDownloadError(Exception):
    """La descarga no pudo completarse por un problema de red o DNS."""


class RecursoInaccesible(Exception):
    """El recurso no existe o el usuario no tiene permisos para descargarlo."""


class InvalidPdfError(Exception):
    """El contenido descargado no corresponde a un PDF válido."""


_HTTP_INACCESIBLE = {401, 403, 404, 410}


def _eliminar_archivo(path: Path) -> None:
    if path.exists():
        path.unlink()


def _clasificar_error(exc: Exception) -> Exception:
    if isinstance(exc, (socket.gaierror, NameResolutionError, RequestsConnectionError, Timeout, URLError)):
        return NetworkDownloadError(str(exc))

    if isinstance(exc, (HTTPError, RequestsHTTPError)):
        status_code = getattr(exc, "code", None)
        if status_code is None and getattr(exc, "response", None) is not None:
            status_code = exc.response.status_code
        if status_code in _HTTP_INACCESIBLE:
            return RecursoInaccesible(str(exc))

    return exc


def download_drive_file(drive_file_id, output_path, max_retries=3):
    """Descarga un PDF de Drive, confirma su firma y clasifica los errores."""
    output = Path(output_path)
    temporal = output.with_name(f"{output.name}.part")
    _eliminar_archivo(temporal)

    for intento in range(max_retries + 1):
        try:
            resultado = gdown.download(
                id=drive_file_id,
                output=str(temporal),
                quiet=True,
            )
            if not resultado:
                raise RecursoInaccesible(
                    f"No fue posible descargar el archivo de Drive: {drive_file_id}"
                )
            break
        except Exception as exc:
            error = _clasificar_error(exc)
            _eliminar_archivo(temporal)
            if not isinstance(error, NetworkDownloadError):
                raise error from exc
            if intento == max_retries:
                raise error from exc
            time.sleep(2**intento)

    try:
        with temporal.open("rb") as archivo:
            if archivo.read(5) != b"%PDF-":
                raise InvalidPdfError(
                    f"El archivo descargado de Drive no es un PDF válido: {drive_file_id}"
                )
        os.replace(temporal, output)
        return str(output)
    except InvalidPdfError:
        _eliminar_archivo(temporal)
        raise
    except OSError as exc:
        _eliminar_archivo(temporal)
        raise InvalidPdfError(
            f"No se pudo validar el PDF descargado de Drive: {drive_file_id}"
        ) from exc
