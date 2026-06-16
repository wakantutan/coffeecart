"""
Email helpers for Froyo Diaries booking system.
Complete payment flow:
  1. Customer books       → confirmation + under review
  2. Admin → Reviewed     → payment details sent
  3. Admin → Confirmed    → payment received + booking confirmed
  4. Admin → Completed    → thank you + review request
  5. Admin → Cancelled    → cancellation notice
  6. Custom message       → direct message from admin
"""

from django.conf import settings
import os
import requests

def _site_url():
    return getattr(settings, 'SITE_URL', 'http://127.0.0.1:8000')

# ── Business constants ─────────────────────────────────────────
BUSINESS_NAME    = "Froyo Diaries"
BUSINESS_EMAIL   = "hellofroyodiaries@gmail.com"
FACEBOOK_PAGE    = "https://www.facebook.com/profile.php?id=61574984353581"
PAYMENT_DEADLINE = 42   # hours customer has to pay after Reviewed email
DEPOSIT_PERCENT  = 50   # percent required as deposit

# ── Payment details (update these anytime) ────────────────────
GCASH_NUMBER     = "0918 422 1174"
GCASH_NAME       = "Ma. Lorilyn Cando"
GCASH_QR_PATH    = os.path.join(os.path.dirname(os.path.dirname(__file__)),
                    'landing', 'static', 'landing', 'images', 'gcash_qr.png')


def _send(subject, body, to, attachments=None):
    """Send email via Brevo HTTP API (bypasses SMTP port blocking)."""
    try:
        api_key = os.environ.get('BREVO_API_KEY', '')
        if not api_key:
            return

        response = requests.post(
            'https://api.brevo.com/v3/smtp/email',
            headers={
                'api-key': api_key,
                'Content-Type': 'application/json',
            },
            json={
                'sender': {'name': BUSINESS_NAME, 'email': 'hellofroyodiaries@gmail.com'},
                'to': [{'email': to}],
                'subject': subject,
                'textContent': body,
            },
            timeout=10,
        )
    except Exception:
        pass

def _deposit_amount(price_str):
    """Extract numeric price and compute deposit."""
    import re
    nums = re.sub(r'[^\d.]', '', price_str.replace(',', ''))
    try:
        total   = float(nums)
        deposit = total * DEPOSIT_PERCENT / 100
        balance = total - deposit
        return total, deposit, balance
    except ValueError:
        return None, None, None


# ══════════════════════════════════════════════════════════════
# 1. BOOKING RECEIVED — sent immediately after customer submits
# ══════════════════════════════════════════════════════════════
def send_customer_confirmation(booking):
    total, deposit, balance = _deposit_amount(booking.pkg_price)

    price_line = booking.pkg_price
    deposit_line = ""
    if deposit:
        deposit_line = f"\nDeposit Required: ₱{deposit:,.0f} ({DEPOSIT_PERCENT}% of {booking.pkg_price})"
        deposit_line += f"\nBalance on Event Day: ₱{balance:,.0f}"

    sauces   = booking.sauces   or "—"
    crunches = booking.crunches or "—"
    fruits   = booking.fruits   or "—"

    customization = ""
    if booking.pkg_type == 'froyo':
        customization = f"""
Your Customization:
  Sauces:   {sauces}
  Crunches: {crunches}
  Fruits:   {fruits}
"""

    event_time_str = booking.event_time.strftime('%I:%M %p') if booking.event_time else 'Not specified'
    setup_time_str = booking.setup_time.strftime('%I:%M %p') if booking.setup_time else 'Not specified'
    venue_str      = booking.venue or 'Not specified'

    body = f"""Hi {booking.name}! 🎉

Thank you for your booking request with {BUSINESS_NAME}!

We have received your booking and our team will review it within 24 hours. Once reviewed, we will send you the payment details to confirm your slot.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING REFERENCE: {booking.reference}
STATUS: Under Review ⏳
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

BOOKING DETAILS:
  Package:    {booking.pkg_name} ({booking.pkg_price}){deposit_line}
  Event Type: {booking.event_type or 'Not specified'}
  Event Date: {booking.event_date.strftime('%B %d, %Y') if booking.event_date else 'Not specified'}
  Event Time: {event_time_str}
  Setup Time: {setup_time_str}
  Venue:      {venue_str}
{customization}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Please keep your reference number ({booking.reference}) for all follow-ups.

If you have any questions feel free to message us on Facebook:
{FACEBOOK_PAGE}

Sweet regards,
The {BUSINESS_NAME} Team 🍦
"""
    _send(
        subject = f"Booking Received — {booking.reference} | {BUSINESS_NAME}",
        body    = body,
        to      = booking.email,
    )


# ══════════════════════════════════════════════════════════════
# 2. ADMIN NOTIFICATION — sent to admin on every new booking
# ══════════════════════════════════════════════════════════════
def send_admin_new_booking(booking):
    sauces   = booking.sauces   or "—"
    crunches = booking.crunches or "—"
    fruits   = booking.fruits   or "—"

    customization = ""
    if booking.pkg_type == 'froyo':
        customization = f"""
Customization:
  Sauces:   {sauces}
  Crunches: {crunches}
  Fruits:   {fruits}
"""

    body = f"""New booking request received! 🔔

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
REFERENCE: {booking.reference}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

CUSTOMER:
  Name:   {booking.name}
  Email:  {booking.email}
  Phone:  {booking.phone or '—'}

BOOKING:
  Package:    {booking.pkg_name} ({booking.pkg_price})
  Type:       {booking.get_pkg_type_display()}
  Event:      {booking.event_type or 'Not specified'}
  Date:       {booking.event_date.strftime('%B %d, %Y') if booking.event_date else 'Not specified'}
  Time:       {booking.event_time.strftime('%I:%M %p') if booking.event_time else 'Not specified'}
  Setup at:   {booking.setup_time.strftime('%I:%M %p') if booking.setup_time else 'Not specified'}
  Venue:      {booking.venue or 'Not specified'}
{customization}
  Notes:  {booking.notes or '—'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Log in to review and update the booking status:
{_site_url()}/dashboard/bookings/{booking.pk}/
"""
    _send(
        subject = f"[{BUSINESS_NAME}] New Booking — {booking.reference} ({booking.pkg_name})",
        body    = body,
        to      = BUSINESS_EMAIL,
    )


# ══════════════════════════════════════════════════════════════
# 3. REVIEWED — payment details sent to customer
# ══════════════════════════════════════════════════════════════
def send_payment_details(booking):
    import datetime
    deadline_dt = (
        (booking.updated_at if booking.updated_at else datetime.datetime.now())
        + datetime.timedelta(hours=PAYMENT_DEADLINE)
    )
    deadline_str = deadline_dt.strftime('%B %d, %Y at %I:%M %p')

    total, deposit, balance = _deposit_amount(booking.pkg_price)

    if deposit:
        amount_line = f"Amount to Pay:     ₱{deposit:,.0f} ({DEPOSIT_PERCENT}% deposit of {booking.pkg_price})"
        balance_line = f"Remaining Balance: ₱{balance:,.0f} (to be paid on event day)"
    else:
        amount_line  = f"Amount to Pay:     {booking.pkg_price} (full payment)"
        balance_line = ""

    body = f"""Hi {booking.name}! 😊

Great news! We have reviewed your booking request and your slot is now reserved!

To confirm your booking, please send your payment within {PAYMENT_DEADLINE} hours.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING REFERENCE: {booking.reference}
STATUS: Awaiting Payment 💳
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

PAYMENT DETAILS:

  {amount_line}
  {balance_line}

  💙 GCash:
     Number:  {GCASH_NUMBER}
     Name:    {GCASH_NAME}

  📱 Scan the attached GCash QR code to pay directly!
     (QR code is attached to this email)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
⏰ PAYMENT DEADLINE: {deadline_str}

Your slot will be released if payment is not received by the deadline.
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

HOW TO CONFIRM YOUR PAYMENT:
After sending payment please send your proof of payment (screenshot) to us on Facebook:
👉 {FACEBOOK_PAGE}

Include your reference number ({booking.reference}) in your message.

EVENT SUMMARY:
  Package:    {booking.pkg_name} ({booking.pkg_price})
  Event Date: {booking.event_date.strftime('%B %d, %Y') if booking.event_date else 'Not specified'}
  Event Time: {booking.event_time.strftime('%I:%M %p') if booking.event_time else 'Not specified'}
  Setup Time: {booking.setup_time.strftime('%I:%M %p') if booking.setup_time else 'Not specified'}
  Venue:      {booking.venue or 'Not specified'}

If you have any questions message us on Facebook:
{FACEBOOK_PAGE}

Sweet regards,
The {BUSINESS_NAME} Team 🍦
"""
    # Attach GCash QR code
    attachments = []
    if os.path.exists(GCASH_QR_PATH):
        attachments.append(('gcash_qr_froyo_diaries.png', GCASH_QR_PATH, 'image/png'))

    _send(
        subject     = f"Payment Details — {booking.reference} | Action Required",
        body        = body,
        to          = booking.email,
        attachments = attachments,
    )


# ══════════════════════════════════════════════════════════════
# 4. CONFIRMED — payment received, booking confirmed
# ══════════════════════════════════════════════════════════════
def send_booking_confirmed(booking):
    total, deposit, balance = _deposit_amount(booking.pkg_price)

    balance_note = ""
    if balance:
        balance_note = f"\n  Remaining Balance: ₱{balance:,.0f} (to be paid on event day)"

    sauces   = booking.sauces   or "—"
    crunches = booking.crunches or "—"
    fruits   = booking.fruits   or "—"

    customization = ""
    if booking.pkg_type == 'froyo':
        customization = f"""
YOUR CUSTOMIZATION:
  Sauces:   {sauces}
  Crunches: {crunches}
  Fruits:   {fruits}
"""

    body = f"""Hi {booking.name}! 🎉🍦

Your booking is now CONFIRMED! We have received your payment and your slot is secured.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING REFERENCE: {booking.reference}
STATUS: CONFIRMED ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

EVENT DETAILS:
  Package:    {booking.pkg_name} ({booking.pkg_price}){balance_note}
  Event Type: {booking.event_type or 'Not specified'}
  Event Date: {booking.event_date.strftime('%B %d, %Y') if booking.event_date else 'Not specified'}
  Event Time: {booking.event_time.strftime('%I:%M %p') if booking.event_time else 'Not specified'}
  Setup Time: {booking.setup_time.strftime('%I:%M %p') if booking.setup_time else 'Not specified'}
  Venue:      {booking.venue or 'Not specified'}
{customization}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

WHAT HAPPENS NEXT:
  ✅ Our team will contact you 1-2 days before your event
  ✅ We will arrive at your venue at your setup time
  ✅ Everything will be set up and ready before your event starts

We are so excited to be part of your special day! 🎊

If you have any questions or changes message us on Facebook:
{FACEBOOK_PAGE}

See you on {booking.event_date.strftime('%B %d, %Y') if booking.event_date else 'your event day'}! 🍦
The {BUSINESS_NAME} Team
"""
    _send(
        subject = f"Booking Confirmed! 🎉 — {booking.reference} | {BUSINESS_NAME}",
        body    = body,
        to      = booking.email,
    )


# ══════════════════════════════════════════════════════════════
# 5. COMPLETED — thank you + review request
# ══════════════════════════════════════════════════════════════
def send_booking_completed(booking):
    body = f"""Hi {booking.name}! 🍦

Thank you so much for having {BUSINESS_NAME} at your event!

We hope your guests enjoyed every cup and that it made your special day even sweeter. It was truly a pleasure serving you!

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING REFERENCE: {booking.reference}
STATUS: Completed ✅
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

We would love to hear about your experience! A quick review means the world to us and helps other customers know what to expect.

👉 Leave a review here:
{_site_url()}/#reviews

It only takes 1 minute and helps our small business grow! 🙏

Thank you again for choosing {BUSINESS_NAME}. We hope to serve you again at your next event!

With love and froyo,
The {BUSINESS_NAME} Team 🍦

Follow us on Facebook for updates and promos:
{FACEBOOK_PAGE}
"""
    _send(
        subject = f"Thank You from {BUSINESS_NAME}! 🍦 — {booking.reference}",
        body    = body,
        to      = booking.email,
    )


# ══════════════════════════════════════════════════════════════
# 6. CANCELLED — cancellation notice
# ══════════════════════════════════════════════════════════════
def send_booking_cancelled(booking):
    reason_line = ""
    if booking.cancel_reason:
        reason_line = f"\nReason: {booking.cancel_reason}\n"

    body = f"""Hi {booking.name},

We regret to inform you that your booking has been cancelled.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
BOOKING REFERENCE: {booking.reference}
STATUS: Cancelled ❌
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
{reason_line}
If you believe this is a mistake or would like to rebook please message us on Facebook:
{FACEBOOK_PAGE}

We apologize for any inconvenience.

Regards,
The {BUSINESS_NAME} Team
"""
    _send(
        subject = f"Booking Cancelled — {booking.reference} | {BUSINESS_NAME}",
        body    = body,
        to      = booking.email,
    )


# ══════════════════════════════════════════════════════════════
# 7. STATUS UPDATE — general router (called by admin views)
# ══════════════════════════════════════════════════════════════
def send_customer_status_update(booking, custom_message=None):
    """
    Routes to the correct email based on new status.
    Called automatically when admin changes booking status.
    """
    if booking.status == 'reviewed':
        send_payment_details(booking)
    elif booking.status == 'confirmed':
        send_booking_confirmed(booking)
    elif booking.status == 'completed':
        send_booking_completed(booking)
    elif booking.status == 'cancelled':
        send_booking_cancelled(booking)
    else:
        # Generic update for other status changes
        body = f"""Hi {booking.name},

Your booking status has been updated.

Reference: {booking.reference}
Status:    {booking.get_status_display()}

If you have any questions message us on Facebook:
{FACEBOOK_PAGE}

Regards,
The {BUSINESS_NAME} Team
"""
        _send(
            subject = f"Booking Update — {booking.reference} [{booking.get_status_display()}]",
            body    = body,
            to      = booking.email,
        )


# ══════════════════════════════════════════════════════════════
# 8. CUSTOM MESSAGE — admin sends direct message to customer
# ══════════════════════════════════════════════════════════════
def send_custom_message(booking, subject, message_body):
    body = f"""Hi {booking.name},

{message_body}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Regarding booking: {booking.reference} ({booking.pkg_name})
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Regards,
The {BUSINESS_NAME} Team
"""
    _send(
        subject = f"[{booking.reference}] {subject}",
        body    = body,
        to      = booking.email,
    )
