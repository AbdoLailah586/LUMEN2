"""
Stripe payment processing, subscription parsing, and Webhook receiving.
"""
import stripe
import os
from fastapi import Request, HTTPException
import json

stripe.api_key = os.getenv("STRIPE_SECRET_KEY")
STRIPE_WEBHOOK_SECRET = os.getenv("STRIPE_WEBHOOK_SECRET")

# System Plan configurations mapped to Stripe Product IDs
STRIPE_PLANS = {
    "free": None,
    "pro": "price_pro_id_xyz",
    "team": "price_team_id_xyz",
    "enterprise": "price_enterprise_id_xyz"
}

class StripePaymentService:
    @staticmethod
    def create_checkout_session(user_id: str, email: str, plan_name: str) -> str:
        """
        Creates a Stripe Checkout Session for subscription upgrades.
        """
        if plan_name not in STRIPE_PLANS or STRIPE_PLANS[plan_name] is None:
            raise ValueError("Invalid tier or tier is free.")
            
        # In a real app, you'd lookup if the user already has a Stripe Customer ID
        # customer = DB.get_stripe_customer(user_id)
        
        try:
            checkout_session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[
                    {
                        'price': STRIPE_PLANS[plan_name],
                        'quantity': 1,
                    },
                ],
                mode='subscription',
                success_url='https://lumen.com/billing?success=true&session_id={CHECKOUT_SESSION_ID}',
                cancel_url='https://lumen.com/billing?canceled=true',
                client_reference_id=user_id, # Safely associate with our internal DB ID
                customer_email=email
            )
            return checkout_session.url
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))

    @staticmethod
    async def handle_webhook(request: Request):
        """
        Validates Stripe cryptographic signature and processes Subscription/Payment events.
        """
        payload = await request.body()
        sig_header = request.headers.get('stripe-signature')

        try:
            event = stripe.Webhook.construct_event(
                payload, sig_header, STRIPE_WEBHOOK_SECRET
            )
        except ValueError as e:
            # Invalid payload
            raise HTTPException(status_code=400, detail="Invalid payload")
        except stripe.error.SignatureVerificationError as e:
            # Invalid signature
            raise HTTPException(status_code=400, detail="Invalid signature")

        # Handle the event
        if event['type'] == 'checkout.session.completed':
            session = event['data']['object']
            user_id = session.get("client_reference_id")
            customer_id = session.get("customer")
            subscription_id = session.get("subscription")
            
            # TODO: DB Update: Set user to active Pro/Team based on session line_items
            # DB.update_user_subscription(user_id, customer_id, subscription_id, status='active')
            print(f"User {user_id} successfully subscribed.")
            
        elif event['type'] == 'customer.subscription.deleted':
            subscription = event['data']['object']
            subscription_id = subscription.get("id")
            # DB.demote_subscription(subscription_id, to='free')
            print(f"Subscription {subscription_id} canceled.")
            
        elif event['type'] == 'invoice.payment_failed':
            invoice = event['data']['object']
            subscription_id = invoice.get("subscription")
            # DB.update_subscription_status(subscription_id, status='past_due')
            print(f"Payment failed for subscription {subscription_id}.")
            
        return {"status": "success"}

    @staticmethod
    def track_usage(user_id: str, metric_name: str, value: int):
        """
        Reports usage back to Stripe for Metered Billing (e.g. GPU seconds used).
        """
        # subscription_item_id = DB.get_metered_item_id(user_id, metric_name)
        # stripe.SubscriptionItem.create_usage_record(
        #     subscription_item_id,
        #     quantity=value,
        #     timestamp=int(time.time()),
        #     action='increment',
        # )
        pass
