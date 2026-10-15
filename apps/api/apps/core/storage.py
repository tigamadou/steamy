"""
Stockage privé des documents générés (ADR 0005) : certificats, puis factures.

- En déployé et dans la stack locale : `PrivateMediaStorage`, le bucket média sous le préfixe `private/`, objets
  privés, accessibles seulement par une URL présignée de 5 minutes. Si `AWS_S3_PUBLIC_ENDPOINT_URL` est défini
  (point P5 : `media.<domaine>`), la signature est faite pour ce point d'accès, joignable du navigateur.
- En CI et en test (`DEFAULT_FILE_STORAGE` = `FileSystemStorage`) : `PrivateFileSystemStorage`, hors de
  `MEDIA_ROOT` public, sans URL ; la vue de téléchargement sert alors le fichier elle-même.

Les noms de fichiers sont des UUID (jamais un numéro ni un identifiant de compte).
"""

import os

import boto3
from django.conf import settings
from django.core.files.storage import FileSystemStorage, storages
from storages.backends.s3boto3 import S3Boto3Storage

#: Durée de validité d'une URL de téléchargement (ADR 0005 §6)
SIGNED_URL_SECONDS = 300


class PrivateMediaStorage(S3Boto3Storage):
    location = "private"
    default_acl = "private"
    file_overwrite = True  # clé déterministe : une régénération remplace le même fichier
    querystring_auth = True
    querystring_expire = SIGNED_URL_SECONDS
    custom_domain = None

    def signed_url(self, name: str, filename: str) -> str:
        client = boto3.client(
            "s3",
            endpoint_url=settings.AWS_S3_PUBLIC_ENDPOINT_URL or settings.AWS_S3_ENDPOINT_URL,
            aws_access_key_id=settings.AWS_ACCESS_KEY_ID,
            aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY,
            region_name=settings.AWS_S3_REGION_NAME,
            config=boto3.session.Config(
                signature_version="s3v4", s3={"addressing_style": settings.AWS_S3_ADDRESSING_STYLE}
            ),
        )
        return client.generate_presigned_url(
            "get_object",
            Params={
                "Bucket": self.bucket_name,
                "Key": self._normalize_name(name),
                "ResponseContentDisposition": f'attachment; filename="{filename}"',
                "ResponseCacheControl": "no-store",
            },
            ExpiresIn=SIGNED_URL_SECONDS,
        )


class PrivateFileSystemStorage(FileSystemStorage):
    """Fichiers privés sur disque (CI, test) : hors de `MEDIA_ROOT`, sans URL publique."""

    def __init__(self, **kwargs):
        kwargs.setdefault("location", os.path.join(settings.BASE_DIR, "private-media"))
        kwargs.setdefault("base_url", None)
        super().__init__(**kwargs)

    def get_available_name(self, name, max_length=None):
        # Clé déterministe : une régénération remplace le fichier au lieu d'en créer un second
        if self.exists(name):
            self.delete(name)
        return name

    def signed_url(self, name: str, filename: str) -> None:
        return None


def private_storage():
    """Stockage privé configuré (`STORAGES["private"]`) ; appelable pour `FileField(storage=…)`."""
    return storages["private"]
