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
