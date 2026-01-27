-- Templates de checklist por serviço
CREATE TABLE IF NOT EXISTS service_checklists (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  service_id UUID REFERENCES services(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Itens completados por appointment
CREATE TABLE IF NOT EXISTS appointment_checklist_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID NOT NULL REFERENCES appointments(id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_text TEXT NOT NULL,
  completed BOOLEAN DEFAULT FALSE,
  completed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_service_checklists_business ON service_checklists(business_id);
CREATE INDEX IF NOT EXISTS idx_service_checklists_service ON service_checklists(service_id);
CREATE INDEX IF NOT EXISTS idx_appointment_checklist_items_appointment ON appointment_checklist_items(appointment_id);

-- RLS Policies
ALTER TABLE service_checklists ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointment_checklist_items ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view checklists for their business
CREATE POLICY "Users can view checklists for their business" 
  ON service_checklists FOR SELECT 
  USING (business_id IN (
    SELECT business_id FROM users WHERE id = auth.uid()
  ));

-- Policy: Admins can manage checklists for their business
CREATE POLICY "Admins can manage checklists for their business" 
  ON service_checklists FOR ALL 
  USING (business_id IN (
    SELECT business_id FROM users WHERE id = auth.uid() AND role IN ('owner', 'admin')
  ));

-- Policy: Technicians can manage their appointment checklists
CREATE POLICY "Technicians can manage their appointment checklists" 
  ON appointment_checklist_items FOR ALL 
  USING (appointment_id IN (
    SELECT id FROM appointments WHERE technician_id = auth.uid()
  ));

-- Policy: Admins can view all appointment checklists for their business
CREATE POLICY "Admins can view appointment checklists for their business" 
  ON appointment_checklist_items FOR SELECT 
  USING (appointment_id IN (
    SELECT a.id FROM appointments a
    JOIN users u ON u.business_id = a.business_id
    WHERE u.id = auth.uid() AND u.role IN ('owner', 'admin')
  ));
