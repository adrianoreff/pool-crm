-- Seed default Weekly Pool Service checklist for existing businesses
INSERT INTO service_checklists (business_id, service_id, name, items, is_active)
SELECT
  s.business_id,
  s.id,
  'Weekly Pool Service Checklist',
  '[
    {"id":"empty-baskets","description":"Empty Baskets","descriptionWhenComplete":"Emptied Baskets","frequencyType":"every_stop","intervalCount":1,"intervalUnit":"month","startOn":"next_stop","requireToFinishStop":false,"requirePhoto":false,"sortOrder":0},
    {"id":"skim-surface","description":"Skim Surface","descriptionWhenComplete":"Skimmed Surface","frequencyType":"every_stop","intervalCount":1,"intervalUnit":"month","startOn":"next_stop","requireToFinishStop":false,"requirePhoto":false,"sortOrder":1},
    {"id":"vacuum","description":"Vacuum","descriptionWhenComplete":"Vacuumed","frequencyType":"every_stop","intervalCount":1,"intervalUnit":"month","startOn":"next_stop","requireToFinishStop":false,"requirePhoto":false,"sortOrder":2},
    {"id":"backwash","description":"Backwash","descriptionWhenComplete":"Backwashed","frequencyType":"every_stop","intervalCount":1,"intervalUnit":"month","startOn":"next_stop","requireToFinishStop":false,"requirePhoto":false,"sortOrder":3},
    {"id":"brushed-walls","description":"Brushed Walls","descriptionWhenComplete":"Brushed Walls","frequencyType":"every_stop","intervalCount":1,"intervalUnit":"month","startOn":"next_stop","requireToFinishStop":false,"requirePhoto":false,"sortOrder":4},
    {"id":"filled-tab-floater","description":"Filled Tab Floater","descriptionWhenComplete":"Filled Tab Floater","frequencyType":"every_stop","intervalCount":1,"intervalUnit":"month","startOn":"next_stop","requireToFinishStop":false,"requirePhoto":false,"sortOrder":5}
  ]'::jsonb,
  true
FROM services s
WHERE s.name = 'Weekly Pool Service'
  AND NOT EXISTS (
    SELECT 1 FROM service_checklists sc WHERE sc.service_id = s.id
  );
