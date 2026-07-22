from __future__ import annotations

import asyncio
import os
import subprocess
import sys
import tempfile
from typing import Protocol

from .config import Settings
from .parser import FeedParseError, ParsedDocument, parse_feed
from .parser_protocol import ParserProtocolError, decode_response, encode_request


class FeedParser(Protocol):
    async def parse(self, payload: bytes, source_url: str, max_entries: int) -> list[ParsedDocument]: ...


class InlineFeedParser:
    async def parse(self, payload: bytes, source_url: str, max_entries: int) -> list[ParsedDocument]:
        return parse_feed(payload, source_url, max_entries=max_entries)


async def _read_limited(stream: asyncio.StreamReader, limit: int) -> bytes:
    chunks: list[bytes] = []
    received = 0
    while True:
        chunk = await stream.read(64 * 1024)
        if not chunk:
            return b"".join(chunks)
        received += len(chunk)
        if received > limit:
            raise FeedParseError("parser_output_too_large")
        chunks.append(chunk)


class SubprocessFeedParser:
    def __init__(
        self,
        timeout_seconds: float,
        max_output_bytes: int,
        max_stderr_bytes: int,
        executable: str | None = None,
        module: str = "cyber_chronicle.parser_worker",
    ) -> None:
        self.timeout_seconds = timeout_seconds
        self.max_output_bytes = max_output_bytes
        self.max_stderr_bytes = max_stderr_bytes
        self.executable = executable or sys.executable
        self.module = module

    @classmethod
    def from_settings(cls, settings: Settings) -> SubprocessFeedParser:
        return cls(
            timeout_seconds=settings.parser_timeout_seconds,
            max_output_bytes=settings.parser_max_output_bytes,
            max_stderr_bytes=settings.parser_max_stderr_bytes,
        )

    async def parse(self, payload: bytes, source_url: str, max_entries: int) -> list[ParsedDocument]:
        request = encode_request(payload, source_url, max_entries)
        creationflags = 0
        if os.name == "nt":
            creationflags = subprocess.CREATE_NO_WINDOW | subprocess.CREATE_NEW_PROCESS_GROUP

        with tempfile.TemporaryDirectory(prefix="cyber-chronicle-parser-") as temp_directory:
            safe_environment = {
                key: os.environ[key]
                for key in ("SystemRoot", "SYSTEMROOT", "WINDIR")
                if key in os.environ
            }
            safe_environment.update(
                {
                    "TEMP": temp_directory,
                    "TMP": temp_directory,
                    "PYTHONUTF8": "1",
                    "PYTHONIOENCODING": "utf-8",
                }
            )
            process = await asyncio.create_subprocess_exec(
                self.executable,
                "-I",
                "-m",
                self.module,
                stdin=asyncio.subprocess.PIPE,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=temp_directory,
                env=safe_environment,
                close_fds=True,
                creationflags=creationflags,
            )
            assert process.stdin is not None and process.stdout is not None and process.stderr is not None
            try:
                async with asyncio.timeout(self.timeout_seconds):
                    process.stdin.write(request)
                    await process.stdin.drain()
                    process.stdin.close()
                    stdout_task = asyncio.create_task(_read_limited(process.stdout, self.max_output_bytes))
                    stderr_task = asyncio.create_task(_read_limited(process.stderr, self.max_stderr_bytes))
                    stdout, _stderr, return_code = await asyncio.gather(stdout_task, stderr_task, process.wait())
            except TimeoutError as exc:
                process.kill()
                await process.wait()
                raise FeedParseError("parser_timeout") from exc
            except (FeedParseError, asyncio.CancelledError):
                process.kill()
                await process.wait()
                raise

        if return_code != 0:
            try:
                decode_response(stdout, max_entries)
            except FeedParseError:
                raise
            except ParserProtocolError as exc:
                raise FeedParseError("parser_protocol_error") from exc
            raise FeedParseError("parser_process_failed")
        try:
            return decode_response(stdout, max_entries)
        except ParserProtocolError as exc:
            raise FeedParseError("parser_protocol_error") from exc
