from rest_framework import status
from rest_framework.test import force_authenticate

from apps.core.views import presign_upload


def test_presign_upload_requires_filename(api_rf, user):
    # préciser format="json" pour éviter le 415
    req = api_rf.post("/fake-url/", data={}, format="json")
    force_authenticate(req, user=user)
    resp = presign_upload(req)
    assert resp.status_code == status.HTTP_400_BAD_REQUEST
    assert resp.data["detail"] == "filename required"


def test_presign_upload_returns_presign_data(api_rf, monkeypatch, user):
    def fake_get_presigned_post_for_upload(filename, content_type=None):
        return {"key": f"uploads/{filename}", "presign": {"url": "http://rustfs/..."}}

    monkeypatch.setattr(
        "apps.core.views.get_presigned_post_for_upload", fake_get_presigned_post_for_upload
    )

    # préciser aussi format="json"
    req = api_rf.post(
        "/fake-url/", data={"filename": "avatar.png", "content_type": "image/png"}, format="json"
    )
    force_authenticate(req, user=user)
    resp = presign_upload(req)

    assert resp.status_code == status.HTTP_200_OK
    assert resp.data["key"] == "uploads/avatar.png"
    assert "presign" in resp.data
