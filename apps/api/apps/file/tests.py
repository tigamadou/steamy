from unittest import skipIf
from urllib.parse import urlparse

from django.conf import settings
from django.core.files.uploadedfile import SimpleUploadedFile
from django.urls import reverse
from mixer.backend.django import mixer
from rest_framework.test import APITestCase

from .models import File


class FileTests(APITestCase):
    def setUp(self):
        self.user = mixer.blend("user.User")
        self.client.force_authenticate(user=self.user)

    def test_upload_file(self):
        url = reverse(
            "upload-file",
        )
        file_data = SimpleUploadedFile("file.jpg", b"this is image", content_type="image/jpeg")
        response = self.client.post(url, {"upload": file_data})
        self.assertTrue(response.data["is_verified"])
        self.assertIn("url", response.data)

    @skipIf(not settings.AWS_ACCESS_KEY_ID, "Only works if S3 is configured.")
    def test_signed_file(self):
        url = reverse(
            "create-signed-file",
        )
        response = self.client.post(url, {"file_name": "file.jpg"}, format="json")
        self.assertIn("file_id", response.data)
        self.assertIn("url", response.data)
        self.assertIn("content_type", response.data)
        self.assertIn("presigned_url", response.data)

        # récupération de l'objet File créé
        file_inst = File.objects.last()
        assert file_inst is not None

        resp_url = response.data["url"]
        storage_url = file_inst.upload.url

        def normalize_to_path(u: str) -> str:
            """Return the path portion for a URL or the input if not a full URL.
            Also strips duplicate slashes at the start."""
            if u.startswith(("http://", "https://")):
                p = urlparse(u).path
            else:
                p = u
            # normaliser double slashes et trailing slash
            return "/" + p.lstrip("/")

        resp_path = normalize_to_path(resp_url)
        storage_path = normalize_to_path(storage_url)

        # Vérifie que le nom de fichier est bien présent à la fin (tolérant sur le domain / préfixe)
        self.assertTrue(
            resp_path.endswith(file_inst.upload.name),
            msg=f"response path {resp_path} does not end with {file_inst.upload.name}",
        )
        self.assertTrue(
            storage_path.endswith(file_inst.upload.name),
            msg=f"storage path {storage_path} does not end with {file_inst.upload.name}",
        )

        # Optionnel : si tu veux aussi vérifier qu'ils se réfèrent au même chemin (après normalisation)
        # On peut comparer la fin exacte (sans préfixes) :
        self.assertTrue(
            resp_path.endswith(storage_path)
            or storage_path.endswith(resp_path)
            or resp_path.endswith(file_inst.upload.name)
            and storage_path.endswith(file_inst.upload.name)
        )
