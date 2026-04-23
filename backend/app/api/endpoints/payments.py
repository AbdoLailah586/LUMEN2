from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Any
import stripe
import os

from app.core.database import get_db
from app.models.subscription import Subscription
from app.models.user import User

router = APIRouter()
stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
webhook_secret = os.getenv("STRIPE_WEBHOOK_SECRET")

@router.post("/webhook")
async def stripe_webhook(request: Request, db: AsyncSession = Depends(get_db)):
    """
    Handle live Stripe lifecycle events payload
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header or not webhook_secret:
        # Gracefully handle missing webhooks in local if required
        return {"status": "ignored - no webhook secret configured"}
        
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, webhook_secret
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        # TODO: Lookup User by session.client_reference_id and update tier
        # e.g., sub = db.query(Subscription).filter_by(user_id=...)
        # sub.is_active = True
        pass
        
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        # TODO: Handle downgrade/cancellation hooks
        pass

    return {"status": "success"}

@router.post("/create-checkout-session")
async def create_checkout_session(plan_type: str):
    """
    Generate stripe redirect URL based on tier.
    """
    # TODO: Implement plan logic checking against PRO vs TEAM tier
    return {"url": "https://checkout.stripe.com/..."}
