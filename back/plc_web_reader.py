#!/usr/bin/env python3
"""Чтение данных с ПЛК Siemens через встроенный Web Server (JSON-RPC API)."""

from __future__ import annotations

import argparse
import json
import logging
import os
import re
import sys
import time
from dataclasses import dataclass
from http.cookiejar import MozillaCookieJar
from pathlib import Path
from typing import Any
from urllib.parse import quote

import requests
import urllib3
import yaml

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

AUTH_FILE = Path(__file__).with_name("auth.json")
TOKEN_FILE = Path(__file__).with_name("token.txt")
COOKIES_FILE = Path(__file__).with_name("cookies.txt")


@dataclass(frozen=True)
class WebConfig:
    host: str
    use_https: bool
    verify_ssl: bool
    user: str
    password: str


@dataclass(frozen=True)
class DataLogsConfig:
    enabled: bool
    output_dir: Path


def load_config(path: Path) -> tuple[WebConfig, list[str], DataLogsConfig]:
    with path.open(encoding="utf-8") as file:
        raw = yaml.safe_load(file)

    web = raw["web"]
    web_config = WebConfig(
        host=web["host"],
        use_https=bool(web.get("use_https", True)),
        verify_ssl=bool(web.get("verify_ssl", False)),
        user=web.get("user", ""),
        password=web.get("password", ""),
    )

    tags = list(raw.get("tags", []))
    datalogs_raw = raw.get("datalogs", {})
    datalogs_config = DataLogsConfig(
        enabled=bool(datalogs_raw.get("enabled", False)),
        output_dir=Path(datalogs_raw.get("output_dir", "./datalogs")),
    )
    return web_config, tags, datalogs_config


class S7WebClient:
    def __init__(self, config: WebConfig, auth_dir: Path | None = None) -> None:
        self._config = config
        self._auth_dir = auth_dir or Path(__file__).parent
        self._scheme = "https" if config.use_https else "http"
        self._base_url = f"{self._scheme}://{config.host}"
        self._api_url = f"{self._base_url}/api/jsonrpc"
        self._token: str | None = None
        self._auth_type: str | None = None
        self._session = requests.Session()
        self._session.verify = config.verify_ssl

        if not config.verify_ssl:
            urllib3.disable_warnings(urllib3.exceptions.InsecureRequestWarning)

    @property
    def auth_file(self) -> Path:
        return self._auth_dir / AUTH_FILE.name

    @property
    def token_file(self) -> Path:
        return self._auth_dir / TOKEN_FILE.name

    @property
    def cookies_file(self) -> Path:
        return self._auth_dir / COOKIES_FILE.name

    def save_auth(self) -> None:
        payload: dict[str, Any] = {
            "host": self._config.host,
            "auth_type": self._auth_type,
            "token": self._token,
        }
        self.auth_file.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2),
            encoding="utf-8",
        )

        if self._token:
            self.token_file.write_text(self._token, encoding="utf-8")
            logger.info("Токен сохранён: %s", self.token_file)

        if self._auth_type == "form":
            self._save_cookies()
            logger.info("Cookies сохранены: %s", self.cookies_file)

    def load_auth(self) -> bool:
        saved_auth_type: str | None = None

        if self.auth_file.exists():
            try:
                saved = json.loads(self.auth_file.read_text(encoding="utf-8"))
                saved_auth_type = saved.get("auth_type")
                if saved.get("token"):
                    self._token = saved["token"]
            except json.JSONDecodeError:
                pass

        if self.cookies_file.exists():
            self._load_cookies()

        if saved_auth_type:
            self._auth_type = saved_auth_type
        elif self._session.cookies:
            self._auth_type = "form"

        if self._auth_type == "api":
            env_token = os.environ.get("PLC_WEB_TOKEN")
            if env_token:
                self._token = env_token.strip()
                logger.info("API-токен загружен из PLC_WEB_TOKEN")
            elif self.token_file.exists() and not self._token:
                self._token = self.token_file.read_text(encoding="utf-8").strip()
                logger.info("API-токен загружен: %s", self.token_file)
        elif not self._token:
            self._token = self._session_cookie_token()

        if self._auth_type == "form" and self._session.cookies:
            logger.info("Сессия FormLogin (cookies): %s", self.cookies_file)

        return self._auth_type == "form" and bool(self._session.cookies) or bool(
            self._auth_type == "api" and self._token
        )

    def _save_cookies(self) -> None:
        jar = MozillaCookieJar(str(self.cookies_file))
        jar.clear()
        for cookie in self._session.cookies:
            jar.set_cookie(cookie)
        jar.save(ignore_discard=True, ignore_expires=True)

    def _load_cookies(self) -> None:
        if not self.cookies_file.exists():
            return
        jar = MozillaCookieJar(str(self.cookies_file))
        jar.load(ignore_discard=True, ignore_expires=True)
        self._session.cookies.update(jar)

    def _check_session(self) -> bool:
        if not self._session.cookies:
            return False
        try:
            response = self._session.get(
                f"{self._base_url}/Portal/Portal.mwsl?PriNav=Start",
                timeout=8,
            )
            return response.status_code == 200 and len(response.content) > 500
        except requests.RequestException:
            return False

    def _saved_auth_type(self) -> str | None:
        if not self.auth_file.exists():
            return None
        try:
            saved = json.loads(self.auth_file.read_text(encoding="utf-8"))
            return saved.get("auth_type")
        except json.JSONDecodeError:
            return None

    def authenticate(self, force: bool = False) -> str:
        saved_form = self._saved_auth_type() == "form"

        if not force:
            self.load_auth()
            if self._check_session():
                logger.info("Используем сохранённую cookie-сессию")
                return self._token or self._session_cookie_token()

        # Для FormLogin не трогаем /api/jsonrpc — ПЛК рвёт соединение
        if saved_form or self._auth_type == "form":
            self.login_form()
            self._auth_type = "form"
            self._token = self._session_cookie_token()
        else:
            try:
                self.login()
                self._auth_type = "api"
            except (RuntimeError, requests.RequestException):
                logger.info("Web API недоступен, используем FormLogin")
                self.login_form()
                self._auth_type = "form"
                self._token = self._session_cookie_token()

        if not self._token and not self._session.cookies:
            raise RuntimeError("Авторизация не удалась")

        self.save_auth()
        return self._token or ""

    def _session_cookie_token(self) -> str:
        for name in ("siemens_ad_secure_session", "siemens_ad_session"):
            value = self._session.cookies.get(name)
            if value:
                return value
        return ""

    def _rpc(
        self,
        method: str,
        params: dict[str, Any] | None = None,
        request_id: int = 1,
        auth: bool = False,
    ) -> Any:
        payload: dict[str, Any] = {
            "jsonrpc": "2.0",
            "id": request_id,
            "method": method,
        }
        if params is not None:
            payload["params"] = params

        headers: dict[str, str] = {}
        if auth and self._token:
            headers["X-Auth-Token"] = self._token

        response = self._session.post(
            self._api_url,
            headers=headers,
            json=payload,
            timeout=10,
        )
        if response.status_code == 405:
            allow = response.headers.get("Allow", "?")
            raise RuntimeError(
                f"POST {self._api_url} → 405 Method Not Allowed (Allow: {allow}). "
                "JSON-RPC Web API на этом устройстве недоступен. "
                "Нужен S7-1500 (firmware ≥ V2.8) с включённым Web API в TIA Portal → "
                "CPU → Web server. S7-1200 даёт только веб-портал без PlcProgram.Read."
            )
        response.raise_for_status()

        body = response.json()
        if isinstance(body, list):
            for item in body:
                if item.get("id") == request_id:
                    body = item
                    break
            else:
                body = body[0] if body else {}

        if "error" in body:
            error = body["error"]
            raise RuntimeError(f"{method}: {error.get('message')} (code {error.get('code')})")
        return body.get("result")

    def login(self) -> None:
        result = self._rpc(
            "Api.Login",
            {
                "user": self._config.user,
                "password": self._config.password,
            },
        )
        if isinstance(result, dict):
            self._token = result.get("token")
        else:
            self._token = str(result)

        if not self._token:
            raise RuntimeError("Api.Login не вернул token")
        logger.info("Api.Login: token получен")

    def logout(self) -> None:
        if self._token:
            try:
                self._rpc("Api.Logout", auth=True)
            except requests.RequestException:
                pass
            self._token = None

    def probe(self) -> None:
        self.authenticate()

        if self._auth_type == "api":
            version = self._rpc("Api.Version")
            methods = self._rpc("Api.Browse")
            logger.info("Web API version: %s", version)
            logger.info("Доступные методы:")
            for item in methods:
                logger.info("  - %s", item.get("name"))

            tags = self._rpc(
                "PlcProgram.Browse",
                {"mode": "children", "var": ""},
                auth=True,
            )
            logger.info("Доступные теги (первые 30):")
            for item in tags[:30]:
                logger.info("  - %s", item.get("name", item))
            if len(tags) > 30:
                logger.info("  ... и ещё %s", len(tags) - 30)
            return

        self.probe_session()

    def probe_session(self) -> None:
        pages = [
            ("Портал", "/Portal/Portal.mwsl?PriNav=Start"),
            ("DataLogs", "/Portal/Portal.mwsl?PriNav=DataLogs"),
            ("FileBrowser", "/Portal/Portal.mwsl?PriNav=FileBrowser"),
        ]
        logger.info("Проверка сессии по cookies (без JSON-RPC):")
        for name, path in pages:
            response = self._session.get(f"{self._base_url}{path}", timeout=10)
            logger.info("  %s — HTTP %s (%s байт)", name, response.status_code, len(response.content))

        files = self.list_datalog_files()
        if files:
            logger.info("DataLogs файлы: %s", files)
        else:
            logger.info("DataLogs: файлы не найдены (или нет прав File Browser)")

        logger.info("Сессия: %s...", (self._token or "")[:24])
        logger.info(
            "Чтение тегов I/Q по cookies недоступно — только Portal/DataLogs. "
            "Для тегов: ./run.sh (S7)"
        )

    def get_portal_page(self, path: str) -> requests.Response:
        response = self._session.get(f"{self._base_url}{path}", timeout=10)
        response.raise_for_status()
        return response

    def read_tags(self, tags: list[str]) -> dict[str, Any]:
        if not tags:
            raise ValueError("Список tags пуст — добавь теги в config_web.yaml")

        self.authenticate()
        if self._auth_type == "form":
            raise RuntimeError(
                "PlcProgram.Read недоступен без Web API. "
                "По cookies доступны Portal/DataLogs: ./run_web.sh --datalogs. "
                "Для тегов I/Q: ./run.sh"
            )

        try:
            result: dict[str, Any] = {}
            for index, tag in enumerate(tags, start=1):
                value = self._rpc(
                    "PlcProgram.Read",
                    {"var": tag},
                    request_id=index,
                    auth=True,
                )
                if isinstance(value, dict) and "value" in value:
                    value = value["value"]
                result[tag] = value
                logger.info("%s = %s", tag, value)
            self.save_auth()
            return result
        finally:
            self.logout()

    def login_form(self) -> None:
        """Сессия для FileBrowser / DataLogs (старый механизм FormLogin)."""
        last_error: requests.RequestException | None = None

        for attempt in range(1, 4):
            if attempt > 1:
                logger.info("FormLogin повтор %s/3", attempt)
                time.sleep(1.5)

            try:
                response = self._session.post(
                    f"{self._base_url}/FormLogin",
                    data={
                        "Redirection": "",
                        "Login": self._config.user,
                        "Password": self._config.password,
                        "submit": "Login",
                    },
                    headers={
                        "Referer": f"{self._base_url}/Portal/Portal.mwsl?PriNav=Start",
                    },
                    timeout=15,
                )
                response.raise_for_status()
                self._token = self._session_cookie_token()
                if not self._token:
                    raise RuntimeError("FormLogin не вернул session cookie")
                logger.info("FormLogin выполнен (cookies в сессии)")
                return
            except requests.RequestException as error:
                last_error = error
                self._session.cookies.clear()

        raise RuntimeError(f"FormLogin не удался: {last_error}") from last_error

    def list_datalog_files(self) -> list[str]:
        names: list[str] = []

        portal = self.get_portal_page("/Portal/Portal.mwsl?PriNav=FileBrowser?Path=/DataLogs")
        names.extend(self._parse_file_list(portal.text))

        candidates = [
            "/awp/FileBrowser/List?Path=%2FDataLogs",
            "/FileBrowser/List?Path=%2FDataLogs",
        ]
        for path in candidates:
            try:
                response = self._session.get(f"{self._base_url}{path}", timeout=10)
                if response.status_code == 200 and response.text.strip():
                    logger.info("FileBrowser %s: %s", path, response.text[:300])
                    for name in self._parse_file_list(response.text):
                        if name not in names:
                            names.append(name)
            except requests.RequestException as error:
                logger.debug("FileBrowser %s: %s", path, error)

        return names

    def download_datalog(self, filename: str, output_dir: Path) -> Path:
        encoded_path = quote(f"/DataLogs/{filename}", safe="")
        urls = [
            f"{self._base_url}/awp/FileBrowser/Download?Path={encoded_path}",
            f"{self._base_url}/FileBrowser/Download?Path={encoded_path}",
        ]

        output_dir.mkdir(parents=True, exist_ok=True)
        target = output_dir / filename

        for url in urls:
            try:
                response = self._session.get(url, timeout=30)
                if response.status_code == 200 and response.content:
                    target.write_bytes(response.content)
                    logger.info("Скачан DataLog: %s", target)
                    return target
            except requests.RequestException as error:
                logger.debug("Download %s: %s", url, error)

        raise RuntimeError(f"Не удалось скачать DataLog: {filename}")

    @staticmethod
    def _parse_file_list(text: str) -> list[str]:
        names: list[str] = []
        for match in re.finditer(r"[\w.-]+\.csv", text, re.IGNORECASE):
            name = match.group(0)
            if name not in names:
                names.append(name)
        return names


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Чтение данных Siemens PLC через Web Server API",
    )
    parser.add_argument(
        "-c",
        "--config",
        type=Path,
        default=Path(__file__).with_name("config_web.yaml"),
        help="Путь к config_web.yaml",
    )
    parser.add_argument(
        "--login",
        action="store_true",
        help="Авторизоваться и сохранить token.txt + cookies.txt",
    )
    parser.add_argument(
        "--probe",
        action="store_true",
        help="Проверить Web API и показать доступные методы/теги",
    )
    parser.add_argument(
        "--datalogs",
        action="store_true",
        help="Скачать Data Logs из /DataLogs (нужен File Browser Access)",
    )
    return parser.parse_args()


def main() -> int:
    args = parse_args()

    if not args.config.exists():
        logger.error("Файл конфигурации не найден: %s", args.config)
        return 1

    try:
        web_config, tags, datalogs_config = load_config(args.config)
        client = S7WebClient(web_config)

        if args.login:
            client.load_auth()
            if client._check_session() and not os.environ.get("PLC_WEB_FORCE_LOGIN"):
                logger.info("Сессия актуальна, перелогин не нужен")
            else:
                client.authenticate(force=True)
            token = client._token or client._session_cookie_token()
            logger.info("Авторизация сохранена. Токен: %s...", token[:24])
            return 0

        if args.probe:
            client.probe()
            return 0

        if args.datalogs or datalogs_config.enabled:
            if not web_config.user:
                raise ValueError("Укажи user/password в config_web.yaml для DataLogs")
            client.authenticate()
            files = client.list_datalog_files()
            if files:
                logger.info("Найдены файлы: %s", files)
                for name in files:
                    client.download_datalog(name, datalogs_config.output_dir)
            else:
                logger.warning(
                    "Список DataLogs пуст. Укажи имя файла вручную или проверь "
                    "File Browser Access в TIA Portal"
                )
            return 0

        client.read_tags(tags)
    except (RuntimeError, ValueError, requests.RequestException, KeyError) as error:
        if isinstance(error, requests.HTTPError) and error.response is not None:
            status = error.response.status_code
            if status == 405:
                logger.error(
                    "Web API недоступен (HTTP 405). На этом ПЛК, вероятно, не включён "
                    "Web API в TIA Portal, или firmware слишком старый. "
                    "Используй ./run.sh (S7/snap7) — порт 102 на 192.168.0.1 открыт."
                )
                return 1
        logger.error("%s", error)
        return 1

    return 0


if __name__ == "__main__":
    sys.exit(main())
