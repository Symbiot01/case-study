import logging
import os
from typing import Protocol

from fastapi import HTTPException, status

logger = logging.getLogger(__name__)

ALLOWED_CONTENT_TYPES = {"image/jpeg", "image/png", "image/webp"}


class StorageError(Exception):
    """Object storage could not complete the request."""


class ObjectNotFound(Exception):
    """The object key is not in the bucket."""


class ObjectStore(Protocol):
    def put(self, key: str, body: bytes, content_type: str) -> None:
        ...

    def get(self, key: str) -> tuple[bytes, str]:
        ...

    def delete(self, key: str) -> None:
        ...


def _check_key(key: str) -> None:
    parts = key.split("/")
    if (
        not key
        or key.startswith("/")
        or "\\" in key
        or any(part in {"", ".", ".."} for part in parts)
    ):
        raise StorageError("invalid object key")


def _check_content_type(content_type: str) -> None:
    if content_type not in ALLOWED_CONTENT_TYPES:
        raise StorageError("invalid content type")


class MemoryObjectStore:
    def __init__(self) -> None:
        self.objects: dict[str, tuple[bytes, str]] = {}

    def put(self, key: str, body: bytes, content_type: str) -> None:
        _check_key(key)
        _check_content_type(content_type)
        self.objects[key] = (body, content_type)

    def get(self, key: str) -> tuple[bytes, str]:
        _check_key(key)
        item = self.objects.get(key)
        if item is None:
            raise ObjectNotFound(key)
        return item

    def delete(self, key: str) -> None:
        _check_key(key)
        self.objects.pop(key, None)


class S3ObjectStore:
    def __init__(self) -> None:
        endpoint = os.getenv("S3_ENDPOINT")
        access_key = os.getenv("S3_ACCESS_KEY")
        secret_key = os.getenv("S3_SECRET_KEY")
        bucket = os.getenv("S3_BUCKET")
        if not endpoint or not access_key or not secret_key or not bucket:
            raise StorageError("object storage is not configured")

        style = os.getenv("S3_ADDRESSING_STYLE", "path")
        if style not in {"path", "virtual", "auto"}:
            style = "path"

        import boto3
        from botocore.config import Config

        self._bucket = bucket
        self._client = boto3.client(
            "s3",
            endpoint_url=endpoint,
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=os.getenv("S3_REGION", "us-east-1"),
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": style},
                retries={"max_attempts": 3, "mode": "standard"},
                connect_timeout=2,
                read_timeout=10,
            ),
        )

    def put(self, key: str, body: bytes, content_type: str) -> None:
        _check_content_type(content_type)
        self._call("put_object", key, "put failed", Body=body, ContentType=content_type)

    def get(self, key: str) -> tuple[bytes, str]:
        response = self._call("get_object", key, "get failed")
        payload = response["Body"].read()
        content_type = response.get("ContentType") or "application/octet-stream"
        return payload, content_type

    def delete(self, key: str) -> None:
        self._call("delete_object", key, "delete failed")

    def _call(self, method: str, key: str, failed: str, **kwargs):
        _check_key(key)
        from botocore.exceptions import BotoCoreError, ClientError

        try:
            return getattr(self._client, method)(Bucket=self._bucket, Key=key, **kwargs)
        except ClientError as exc:
            code = exc.response.get("Error", {}).get("Code", "")
            if method == "get_object" and code in {"NoSuchKey", "404", "NotFound", "NoSuchBucket"}:
                raise ObjectNotFound(key) from exc
            raise StorageError(failed) from exc
        except BotoCoreError as exc:
            raise StorageError(failed) from exc


_store: ObjectStore | None = None


def get_object_store() -> ObjectStore:
    global _store
    if _store is not None:
        return _store
    try:
        store: ObjectStore = S3ObjectStore()
    except StorageError:
        logger.error("object storage is not configured")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Image storage is unavailable",
        )
    _store = store
    return _store
