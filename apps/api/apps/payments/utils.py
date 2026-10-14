# apps/payments/utils.py
import hashlib
import hmac
from decimal import Decimal

from django.conf import settings

from .models import Order, Payment


def verify_provider_webhook(provider_name: str, request):
    """
    Verify webhook authenticity.
    IMPORTANT: adapt according to provider spec (signature header, secret, etc.)
    Example generic HMAC header: 'X-Signature'
    """
    secret = getattr(settings, f"PAYMENTS_{provider_name.upper()}_SECRET", None)
    if not secret:
        return False

    signature = request.headers.get("X-Signature") or request.headers.get("X-Callback-Signature")
    if not signature:
        # some providers send their signature elsewhere; adapt as needed
        return False

    computed = hmac.new(secret.encode(), request.body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(computed, signature)


def handle_provider_event(provider_name: str, data: dict):
    """
    Handle provider event payload.
    This function should:
    - find order by reference or id in payload
    - create/update Payment record
    - mark order paid if event is success
    Implementation below assumes payload contains 'reference' and 'status'.
    """
    # Example payload keys vary by provider. Adjust mappings here.
    reference = data.get("reference") or data.get("merchant_ref") or data.get("order_ref")
    status = data.get("status") or data.get("state") or data.get("event")
    tx_id = data.get("transaction_id") or data.get("tx_id") or data.get("id")
    amount = data.get("amount")

    if not reference:
        raise ValueError("no reference in payload")

    try:
        order = Order.objects.get(reference=reference)
    except Order.DoesNotExist:
        raise ValueError("order not found") from None

    payment, _ = Payment.objects.get_or_create(
        order=order,
        provider=provider_name,
        provider_transaction_id=tx_id,
        defaults={
            "amount": Decimal(amount) if amount else order.total,
            "currency": order.currency,
            "provider_payload": data,
        },
    )

    # update payload & raw
    payment.provider_payload = data
    payment.raw_response = str(data)
    payment.received_at = payment.received_at or None

    # provider-specific status interpretation:
    success_states = {"success", "completed", "paid", "PAID", "SUCCEEDED"}
    if str(status).lower() in success_states or data.get("status") in success_states:
        payment.mark_success(tx_id=tx_id)
    else:
        payment.save()
