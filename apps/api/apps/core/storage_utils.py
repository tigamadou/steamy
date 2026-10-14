# core/storage_utils.py
import uuid

from .s3_client import generate_presigned_post, generate_presigned_url


def random_key(prefix="uploads", filename=None):
    ext = ""
    if filename and "." in filename:
        ext = "." + filename.rsplit(".", 1)[1]
    return f"{prefix}/{uuid.uuid4().hex}{ext}"


def get_presigned_post_for_upload(filename, content_type=None, expires_in=3600):
    key = random_key(prefix="attachments", filename=filename)
    return {
        "key": key,
        "presign": generate_presigned_post(key, content_type=content_type, expires_in=expires_in),
    }


def get_presigned_download(key, expires_in=3600):
    return generate_presigned_url(key, expires_in=expires_in)
