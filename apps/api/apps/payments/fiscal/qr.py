"""Code QR d'une facture normalisée, en SVG en ligne : le PDF ne charge aucune ressource (ADR 0005)."""

import io

import qrcode
import qrcode.image.svg


def qr_svg(data: str) -> str:
    """SVG du QR de `data` (le contenu `qrCode` de la DGI), sans en-tête XML, à inclure tel quel dans le gabarit."""
    image = qrcode.make(data, image_factory=qrcode.image.svg.SvgPathImage, box_size=10, border=1)
    out = io.BytesIO()
    image.save(out)
    svg = out.getvalue().decode()
    return svg[svg.index("<svg") :]
