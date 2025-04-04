-- Enable PostGIS extension for location-based queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Enable UUID extension for unique identifiers
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Enable pg_cron for scheduled tasks
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- Enable pg_net for HTTP requests
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Enable pg_stat_statements for query performance monitoring
CREATE EXTENSION IF NOT EXISTS pg_stat_statements;

-- Profiles table (users of the system)
CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  phone TEXT,
  role TEXT NOT NULL CHECK (role IN ('user', 'owner', 'admin')) DEFAULT 'user',
  billing_address JSONB,
  payment_method JSONB,
  metadata JSONB,
  CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+[.][A-Za-z]+$')
);

COMMENT ON TABLE profiles IS 'Stores all user profiles with authentication and role information';
COMMENT ON COLUMN profiles.role IS 'User role: user, owner, or admin';

-- Equipment categories lookup table
CREATE TABLE equipment_categories (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT
);

COMMENT ON TABLE equipment_categories IS 'Predefined categories for equipment classification';

-- Equipment table (items available for rent)
CREATE TABLE equipment (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  category_id INTEGER REFERENCES equipment_categories(id),
  price_hour NUMERIC(10, 2) CHECK (price_hour >= 0),
  price_day NUMERIC(10, 2) CHECK (price_day >= 0),
  price_week NUMERIC(10, 2) CHECK (price_week >= 0),
  price_month NUMERIC(10, 2) CHECK (price_month >= 0),
  location GEOGRAPHY(POINT, 4326),
  address TEXT,
  city TEXT,
  state TEXT,
  postal_code TEXT,
  tracking_type TEXT NOT NULL CHECK (tracking_type IN ('bulk', 'serial')) DEFAULT 'bulk',
  serial_code TEXT,
  quantity INTEGER CHECK (quantity > 0),
  images TEXT[],
  status TEXT NOT NULL CHECK (status IN ('available', 'rented', 'repair', 'unavailable')) DEFAULT 'available',
  condition TEXT CHECK (condition IN ('new', 'excellent', 'good', 'fair', 'poor')),
  deposit_amount NUMERIC(10, 2) CHECK (deposit_amount >= 0) DEFAULT 0,
  rules TEXT[],
  features TEXT[],
  metadata JSONB
);

COMMENT ON TABLE equipment IS 'All equipment available for rental with pricing and location details';
COMMENT ON COLUMN equipment.tracking_type IS 'Bulk (quantity-based) or serial (individual item tracking)';

-- Equipment availability calendar
CREATE TABLE equipment_availability (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  equipment_id UUID NOT NULL REFERENCES equipment(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  available BOOLEAN NOT NULL DEFAULT TRUE,
  price_override NUMERIC(10, 2),
  UNIQUE (equipment_id, date)
);

COMMENT ON TABLE equipment_availability IS 'Daily availability and pricing overrides for equipment';

-- Rental transactions
CREATE TABLE rentals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  user_id UUID NOT NULL REFERENCES profiles(id),
  start_date TIMESTAMPTZ NOT NULL,
  end_date TIMESTAMPTZ NOT NULL,
  duration_days INTEGER NOT NULL,
  total_price NUMERIC(10, 2) NOT NULL CHECK (total_price >= 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'confirmed', 'completed', 'cancelled', 'refunded')) DEFAULT 'pending',
  payment_intent_id TEXT,
  payment_method TEXT,
  notes TEXT,
  damage_report TEXT,
  refund_amount NUMERIC(10, 2) CHECK (refund_amount >= 0) DEFAULT 0,
  CONSTRAINT valid_dates CHECK (start_date < end_date)
);

COMMENT ON TABLE rentals IS 'All rental transactions with status and payment information';

-- Rental items (for serialized equipment tracking)
CREATE TABLE rental_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  rental_id UUID NOT NULL REFERENCES rentals(id) ON DELETE CASCADE,
  equipment_id UUID NOT NULL REFERENCES equipment(id),
  serial_code TEXT,
  returned BOOLEAN NOT NULL DEFAULT FALSE,
  return_condition TEXT,
  notes TEXT
);

COMMENT ON TABLE rental_items IS 'Individual items rented (for serialized equipment tracking)';

-- Messages between users
CREATE TABLE messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  sender_id UUID NOT NULL REFERENCES profiles(id),
  receiver_id UUID NOT NULL REFERENCES profiles(id),
  rental_id UUID REFERENCES rentals(id),
  content TEXT NOT NULL,
  read BOOLEAN NOT NULL DEFAULT FALSE
);

COMMENT ON TABLE messages IS 'Direct messages between users regarding rentals';

-- Reviews and ratings
CREATE TABLE reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  reviewer_id UUID NOT NULL REFERENCES profiles(id),
  target_id UUID NOT NULL REFERENCES profiles(id),
  equipment_id UUID REFERENCES equipment(id),
  rental_id UUID REFERENCES rentals(id),
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  response TEXT,
  CONSTRAINT valid_review_target CHECK (
    (equipment_id IS NOT NULL AND rental_id IS NOT NULL) OR
    (equipment_id IS NULL AND rental_id IS NULL)
));

COMMENT ON TABLE reviews IS 'User reviews for equipment and other users';

-- Notifications system
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  user_id UUID NOT NULL REFERENCES profiles(id),
  type TEXT NOT NULL CHECK (type IN (
    'new_rental', 'rental_confirmed', 'rental_cancelled', 
    'payment_received', 'review_received', 'message_received'
  )),
  message TEXT NOT NULL,
  related_id UUID,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  metadata JSONB
);

COMMENT ON TABLE notifications IS 'System notifications for users';

-- Indexes for performance optimization
CREATE INDEX idx_equipment_owner ON equipment(owner_id);
CREATE INDEX idx_equipment_status ON equipment(status);
CREATE INDEX idx_equipment_location ON equipment USING GIST(location);
CREATE INDEX idx_rentals_user ON rentals(user_id);
CREATE INDEX idx_rentals_equipment ON rentals(equipment_id);
CREATE INDEX idx_rentals_status ON rentals(status);
CREATE INDEX idx_rentals_dates ON rentals(start_date, end_date);
CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(read) WHERE read = FALSE;
CREATE INDEX idx_messages_rental ON messages(rental_id);
CREATE INDEX idx_messages_participants ON messages(sender_id, receiver_id);
CREATE INDEX idx_availability_equipment ON equipment_availability(equipment_id);
CREATE INDEX idx_availability_date ON equipment_availability(date);

-- Trigger function to update timestamps
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to tables with updated_at columns
CREATE TRIGGER update_profiles_timestamp
BEFORE UPDATE ON profiles
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_equipment_timestamp
BEFORE UPDATE ON equipment
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

CREATE TRIGGER update_rentals_timestamp
BEFORE UPDATE ON rentals
FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Function to check equipment availability
CREATE OR REPLACE FUNCTION check_equipment_availability(
  p_equipment_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS BOOLEAN AS $$
DECLARE
  v_tracking_type TEXT;
  v_quantity INTEGER;
  v_available BOOLEAN;
BEGIN
  -- Get equipment tracking type and quantity
  SELECT tracking_type, quantity INTO v_tracking_type, v_quantity
  FROM equipment WHERE id = p_equipment_id;
  
  -- For bulk items, check availability calendar
  IF v_tracking_type = 'bulk' THEN
    SELECT COUNT(*) = 0 INTO v_available
    FROM equipment_availability
    WHERE equipment_id = p_equipment_id
      AND date BETWEEN p_start_date::date AND p_end_date::date
      AND available = FALSE;
      
    RETURN v_available;
  ELSE
    -- For serialized items, check if any are available
    SELECT COUNT(*) > 0 INTO v_available
    FROM equipment e
    LEFT JOIN rental_items ri ON e.id = ri.equipment_id
    LEFT JOIN rentals r ON ri.rental_id = r.id
    WHERE e.id = p_equipment_id
      AND (r.id IS NULL OR 
           (r.status IN ('completed', 'cancelled') OR
           (r.end_date < p_start_date OR r.start_date > p_end_date)));
    
    RETURN v_available;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Function to calculate rental price
CREATE OR REPLACE FUNCTION calculate_rental_price(
  p_equipment_id UUID,
  p_start_date TIMESTAMPTZ,
  p_end_date TIMESTAMPTZ
) RETURNS NUMERIC(10,2) AS $$
DECLARE
  v_days INTEGER;
  v_price NUMERIC(10,2);
  v_equipment RECORD;
BEGIN
  v_days := (p_end_date::date - p_start_date::date) + 1;
  
  SELECT * INTO v_equipment FROM equipment WHERE id = p_equipment_id;
  
  -- Check for daily price overrides first
  SELECT COALESCE(SUM(price_override), 0) INTO v_price
  FROM equipment_availability
  WHERE equipment_id = p_equipment_id
    AND date BETWEEN p_start_date::date AND p_end_date::date
    AND price_override IS NOT NULL;
  
  -- Calculate remaining days with standard pricing
  IF v_days >= 30 THEN
    v_price := v_price + (v_equipment.price_month * FLOOR(v_days / 30) + 
               (v_equipment.price_day * (v_days % 30)));
  ELSIF v_days >= 7 THEN
    v_price := v_price + (v_equipment.price_week * FLOOR(v_days / 7) + 
               (v_equipment.price_day * (v_days % 7)));
  ELSE
    v_price := v_price + (v_equipment.price_day * v_days);
  END IF;
  
  RETURN v_price;
END;
$$ LANGUAGE plpgsql;

-- Row Level Security Policies
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- Profiles RLS Policies
CREATE POLICY "Profiles are viewable by everyone" ON profiles
  FOR SELECT USING (TRUE);

CREATE POLICY "Users can update their own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- Equipment RLS Policies
CREATE POLICY "Equipment is viewable by everyone" ON equipment
  FOR SELECT USING (TRUE);

CREATE POLICY "Owners can manage their equipment" ON equipment
  FOR ALL USING (auth.uid() = owner_id);

CREATE POLICY "Admins can manage all equipment" ON equipment
  FOR ALL USING (EXISTS (
    SELECT 1 FROM profiles 
    WHERE id = auth.uid() AND role = 'admin'
  ));

-- Rentals RLS Policies
CREATE POLICY "Users can view their rentals" ON rentals
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Owners can view rentals for their equipment" ON rentals
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM equipment 
    WHERE id = rentals.equipment_id AND owner_id = auth.uid()
  ));

CREATE POLICY "Users can create rentals" ON rentals
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owners can update rental status" ON rentals
  FOR UPDATE USING (EXISTS (
    SELECT 1 FROM equipment 
    WHERE id = rentals.equipment_id AND owner_id = auth.uid()
  ));

-- Messages RLS Policies
CREATE POLICY "Users can view their messages" ON messages
  FOR SELECT USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

CREATE POLICY "Users can create messages" ON messages
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Notifications RLS Policies
CREATE POLICY "Users can view their notifications" ON notifications
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can mark notifications as read" ON notifications
  FOR UPDATE USING (auth.uid() = user_id);

-- Sample data insertion
INSERT INTO profiles (id, email, full_name, role) VALUES
  ('11111111-1111-1111-1111-111111111111', 'user@example.com', 'John Doe', 'user'),
  ('22222222-2222-2222-2222-222222222222', 'owner@example.com', 'Jane Smith', 'owner'),
  ('33333333-3333-3333-3333-333333333333', 'admin@example.com', 'Admin User', 'admin');

INSERT INTO equipment_categories (name, description) VALUES
  ('Cycling', 'Bicycles and cycling accessories'),
  ('Water Sports', 'Kayaks, paddleboards, and water gear'),
  ('Winter Sports', 'Skis, snowboards, and winter equipment');

INSERT INTO equipment (
  id, owner_id, name, description, category_id, 
  price_day, price_week, price_month, 
  tracking_type, quantity, status
) VALUES
  ('44444444-4444-4444-4444-444444444444', 
   '22222222-2222-2222-2222-222222222222',
   'Mountain Bike', 'High-quality mountain bike', 1,
   25, 150, 500,
   'bulk', 3, 'available'),
   
  ('55555555-5555-5555-5555-555555555555', 
   '22222222-2222-2222-2222-222222222222',
   'Kayak', 'Single-person kayak with paddle', 2,
   40, 200, 700,
   'serial', 1, 'available');

-- Set up cron job for daily maintenance
SELECT cron.schedule(
  '0 3 * * *', -- Every day at 3 AM
  $$UPDATE rentals SET status = 'completed' 
    WHERE status = 'confirmed' AND end_date < NOW()$$
);
