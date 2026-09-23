import io
import uuid

from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

MAX_IMAGE_BYTES = 5 * 1024 * 1024
MAX_IMAGE_PIXELS = 20_000_000

_FORMATS = {
    "JPEG": ("image/jpeg", "jpg"),
    "PNG": ("image/png", "png"),
    "WEBP": ("image/webp", "webp"),
}
_UNSUPPORTED = "Use a JPEG, PNG, or WebP image."


def _reject(code: int, detail: str) -> None:
    raise HTTPException(status_code=code, detail=detail)


def read_upload(upload: UploadFile) -> bytes:
    payload = upload.file.read(MAX_IMAGE_BYTES + 1)
    if not payload:
        _reject(status.HTTP_400_BAD_REQUEST, "Choose an image file.")
    if len(payload) > MAX_IMAGE_BYTES:
        _reject(status.HTTP_413_CONTENT_TOO_LARGE, "Image must be 5 MB or smaller.")
    return payload


def build_object_key(tenant_id: int, product_id: int, ext: str) -> str:
    if ext not in {"jpg", "png", "webp"}:
        _reject(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, _UNSUPPORTED)
    return f"tenants/{tenant_id}/products/{product_id}/{uuid.uuid4().hex}.{ext}"


def prepare_image(data: bytes) -> tuple[bytes, str, str]:
    Image.MAX_IMAGE_PIXELS = MAX_IMAGE_PIXELS
    try:
        with Image.open(io.BytesIO(data)) as image:
            image.verify()
    except Image.DecompressionBombError:
        _reject(status.HTTP_413_CONTENT_TOO_LARGE, "Image is too large.")
    except (UnidentifiedImageError, OSError, ValueError):
        _reject(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, _UNSUPPORTED)

    try:
        with Image.open(io.BytesIO(data)) as image:
            fmt = image.format
            if fmt not in _FORMATS:
                _reject(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, _UNSUPPORTED)
            if image.width < 1 or image.height < 1 or image.width * image.height > MAX_IMAGE_PIXELS:
                _reject(status.HTTP_413_CONTENT_TOO_LARGE, "Image is too large.")
            prepared = _for_format(image, fmt)
            buffer = io.BytesIO()
            if fmt == "JPEG":
                prepared.save(buffer, format="JPEG", quality=85, optimize=True)
            elif fmt == "WEBP":
                prepared.save(buffer, format="WEBP", quality=85, method=6)
            else:
                prepared.save(buffer, format="PNG", optimize=True)
    except HTTPException:
        raise
    except Image.DecompressionBombError:
        _reject(status.HTTP_413_CONTENT_TOO_LARGE, "Image is too large.")
    except (UnidentifiedImageError, OSError, ValueError):
        _reject(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, _UNSUPPORTED)

    encoded = buffer.getvalue()
    if not encoded:
        _reject(status.HTTP_415_UNSUPPORTED_MEDIA_TYPE, _UNSUPPORTED)
    content_type, ext = _FORMATS[fmt]
    return encoded, content_type, ext


def _for_format(image: Image.Image, fmt: str) -> Image.Image:
    if fmt == "JPEG":
        if image.mode != "RGB":
            return image.convert("RGB")
        return image
    if image.mode in {"RGB", "RGBA"}:
        return image
    if "A" in image.getbands():
        return image.convert("RGBA")
    return image.convert("RGB")
