-- Clear existing data (for testing purposes only)
TRUNCATE TABLE notifications, reviews, messages, rental_items, rentals, equipment_availability, equipment, equipment_categories, profiles RESTART IDENTITY CASCADE;

-- Insert test profiles
INSERT INTO profiles (id, email, full_name, role, avatar_url, phone, billing_address) VALUES
-- Regular users
('11111111-1111-1111-1111-111111111111', 'user1@example.com', 'John Doe', 'user', 'https://example.com/avatars/user1.jpg', '+15551234567', '{"street": "123 Main St", "city": "Anytown", "state": "CA", "zip": "90210", "country": "USA"}'),
('22222222-2222-2222-2222-222222222222', 'user2@example.com', 'Jane Smith', 'user', 'https://example.com/avatars/user2.jpg', '+15552345678', '{"street": "456 Oak Ave", "city": "Somewhere", "state": "NY", "zip": "10001", "country": "USA"}'),
-- Equipment owners
('33333333-3333-3333-3333-333333333333', 'owner1@example.com', 'Bob Johnson', 'owner', 'https://example.com/avatars/owner1.jpg', '+15553456789', '{"street": "789 Pine Rd", "city": "Elsewhere", "state": "TX", "zip": "75001", "country": "USA"}'),
('44444444-4444-4444-4444-444444444444', 'owner2@example.com', 'Alice Williams', 'owner', 'https://example.com/avatars/owner2.jpg', '+15554567890', '{"street": "321 Elm Blvd", "city": "Nowhere", "state": "FL", "zip": "33101", "country": "USA"}'),
-- Admin
('55555555-5555-5555-5555-555555555555', 'admin@example.com', 'Admin User', 'admin', 'https://example.com/avatars/admin.jpg', '+15555678901', '{"street": "555 Admin Way", "city": "Everywhere", "state": "CA", "zip": "90210", "country": "USA"}');

-- Insert equipment categories
INSERT INTO equipment_categories (name, description, icon) VALUES
('Cycling', 'Bicycles and cycling accessories', 'bicycle'),
('Water Sports', 'Kayaks, paddleboards, and water gear', 'water'),
('Winter Sports', 'Skis, snowboards, and winter equipment', 'snowflake'),
('Camping', 'Tents, sleeping bags, and camping gear', 'camping'),
('Fitness', 'Exercise equipment and accessories', 'dumbbell'),
('Other', 'Miscellaneous sports equipment', 'sports');

-- Insert test equipment (with location data)
INSERT INTO equipment (
  id, owner_id, name, description, category_id, 
  price_hour, price_day, price_week, price_month, 
  location, address, city, state, postal_code,
  tracking_type, quantity, images, status, condition, deposit_amount, rules, features
) VALUES
-- Bulk items (quantity-based)
('66666666-6666-6666-6666-666666666666', '33333333-3333-3333-3333-333333333333', 
 'Mountain Bike', 'Premium full-suspension mountain bike, size L', 1,
 5, 25, 150, 500,
 ST_SetSRID(ST_MakePoint(-118.243683, 34.052235), 4326),
 '123 Adventure Way', 'Los Angeles', 'CA', '90001',
 'bulk', 3, 
 ARRAY['https://example.com/equipment/bike1.jpg', 'https://example.com/equipment/bike2.jpg'],
 'available', 'excellent', 200,
 ARRAY['Helmet required', 'No off-road stunts'], 
 ARRAY['Full suspension', '27.5" wheels', '21-speed']),

('77777777-7777-7777-7777-777777777777', '33333333-3333-3333-3333-333333333333',
 'Camping Tent', '4-person dome tent with rain fly', 4,
 NULL, 30, 180, 600,
 ST_SetSRID(ST_MakePoint(-118.250842, 34.043925), 4326),
 '456 Outdoor Lane', 'Los Angeles', 'CA', '90002',
 'bulk', 5,
 ARRAY['https://example.com/equipment/tent1.jpg', 'https://example.com/equipment/tent2.jpg'],
 'available', 'good', 100,
 ARRAY['No smoking inside', 'Must be cleaned after use'],
 ARRAY['Waterproof', 'Ventilated', 'Easy setup']),

-- Serialized items (individual tracking)
('88888888-8888-8888-8888-888888888888', '44444444-4444-4444-4444-444444444444',
 'Kayak', 'Single-person touring kayak with paddle', 2,
 10, 50, 250, 800,
 ST_SetSRID(ST_MakePoint(-118.256789, 34.047123), 4326),
 '789 Marina Drive', 'Santa Monica', 'CA', '90401',
 'serial', 1,
 ARRAY['https://example.com/equipment/kayak1.jpg', 'https://example.com/equipment/kayak2.jpg'],
 'available', 'excellent', 300,
 ARRAY['Life jacket required', 'No ocean use in high surf'],
 ARRAY['Lightweight', 'Storage compartment', 'Adjustable footrests']),

('99999999-9999-9999-9999-999999999999', '44444444-4444-4444-4444-444444444444',
 'Snowboard Package', 'Complete snowboard with boots and bindings', 3,
 NULL, 40, 220, 700,
 ST_SetSRID(ST_MakePoint(-118.260123, 34.049456), 4326),
 '321 Mountain Ave', 'Big Bear', 'CA', '92315',
 'serial', 1,
 ARRAY['https://example.com/equipment/snowboard1.jpg', 'https://example.com/equipment/snowboard2.jpg'],
 'available', 'good', 250,
 ARRAY['Must wax after use', 'No rails or jumps'],
 ARRAY['All-mountain board', 'Medium flex', 'Size 10 boots']);

-- Set up equipment availability (block out some dates)
INSERT INTO equipment_availability (equipment_id, date, available, price_override) VALUES
-- Mountain bike unavailable on specific dates
('66666666-6666-6666-6666-666666666666', CURRENT_DATE + 7, FALSE, NULL),
('66666666-6666-6666-6666-666666666666', CURRENT_DATE + 8, FALSE, NULL),
-- Special pricing for tent on holidays
('77777777-7777-7777-7777-777777777777', CURRENT_DATE + 14, TRUE, 40),
('77777777-7777-7777-7777-777777777777', CURRENT_DATE + 15, TRUE, 40);

-- Create test rentals
INSERT INTO rentals (
  id, equipment_id, user_id, start_date, end_date, duration_days, 
  total_price, status, payment_intent_id, payment_method, notes
) VALUES
-- Completed rental (past)
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
 '66666666-6666-6666-6666-666666666666', '11111111-1111-1111-1111-111111111111',
 CURRENT_DATE - 10, CURRENT_DATE - 7, 3,
 75, 'completed', 'pi_1', 'card_visa', 'Customer requested early return'),

-- Current rental (ongoing)
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 
 '88888888-8888-8888-8888-888888888888', '22222222-2222-2222-2222-222222222222',
 CURRENT_DATE - 1, CURRENT_DATE + 2, 3,
 150, 'confirmed', 'pi_2', 'card_mastercard', 'Will pick up at 10am'),

-- Upcoming rental (future)
('cccccccc-cccc-cccc-cccc-cccccccccccc', 
 '77777777-7777-7777-7777-777777777777', '11111111-1111-1111-1111-111111111111',
 CURRENT_DATE + 5, CURRENT_DATE + 7, 2,
 60, 'confirmed', 'pi_3', 'card_amex', 'Camping trip'),

-- Pending rental (awaiting confirmation)
('dddddddd-dddd-dddd-dddd-dddddddddddd', 
 '99999999-9999-9999-9999-999999999999', '22222222-2222-2222-2222-222222222222',
 CURRENT_DATE + 10, CURRENT_DATE + 12, 2,
 80, 'pending', NULL, NULL, 'Weekend ski trip'),

-- Cancelled rental
('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', 
 '66666666-6666-6666-6666-666666666666', '22222222-2222-2222-2222-222222222222',
 CURRENT_DATE - 5, CURRENT_DATE - 3, 2,
 50, 'cancelled', 'pi_4', 'card_visa', 'Changed plans');

-- Add rental items for serialized equipment
INSERT INTO rental_items (rental_id, equipment_id, serial_code, returned, return_condition) VALUES
-- Kayak rental (ongoing)
('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '88888888-8888-8888-8888-888888888888', 'KAYAK-001', FALSE, NULL),

-- Snowboard rental (pending)
('dddddddd-dddd-dddd-dddd-dddddddddddd', '99999999-9999-9999-9999-999999999999', 'SNOW-001', FALSE, NULL),

-- Completed kayak rental
('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '66666666-6666-6666-6666-666666666666', 'BIKE-001', TRUE, 'good');

-- Create test messages
INSERT INTO messages (sender_id, receiver_id, rental_id, content, read) VALUES
-- User to owner about a rental
('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333', 
 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
 'Hi, can I extend my rental by one more day?', TRUE),

-- Owner reply
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 
 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 
 'Sure, that would be $25 for the extra day. Let me know if you want to proceed.', FALSE),

-- User to owner about equipment
('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444', 
 NULL, 
 'Do you provide life jackets with the kayak rental?', TRUE),

-- Owner reply
('44444444-4444-4444-4444-444444444444', '22222222-2222-2222-2222-222222222222', 
 NULL, 
 'Yes, we include life jackets at no extra cost. What size do you need?', FALSE);

-- Create test reviews
INSERT INTO reviews (
  reviewer_id, target_id, equipment_id, rental_id, rating, comment, response
) VALUES
-- User reviews equipment
('11111111-1111-1111-1111-111111111111', '33333333-3333-3333-3333-333333333333',
 '66666666-6666-6666-6666-666666666666', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
 5, 'Great bike! Well maintained and perfect for the trails.', 
 'Thanks for your review! We''re glad you enjoyed it.'),

-- User reviews owner
('22222222-2222-2222-2222-222222222222', '44444444-4444-4444-4444-444444444444',
 NULL, NULL,
 4, 'Alice was very responsive and the kayak was in excellent condition.', NULL),

-- Owner reviews user
('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
 NULL, NULL,
 5, 'John took great care of our bike and returned it on time. Would rent to him again!', NULL);

-- Create test notifications
INSERT INTO notifications (user_id, type, message, related_id, read) VALUES
-- User notifications
('11111111-1111-1111-1111-111111111111', 'rental_confirmed', 
 'Your rental #aaaa has been confirmed', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', TRUE),

('11111111-1111-1111-1111-111111111111', 'message_received', 
 'You have a new message from Bob Johnson', NULL, FALSE),

-- Owner notifications
('33333333-3333-3333-3333-333333333333', 'new_rental', 
 'New rental request for Mountain Bike', 'cccccccc-cccc-cccc-cccc-cccccccccccc', FALSE),

('44444444-4444-4444-4444-444444444444', 'review_received', 
 'You received a new 4-star review from Jane Smith', NULL, TRUE);
