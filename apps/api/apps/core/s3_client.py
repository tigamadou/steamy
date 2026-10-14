# core/s3_client.py
import boto3
from django.conf import settings

def get_s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.AWS_S3_ENDPOINT_URL,
        aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
        aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
        region_name=getattr(settings, "AWS_S3_REGION_NAME", None),
    )

def generate_presigned_post(key, content_type=None, expires_in=3600, bucket=None):
    bucket = bucket or settings.AWS_STORAGE_BUCKET_NAME
    s3 = get_s3_client()
    fields = {}
    conditions = []
    if content_type:
        fields["Content-Type"] = content_type
        conditions.append({"Content-Type": content_type})
    presigned = s3.generate_presigned_post(Bucket=bucket, Key=key, ExpiresIn=expires_in, Fields=fields, Conditions=conditions)
    return presigned

def generate_presigned_url(key, method="get_object", expires_in=3600, bucket=None):
    bucket = bucket or settings.AWS_STORAGE_BUCKET_NAME
    s3 = get_s3_client()
    return s3.generate_presigned_url(ClientMethod=method, Params={"Bucket": bucket, "Key": key}, ExpiresIn=expires_in)
