-- ########################################################
-- HOME OS: SUPABASE BACKEND SCHEMA (V2.0 UNIFIED)
-- PREFIX: project_
-- ########################################################
create schema if not exists projet;

-- ## 1. CORE PROFILES & AUTH SYNC
CREATE TABLE IF NOT EXISTS public.project_profiles (
    id uuid REFERENCES auth.users ON DELETE CASCADE PRIMARY KEY,
    full_name text,
    persona text CHECK (persona IN ('tenant', 'landlord')),
    avatar_url text,
    biometric_enabled boolean DEFAULT false,
    mfa_enabled boolean DEFAULT false,
    created_at timestamptz DEFAULT now(),
    updated_at timestamptz DEFAULT now()
);

-- Trigger to create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.project_profiles (id, full_name, persona)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'full_name', 
    COALESCE(new.raw_user_meta_data->>'persona', 'tenant')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ## 2. ASSETS & BUILDINGS
CREATE TABLE IF NOT EXISTS public.project_buildings (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    owner_id uuid REFERENCES public.project_profiles(id),
    name text NOT NULL,
    address text NOT NULL,
    google_place_id text,
    tax_id text,
    legal_corp_name text,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_units (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id uuid REFERENCES public.project_buildings(id) ON DELETE CASCADE,
    unit_number text NOT NULL,
    tenant_id uuid REFERENCES public.project_profiles(id) ON DELETE SET NULL,
    rent_amount decimal(12,2),
    lease_start timestamptz,
    lease_end timestamptz,
    status text DEFAULT 'occupied', -- occupied, vacant, notice
    created_at timestamptz DEFAULT now()
);

-- ## 3. MAINTENANCE & DIAGNOSTICS
CREATE TABLE IF NOT EXISTS public.project_requests (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id uuid REFERENCES public.project_profiles(id),
    building_id uuid REFERENCES public.project_buildings(id),
    category text NOT NULL,
    description text,
    status text DEFAULT 'pending', -- pending, scheduled, resolved
    urgency_level text DEFAULT 'normal',
    images text[], -- Array of storage paths
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_work_orders (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid REFERENCES public.project_requests(id) ON DELETE CASCADE,
    vendor_name text,
    vendor_phone text,
    vendor_photo text,
    status text DEFAULT 'dispatched', -- dispatched, arrived, completed
    scheduled_arrival timestamptz,
    signed_off_at timestamptz,
    created_at timestamptz DEFAULT now()
);

-- ## 4. PROFESSIONAL NETWORK
CREATE TABLE IF NOT EXISTS public.project_vendors (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    specialty text NOT NULL,
    rating decimal(3,2) DEFAULT 0.00,
    jobs_completed int DEFAULT 0,
    google_place_id text,
    phone_number text,
    is_verified boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- ## 5. IDENTITY & ACCESS
CREATE TABLE IF NOT EXISTS public.project_resident_keys (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    resident_id uuid REFERENCES public.project_profiles(id) ON DELETE CASCADE,
    building_id uuid REFERENCES public.project_buildings(id),
    key_type text NOT NULL, -- nfc, qr, digital_certificate
    payload jsonb,
    valid_until timestamptz,
    is_active boolean DEFAULT true,
    created_at timestamptz DEFAULT now()
);

-- ## 6. FINANCES & TREASURY
CREATE TABLE IF NOT EXISTS public.project_payment_instruments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.project_profiles(id) ON DELETE CASCADE,
    stripe_customer_id text,
    stripe_payment_method_id text,
    last4 text,
    brand text,
    is_default boolean DEFAULT false,
    instrument_type text DEFAULT 'card', -- card, bank, apple_pay_token
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_apple_pay_config (
    user_id uuid REFERENCES public.project_profiles(id) PRIMARY KEY,
    is_bonded boolean DEFAULT false,
    bonded_at timestamptz,
    device_identifier text,
    updated_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_utility_ledger (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.project_profiles(id),
    utility_type text NOT NULL, -- wifi, hydro, water
    amount decimal(12,2) NOT NULL,
    billing_period text NOT NULL,
    status text DEFAULT 'unpaid', -- unpaid, pending, settled, failed
    stripe_pi_id text,
    created_at timestamptz DEFAULT now()
);

-- ## 7. COMMUNICATION
CREATE TABLE IF NOT EXISTS public.project_notification_preferences (
    user_id uuid REFERENCES public.project_profiles(id) PRIMARY KEY,
    push_maintenance boolean DEFAULT true,
    push_billing boolean DEFAULT true,
    push_chat boolean DEFAULT true,
    dnd_mode boolean DEFAULT false,
    updated_at timestamptz DEFAULT now()
);

-- ########################################################
-- ROW LEVEL SECURITY (RLS) - "Safety Protocols"
-- ########################################################

ALTER TABLE public.project_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_buildings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_work_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_resident_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_payment_instruments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_utility_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_apple_pay_config ENABLE ROW LEVEL SECURITY;

-- Profiles: Users see only themselves
CREATE POLICY "Users see own profile" ON public.project_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users update own profile" ON public.project_profiles FOR UPDATE USING (auth.uid() = id);

-- Buildings: Landlords see own
CREATE POLICY "Landlords see own buildings" ON public.project_buildings FOR ALL USING (auth.uid() = owner_id);

-- Units: Landlords manage own, Tenants see own
CREATE POLICY "Landlords manage own units" ON public.project_units 
FOR ALL USING (EXISTS (SELECT 1 FROM public.project_buildings WHERE id = building_id AND owner_id = auth.uid()));
CREATE POLICY "Tenants see own unit" ON public.project_units FOR SELECT USING (tenant_id = auth.uid());

-- Requests: Tenants see own, Landlords see building's
CREATE POLICY "Tenants see own requests" ON public.project_requests FOR ALL USING (auth.uid() = tenant_id);
CREATE POLICY "Landlords see building requests" ON public.project_requests FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.project_buildings WHERE id = building_id AND owner_id = auth.uid()));

-- Work Orders: Dynamic Visibility
CREATE POLICY "Tenants see related work orders" ON public.project_work_orders FOR SELECT 
USING (EXISTS (SELECT 1 FROM public.project_requests WHERE id = request_id AND tenant_id = auth.uid()));

-- Vendors: Searchable
CREATE POLICY "All see verified vendors" ON public.project_vendors FOR SELECT USING (true);

-- Keys: High Security
CREATE POLICY "Residents see own keys" ON public.project_resident_keys FOR SELECT USING (auth.uid() = resident_id);

-- Finances: Strict Privacy
CREATE POLICY "Users see own ledger" ON public.project_utility_ledger FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users see own instruments" ON public.project_payment_instruments FOR SELECT USING (auth.uid() = user_id);

-- Apple Pay: Owner only
CREATE POLICY "Users see own apple pay config" ON public.project_apple_pay_config FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users manage own apple pay config" ON public.project_apple_pay_config FOR ALL USING (auth.uid() = user_id);

-- ########################################################
-- PERFORMANCE INDEXES
-- ########################################################
CREATE INDEX IF NOT EXISTS idx_requests_tenant ON public.project_requests(tenant_id);
CREATE INDEX IF NOT EXISTS idx_requests_building ON public.project_requests(building_id);
CREATE INDEX IF NOT EXISTS idx_units_building ON public.project_units(building_id);
CREATE INDEX IF NOT EXISTS idx_units_tenant ON public.project_units(tenant_id);
CREATE INDEX IF NOT EXISTS idx_vendors_specialty ON public.project_vendors(specialty);
CREATE INDEX IF NOT EXISTS idx_ledger_status ON public.project_utility_ledger(status);
CREATE INDEX IF NOT EXISTS idx_keys_resident ON public.project_resident_keys(resident_id);
-- ########################################################
-- LANDLORD-VENDOR PARTNERSHIP JOIN TABLE
-- ########################################################

CREATE TABLE IF NOT EXISTS public.project_landlord_vendors (
    landlord_id uuid REFERENCES public.project_profiles(id) ON DELETE CASCADE,
    vendor_id uuid REFERENCES public.project_vendors(id) ON DELETE CASCADE,
    added_at timestamptz DEFAULT now(),
    PRIMARY KEY (landlord_id, vendor_id)
);

-- ENABLE RLS
ALTER TABLE public.project_landlord_vendors ENABLE ROW LEVEL SECURITY;

-- POLICIES
CREATE POLICY "Landlords manage their saved vendors" ON public.project_landlord_vendors
FOR ALL USING (auth.uid() = landlord_id);

-- INDEXES
CREATE INDEX IF NOT EXISTS idx_landlord_vendors_lid ON public.project_landlord_vendors(landlord_id);
CREATE INDEX IF NOT EXISTS idx_landlord_vendors_vid ON public.project_landlord_vendors(vendor_id);

-- ########################################################
-- PHASE 0 ADDITIONS
-- ########################################################

-- ## MISSING INSERT POLICY (tenants could not save requests without this)
CREATE POLICY "Tenants can create requests" ON public.project_requests
FOR INSERT WITH CHECK (auth.uid() = tenant_id);

-- ## NEW COLUMNS ON EXISTING TABLES
ALTER TABLE public.project_requests ADD COLUMN IF NOT EXISTS ai_diagnosis jsonb;
ALTER TABLE public.project_requests ADD COLUMN IF NOT EXISTS unit_id uuid REFERENCES public.project_units(id);
ALTER TABLE public.project_profiles ADD COLUMN IF NOT EXISTS expo_push_token text;
ALTER TABLE public.project_profiles ADD COLUMN IF NOT EXISTS preferred_language text DEFAULT 'en';
ALTER TABLE public.project_vendors ADD COLUMN IF NOT EXISTS latitude decimal(9,6);
ALTER TABLE public.project_vendors ADD COLUMN IF NOT EXISTS longitude decimal(9,6);
ALTER TABLE public.project_vendors ADD COLUMN IF NOT EXISTS address text;

-- ## INVITE CODE SYSTEM (tenant-landlord linking)
CREATE TABLE IF NOT EXISTS public.project_invite_codes (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    code text NOT NULL UNIQUE,
    unit_id uuid REFERENCES public.project_units(id) ON DELETE CASCADE,
    building_id uuid REFERENCES public.project_buildings(id) ON DELETE CASCADE,
    created_by uuid REFERENCES public.project_profiles(id),
    used_by uuid REFERENCES public.project_profiles(id),
    expires_at timestamptz DEFAULT (now() + interval '7 days'),
    used_at timestamptz,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.project_invite_codes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords create invites" ON public.project_invite_codes
FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Anyone can read relevant invites" ON public.project_invite_codes
FOR SELECT USING (auth.uid() = created_by OR auth.uid() = used_by OR (used_by IS NULL AND expires_at > now()));

CREATE POLICY "Tenants can claim invites" ON public.project_invite_codes
FOR UPDATE USING (used_by IS NULL AND expires_at > now())
WITH CHECK (auth.uid() = used_by);

CREATE INDEX IF NOT EXISTS idx_invite_codes_code ON public.project_invite_codes(code);
CREATE INDEX IF NOT EXISTS idx_invite_codes_unit ON public.project_invite_codes(unit_id);

-- ## MESSAGES TABLE (for in-app chat on requests)
CREATE TABLE IF NOT EXISTS public.project_messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    request_id uuid REFERENCES public.project_requests(id) ON DELETE CASCADE,
    sender_id uuid REFERENCES public.project_profiles(id),
    text text NOT NULL,
    created_at timestamptz DEFAULT now(),
    read_at timestamptz
);
ALTER TABLE public.project_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Parties see their request messages" ON public.project_messages
FOR SELECT USING (
    auth.uid() = sender_id OR
    EXISTS (
        SELECT 1 FROM public.project_requests r
        JOIN public.project_buildings b ON r.building_id = b.id
        WHERE r.id = request_id AND (r.tenant_id = auth.uid() OR b.owner_id = auth.uid())
    )
);

CREATE POLICY "Parties can send messages" ON public.project_messages
FOR INSERT WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
        SELECT 1 FROM public.project_requests r
        JOIN public.project_buildings b ON r.building_id = b.id
        WHERE r.id = request_id AND (r.tenant_id = auth.uid() OR b.owner_id = auth.uid())
    )
);

CREATE INDEX IF NOT EXISTS idx_messages_request ON public.project_messages(request_id);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.project_messages(sender_id);

-- ########################################################
-- NOTIFICATIONS TABLE (for in-app notification center)
-- ########################################################
CREATE TABLE IF NOT EXISTS public.project_notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.project_profiles(id) ON DELETE CASCADE,
    title text NOT NULL,
    body text NOT NULL,
    type text NOT NULL DEFAULT 'general', -- maintenance, chat, billing, system
    reference_id uuid, -- Links to request_id, message_id, etc.
    reference_type text, -- 'request', 'message', 'work_order', 'payment'
    is_read boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.project_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users see own notifications" ON public.project_notifications
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update own notifications" ON public.project_notifications
FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "System can insert notifications" ON public.project_notifications
FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.project_notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_unread ON public.project_notifications(user_id, is_read) WHERE is_read = false;

-- ########################################################
-- APPOINTMENTS TABLE (for landlord calendar)
-- ########################################################
CREATE TABLE IF NOT EXISTS public.project_appointments (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    landlord_id uuid REFERENCES public.project_profiles(id) ON DELETE CASCADE,
    request_id uuid REFERENCES public.project_requests(id) ON DELETE SET NULL,
    work_order_id uuid REFERENCES public.project_work_orders(id) ON DELETE SET NULL,
    title text NOT NULL,
    description text,
    scheduled_at timestamptz NOT NULL,
    duration_minutes int DEFAULT 60,
    location text,
    vendor_id uuid REFERENCES public.project_vendors(id),
    status text DEFAULT 'scheduled', -- scheduled, completed, cancelled
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.project_appointments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Landlords see own appointments" ON public.project_appointments
FOR ALL USING (auth.uid() = landlord_id);

CREATE INDEX IF NOT EXISTS idx_appointments_landlord ON public.project_appointments(landlord_id);
CREATE INDEX IF NOT EXISTS idx_appointments_date ON public.project_appointments(scheduled_at);


-- Add to work_orders table
ALTER TABLE project_work_orders ADD COLUMN IF NOT EXISTS landlord_id uuid REFERENCES project_profiles(id);
ALTER TABLE project_work_orders ADD COLUMN IF NOT EXISTS vendor_id uuid REFERENCES project_vendors(id);
ALTER TABLE project_work_orders ADD COLUMN IF NOT EXISTS estimated_cost decimal(10,2);
ALTER TABLE project_work_orders ADD COLUMN IF NOT EXISTS actual_cost decimal(10,2);
ALTER TABLE project_work_orders ADD COLUMN IF NOT EXISTS notes text;

-- RLS for landlords to manage their work orders
CREATE POLICY "Landlords manage work orders" ON project_work_orders
FOR ALL USING (auth.uid() = landlord_id);

-- ########################################################
-- PHASE 0: COMPLETE SCHEMA ADDITIONS FOR ALL PHASES
-- ########################################################

-- ## BUILDING SERVICES (Phase 5: Living Guide)
CREATE TABLE IF NOT EXISTS public.project_building_services (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    building_id uuid REFERENCES public.project_buildings(id) ON DELETE CASCADE,
    service_type text NOT NULL, -- 'wifi', 'waste', 'parking', 'laundry'
    config jsonb NOT NULL DEFAULT '{}',
    -- WiFi: { "ssid": "...", "password": "...", "speed_mbps": 500 }
    -- Waste: { "pickup_days": ["Monday","Thursday"], "recycling": true }
    -- Parking: { "spots": 2, "spot_numbers": ["P1","P2"] }
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.project_building_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Building services visible to tenants" ON public.project_building_services
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.project_units u
        JOIN public.project_buildings b ON u.building_id = b.id
        WHERE b.id = building_id AND u.tenant_id = auth.uid()
    )
    OR
    EXISTS (
        SELECT 1 FROM public.project_buildings b
        WHERE b.id = building_id AND b.owner_id = auth.uid()
    )
);

CREATE POLICY "Landlords manage building services" ON public.project_building_services
FOR ALL USING (
    EXISTS (
        SELECT 1 FROM public.project_buildings b
        WHERE b.id = building_id AND b.owner_id = auth.uid()
    )
);

CREATE INDEX IF NOT EXISTS idx_building_services_building ON public.project_building_services(building_id);

-- ## UTILITY USAGE TRACKING (Phase 5)
CREATE TABLE IF NOT EXISTS public.project_utility_usage (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    unit_id uuid REFERENCES public.project_units(id) ON DELETE CASCADE,
    utility_type text NOT NULL, -- 'electricity', 'water', 'gas'
    reading_date date NOT NULL,
    reading_value decimal(10,2) NOT NULL,
    created_at timestamptz DEFAULT now()
);
ALTER TABLE public.project_utility_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tenants see own usage" ON public.project_utility_usage
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.project_units u
        WHERE u.id = unit_id AND u.tenant_id = auth.uid()
    )
);

CREATE POLICY "Landlords see building usage" ON public.project_utility_usage
FOR SELECT USING (
    EXISTS (
        SELECT 1 FROM public.project_units u
        JOIN public.project_buildings b ON u.building_id = b.id
        WHERE u.id = unit_id AND b.owner_id = auth.uid()
    )
);

CREATE INDEX IF NOT EXISTS idx_utility_usage_unit ON public.project_utility_usage(unit_id);

-- ## VENDOR CUSTOM FIELDS (Phase 7: Contact Import)
ALTER TABLE public.project_vendors ADD COLUMN IF NOT EXISTS contact_name text;
ALTER TABLE public.project_vendors ADD COLUMN IF NOT EXISTS is_custom boolean DEFAULT false;
ALTER TABLE public.project_vendors ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES public.project_profiles(id);

DROP POLICY IF EXISTS "Users can create custom vendors" ON public.project_vendors;
CREATE POLICY "Users can create custom vendors" ON public.project_vendors
FOR INSERT WITH CHECK (auth.uid() = created_by OR created_by IS NULL);

DROP POLICY IF EXISTS "Users can update their custom vendors" ON public.project_vendors;
CREATE POLICY "Users can update their custom vendors" ON public.project_vendors
FOR UPDATE USING (auth.uid() = created_by AND is_custom = true);

-- ## PROFILE ADDITIONAL FIELDS (Phase 6: Profile Editing)
ALTER TABLE public.project_profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE public.project_profiles ADD COLUMN IF NOT EXISTS emergency_contact jsonb;

-- ## LEDGER INSERT POLICY (Phase 4: Rent Payment)
DROP POLICY IF EXISTS "Users can insert ledger entries" ON public.project_utility_ledger;
CREATE POLICY "Users can insert ledger entries" ON public.project_utility_ledger
FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own ledger" ON public.project_utility_ledger;
CREATE POLICY "Users can update own ledger" ON public.project_utility_ledger
FOR UPDATE USING (auth.uid() = user_id);

-- ## LANDLORD LEDGER VISIBILITY (Phase 3: Treasury)
DROP POLICY IF EXISTS "Landlords see tenant ledger" ON public.project_utility_ledger;
CREATE POLICY "Landlords see tenant ledger" ON public.project_utility_ledger
FOR SELECT USING (
    auth.uid() = user_id
    OR
    EXISTS (
        SELECT 1 FROM public.project_units u
        JOIN public.project_buildings b ON u.building_id = b.id
        WHERE u.tenant_id = user_id AND b.owner_id = auth.uid()
    )
);

-- ## PAYMENT INSTRUMENTS INSERT/UPDATE (Phase 4)
DROP POLICY IF EXISTS "Users manage own instruments" ON public.project_payment_instruments;
CREATE POLICY "Users manage own instruments" ON public.project_payment_instruments
FOR ALL USING (auth.uid() = user_id);

-- ## UTILITY LEDGER ADDITIONAL INDEX
CREATE INDEX IF NOT EXISTS idx_ledger_user_type ON public.project_utility_ledger(user_id, utility_type);
CREATE INDEX IF NOT EXISTS idx_ledger_billing_period ON public.project_utility_ledger(billing_period);
