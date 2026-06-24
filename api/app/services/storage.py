import io
import uuid

import boto3
from botocore.client import Config
from PIL import Image

from app.config import settings


class StorageService:
    def __init__(self) -> None:
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.minio_endpoint,
            aws_access_key_id=settings.minio_root_user,
            aws_secret_access_key=settings.minio_root_password,
            config=Config(signature_version="s3v4"),
            use_ssl=settings.minio_use_ssl,
        )
        self.bucket = settings.minio_bucket

    def ensure_bucket(self) -> None:
        try:
            self.client.head_bucket(Bucket=self.bucket)
        except Exception:
            self.client.create_bucket(Bucket=self.bucket)

    def upload_bytes(self, key: str, data: bytes, content_type: str) -> str:
        self.client.put_object(Bucket=self.bucket, Key=key, Body=data, ContentType=content_type)
        return key

    def delete_file(self, key: str) -> None:
        self.client.delete_object(Bucket=self.bucket, Key=key)

    def presigned_url(self, key: str, expires: int = 3600) -> str:
        return self.client.generate_presigned_url(
            "get_object",
            Params={"Bucket": self.bucket, "Key": key},
            ExpiresIn=expires,
        )

    def process_icon(self, user_id: str, raw: bytes) -> str:
        img = Image.open(io.BytesIO(raw)).convert("RGBA")
        w, h = img.size
        side = min(w, h)
        left = (w - side) // 2
        top = (h - side) // 2
        img = img.crop((left, top, left + side, top + side))
        img = img.resize((128, 128), Image.Resampling.LANCZOS)
        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=85)
        key = f"icons/{user_id}/{uuid.uuid4()}.webp"
        return self.upload_bytes(key, buf.getvalue(), "image/webp")

    def process_attachment(self, user_id: str, txn_id: str, raw: bytes, filename: str) -> tuple[str, str]:
        img = Image.open(io.BytesIO(raw)).convert("RGB")
        buf = io.BytesIO()
        img.save(buf, format="WEBP", quality=80)
        key = f"attachments/{user_id}/{txn_id}/{uuid.uuid4()}.webp"
        self.upload_bytes(key, buf.getvalue(), "image/webp")
        thumb = img.copy()
        thumb.thumbnail((256, 256))
        tbuf = io.BytesIO()
        thumb.save(tbuf, format="WEBP", quality=70)
        tkey = f"attachments/{user_id}/{txn_id}/thumb_{uuid.uuid4()}.webp"
        self.upload_bytes(tkey, tbuf.getvalue(), "image/webp")
        return key, tkey


storage_service = StorageService()
