-- Add default ticket template
-- Currently only voucher templates exist, need at least one ticket template

INSERT INTO pdf_design_templates (
  name,
  code,
  description,
  template_type,
  layout_config,
  border_config,
  canvas_width,
  canvas_height,
  elements,
  active,
  sort_order
) VALUES (
  'Default Ticket',
  'default-ticket',
  'Standard ticket design for bookings and reservations',
  'ticket',
  '{
    "primaryColor": "#2563eb",
    "secondaryColor": "#3b82f6",
    "accentColor": "#60a5fa",
    "textColor": "#1f2937",
    "backgroundColor": "#ffffff"
  }'::jsonb,
  '{
    "enabled": true,
    "style": "solid",
    "width": 2,
    "color": "#3b82f6",
    "cornerRadius": 8,
    "decorative": true
  }'::jsonb,
  595,
  842,
  '[]'::jsonb,
  true,
  100
);
