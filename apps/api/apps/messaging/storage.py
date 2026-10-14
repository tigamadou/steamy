# apps/messaging/storage.py
import boto3
from django.conf import settings

def generate_presigned_post(bucket_name, key, content_type, expires_in=3600):
    s3 = boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        config=None,
        region_name=settings.AWS_S3_REGION_NAME,
    )
    return s3.generate_presigned_post(bucket_name, key, ExpiresIn=expires_in, Fields={"Content-Type": content_type}, Conditions=[["content-length-range", 0, settings.MAX_UPLOAD_SIZE]])
