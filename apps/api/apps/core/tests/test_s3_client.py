import pytest
from types import SimpleNamespace

# on suppose que le module est apps.core.s3_client
import apps.core.s3_client as s3_client


def test_get_s3_client_calls_boto3_with_settings(monkeypatch, settings):
    # arrange settings (exemple RustFS)
    settings.AWS_S3_ENDPOINT_URL = "http://rustfs:9000/"
    settings.AWS_ACCESS_KEY_ID = "AKIA_TEST"
    settings.AWS_SECRET_ACCESS_KEY = "SECRET_TEST"
    # region peut être absente pour un stockage S3-compatible — on la définit ici pour vérifier aussi ce cas
    settings.AWS_S3_REGION_NAME = "eu-west-1"

    called = {}

    def fake_boto3_client(service_name, **kwargs):
        called["service_name"] = service_name
        called["kwargs"] = kwargs
        return "FAKE_CLIENT"

    # monkeypatch boto3 client
    monkeypatch.setattr(s3_client, "boto3", SimpleNamespace(client=fake_boto3_client))

    # act
    client = s3_client.get_s3_client()

    # assert
    assert client == "FAKE_CLIENT"
    assert called["service_name"] == "s3"

    # endpoint_url may contenir ou non un slash final — normaliser pour la comparaison
    expected_endpoint = settings.AWS_S3_ENDPOINT_URL.rstrip("/")
    assert "endpoint_url" in called["kwargs"]
    assert str(called["kwargs"]["endpoint_url"]).rstrip("/") == expected_endpoint

    assert called["kwargs"]["aws_access_key_id"] == settings.AWS_ACCESS_KEY_ID
    assert called["kwargs"]["aws_secret_access_key"] == settings.AWS_SECRET_ACCESS_KEY

    # region_name peut être None pour un stockage S3-compatible — on utilise .get pour être tolérant
    assert called["kwargs"].get("region_name") == getattr(settings, "AWS_S3_REGION_NAME", None)


def test_generate_presigned_post_includes_content_type_and_conditions(monkeypatch, settings):
    settings.AWS_STORAGE_BUCKET_NAME = "my-bucket"

    class FakeClient:
        def generate_presigned_post(self, Bucket, Key, ExpiresIn, Fields, Conditions):
            # return quelque chose que l'on peut inspecter
            return {"Bucket": Bucket, "Key": Key, "ExpiresIn": ExpiresIn, "Fields": Fields, "Conditions": Conditions}

    monkeypatch.setattr(s3_client, "get_s3_client", lambda: FakeClient())

    # act with content_type
    presigned = s3_client.generate_presigned_post(
        "path/to/file.jpg", content_type="image/jpeg", expires_in=123, bucket=None
    )

    # assert fields and conditions contain content-type and correct bucket/key
    assert presigned["Bucket"] == settings.AWS_STORAGE_BUCKET_NAME
    assert presigned["Key"] == "path/to/file.jpg"
    assert presigned["ExpiresIn"] == 123
    assert presigned["Fields"]["Content-Type"] == "image/jpeg"
    assert {"Content-Type": "image/jpeg"} in presigned["Conditions"]


def test_generate_presigned_post_without_content_type(monkeypatch, settings):
    settings.AWS_STORAGE_BUCKET_NAME = "my-bucket"

    class FakeClient:
        def generate_presigned_post(self, Bucket, Key, ExpiresIn, Fields, Conditions):
            return {"Bucket": Bucket, "Key": Key, "ExpiresIn": ExpiresIn, "Fields": Fields, "Conditions": Conditions}

    monkeypatch.setattr(s3_client, "get_s3_client", lambda: FakeClient())

    presigned = s3_client.generate_presigned_post("file.txt", content_type=None)

    assert presigned["Bucket"] == settings.AWS_STORAGE_BUCKET_NAME
    assert presigned["Fields"] == {}
    assert presigned["Conditions"] == []


def test_generate_presigned_url_uses_client(monkeypatch, settings):
    settings.AWS_STORAGE_BUCKET_NAME = "my-bucket"

    class FakeClient:
        def generate_presigned_url(self, ClientMethod, Params, ExpiresIn):
            return f"https://presigned.example/{Params['Key']}?method={ClientMethod}&exp={ExpiresIn}"

    monkeypatch.setattr(s3_client, "get_s3_client", lambda: FakeClient())

    url = s3_client.generate_presigned_url(
        "some/key.png", method="get_object", expires_in=900, bucket=None
    )
    assert "some/key.png" in url
    assert "method=get_object" in url
