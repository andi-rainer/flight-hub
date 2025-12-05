-- Add success page CMS fields to store_content table

-- Payment success (voucher/booking purchase)
ALTER TABLE store_content
ADD COLUMN success_payment_title TEXT NOT NULL DEFAULT 'Payment Successful!',
ADD COLUMN success_payment_title_de TEXT NOT NULL DEFAULT 'Zahlung Erfolgreich!',
ADD COLUMN success_payment_description TEXT NOT NULL DEFAULT 'Your payment has been processed successfully.',
ADD COLUMN success_payment_description_de TEXT NOT NULL DEFAULT 'Ihre Zahlung wurde erfolgreich verarbeitet.',
ADD COLUMN success_payment_check_email TEXT NOT NULL DEFAULT 'Check Your Email',
ADD COLUMN success_payment_check_email_de TEXT NOT NULL DEFAULT 'Überprüfen Sie Ihre E-Mail',
ADD COLUMN success_payment_email_message TEXT NOT NULL DEFAULT 'We''ve sent a confirmation email with your voucher/booking details.',
ADD COLUMN success_payment_email_message_de TEXT NOT NULL DEFAULT 'Wir haben Ihnen eine Bestätigungs-E-Mail mit Ihren Gutschein-/Buchungsdetails gesendet.',

-- Reservation success (voucher booking/redemption)
ADD COLUMN success_reservation_title TEXT NOT NULL DEFAULT 'Reservation Confirmed!',
ADD COLUMN success_reservation_title_de TEXT NOT NULL DEFAULT 'Reservierung Bestätigt!',
ADD COLUMN success_reservation_description TEXT NOT NULL DEFAULT 'Your jump has been scheduled successfully.',
ADD COLUMN success_reservation_description_de TEXT NOT NULL DEFAULT 'Ihr Sprung wurde erfolgreich geplant.',
ADD COLUMN success_reservation_booking_confirmed TEXT NOT NULL DEFAULT 'Booking Code',
ADD COLUMN success_reservation_booking_confirmed_de TEXT NOT NULL DEFAULT 'Buchungscode',
ADD COLUMN success_reservation_voucher_used TEXT NOT NULL DEFAULT 'Voucher Code',
ADD COLUMN success_reservation_voucher_used_de TEXT NOT NULL DEFAULT 'Gutscheincode',
ADD COLUMN success_reservation_scheduled_for TEXT NOT NULL DEFAULT 'Scheduled For',
ADD COLUMN success_reservation_scheduled_for_de TEXT NOT NULL DEFAULT 'Geplant Für',
ADD COLUMN success_reservation_check_email TEXT NOT NULL DEFAULT 'Check Your Email',
ADD COLUMN success_reservation_check_email_de TEXT NOT NULL DEFAULT 'Überprüfen Sie Ihre E-Mail',
ADD COLUMN success_reservation_email_message TEXT NOT NULL DEFAULT 'We''ve sent a confirmation email with your booking details.',
ADD COLUMN success_reservation_email_message_de TEXT NOT NULL DEFAULT 'Wir haben Ihnen eine Bestätigungs-E-Mail mit Ihren Buchungsdetails gesendet.',

-- Common fields
ADD COLUMN success_whats_next_title TEXT NOT NULL DEFAULT 'What''s Next?',
ADD COLUMN success_whats_next_title_de TEXT NOT NULL DEFAULT 'Was kommt als Nächstes?',
ADD COLUMN success_help_title TEXT NOT NULL DEFAULT 'Need Help?',
ADD COLUMN success_help_title_de TEXT NOT NULL DEFAULT 'Brauchen Sie Hilfe?',
ADD COLUMN success_help_message TEXT NOT NULL DEFAULT 'If you have any questions, please don''t hesitate to contact us at',
ADD COLUMN success_help_message_de TEXT NOT NULL DEFAULT 'Bei Fragen können Sie uns gerne kontaktieren unter',
ADD COLUMN success_contact_email TEXT NOT NULL DEFAULT 'info@skydive-salzburg.com',
ADD COLUMN success_back_to_home_button TEXT NOT NULL DEFAULT 'Back to Home',
ADD COLUMN success_back_to_home_button_de TEXT NOT NULL DEFAULT 'Zurück zur Startseite',
ADD COLUMN success_purchase_another_button TEXT NOT NULL DEFAULT 'Purchase Another',
ADD COLUMN success_purchase_another_button_de TEXT NOT NULL DEFAULT 'Weitere Kaufen',
ADD COLUMN success_voucher_code_label TEXT NOT NULL DEFAULT 'Voucher Code',
ADD COLUMN success_voucher_code_label_de TEXT NOT NULL DEFAULT 'Gutscheincode',
ADD COLUMN success_booking_code_label TEXT NOT NULL DEFAULT 'Booking Code',
ADD COLUMN success_booking_code_label_de TEXT NOT NULL DEFAULT 'Buchungscode',
ADD COLUMN success_download_pdf_button TEXT NOT NULL DEFAULT 'Download PDF',
ADD COLUMN success_download_pdf_button_de TEXT NOT NULL DEFAULT 'PDF Herunterladen',

-- Steps (JSONB arrays with text and text_de)
ADD COLUMN success_payment_steps JSONB NOT NULL DEFAULT '[
  {"text": "Check your email for confirmation and details", "text_de": "Überprüfen Sie Ihre E-Mail auf Bestätigung und Details"},
  {"text": "Print your ticket or save it on your phone", "text_de": "Drucken Sie Ihr Ticket aus oder speichern Sie es auf Ihrem Handy"},
  {"text": "Arrive at the dropzone 30 minutes before your scheduled time", "text_de": "Kommen Sie 30 Minuten vor Ihrer geplanten Zeit zur Dropzone"},
  {"text": "Bring a valid photo ID and your ticket", "text_de": "Bringen Sie einen gültigen Lichtbildausweis und Ihr Ticket mit"}
]'::jsonb,

ADD COLUMN success_reservation_steps JSONB NOT NULL DEFAULT '[
  {"text": "Confirmation email has been sent to your inbox", "text_de": "Bestätigungs-E-Mail wurde an Ihren Posteingang gesendet"},
  {"text": "No need to print anything - just bring your booking code", "text_de": "Nichts ausdrucken - bringen Sie einfach Ihren Buchungscode mit"},
  {"text": "Arrive at least 30 minutes before your scheduled time", "text_de": "Kommen Sie mindestens 30 Minuten vor Ihrer geplanten Zeit an"},
  {"text": "Bring your voucher code and a valid photo ID", "text_de": "Bringen Sie Ihren Gutscheincode und einen gültigen Lichtbildausweis mit"}
]'::jsonb;

-- Add comment
COMMENT ON COLUMN store_content.success_payment_steps IS 'Steps to show on payment success page (JSON array with text and text_de fields)';
COMMENT ON COLUMN store_content.success_reservation_steps IS 'Steps to show on reservation success page (JSON array with text and text_de fields)';
