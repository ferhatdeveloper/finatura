-- Seed data for finatura_central (optional, after 01_schema.sql)
-- Plan örnekleri; üretimde fiyatlar güncellenmelidir.

INSERT INTO public.subscription_plans (code, name_tr, description, included_kontor, price_amount, currency_code, billing_period)
VALUES
    ('trial',    'Deneme',     'Sınırlı deneme planı',           50,    0.00,   'TRY', 'one_time'),
    ('starter',  'Başlangıç',  'Küçük işletmeler için aylık',    200, 1499.00, 'TRY', 'monthly'),
    ('business', 'İşletme',    'Yoğun kullanım için aylık',      750, 3999.00, 'TRY', 'monthly'),
    ('yearly',   'Yıllık İş',  'İşletme planının yıllık hali', 9000, 39990.00,'TRY', 'yearly')
ON CONFLICT (code) DO NOTHING;
