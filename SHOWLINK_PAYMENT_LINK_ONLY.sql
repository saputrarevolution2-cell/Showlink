-- SHOWLINK — LOGIN + PAYMENT LINK ONLY MASTER DATABASE
-- Fresh Supabase database foundation. Payment Link only, with secure Admin Panel controls.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- PROFILES
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username text NOT NULL UNIQUE,
  auth_email text,
  display_name text,
  avatar_url text,
  bio text,
  country text,
  balance numeric(18,2) NOT NULL DEFAULT 0 CHECK (balance >= 0),
  pending_balance numeric(18,2) NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
  total_earned numeric(18,2) NOT NULL DEFAULT 0 CHECK (total_earned >= 0),
  total_withdrawn numeric(18,2) NOT NULL DEFAULT 0 CHECK (total_withdrawn >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS auth_email text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS display_name text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS avatar_url text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS country text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS balance numeric(18,2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS pending_balance numeric(18,2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_earned numeric(18,2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS total_withdrawn numeric(18,2) DEFAULT 0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS updated_at timestamptz DEFAULT now();

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'free';
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_plan_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_plan_check CHECK (plan IN ('free','vip','premium'));

-- PAYMENT LINKS
-- /p/{slug}
--
-- A payment link is a checkout gate for content.
-- After successful payment, the buyer gets access to the
-- configured delivery/content.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payment_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  description text NOT NULL DEFAULT '',
  thumbnail_url text,

  price numeric(18,2) NOT NULL CHECK (price > 0),
  currency text NOT NULL DEFAULT 'IDR',

  content_html text NOT NULL DEFAULT '',
  content_text text NOT NULL DEFAULT '',

  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','active','paused','expired','deleted')),

  expires_at timestamptz,

  max_sales bigint,
  sales_count bigint NOT NULL DEFAULT 0 CHECK (sales_count >= 0),

  views bigint NOT NULL DEFAULT 0 CHECK (views >= 0),
  unique_views bigint NOT NULL DEFAULT 0 CHECK (unique_views >= 0),

  success_title text NOT NULL DEFAULT 'Pembayaran berhasil',
  success_message text NOT NULL DEFAULT 'Pembayaran berhasil. Konten kamu sudah dapat dibuka.',

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (price >= 100),
  CHECK (max_sales IS NULL OR max_sales > 0)
);

CREATE INDEX IF NOT EXISTS payment_links_owner_idx
  ON public.payment_links(owner_id);
CREATE INDEX IF NOT EXISTS payment_links_status_idx
  ON public.payment_links(status);

-- PAYMENT LINK ACCESS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.content_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  buyer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  guest_access_token text,

  payment_link_id uuid REFERENCES public.payment_links(id) ON DELETE CASCADE,
  order_id uuid,

  access_type text NOT NULL DEFAULT 'paid'
    CHECK (access_type IN ('paid','free','admin')),

  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,

  UNIQUE (buyer_id, payment_link_id),
  CHECK (buyer_id IS NOT NULL OR guest_access_token IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS content_access_buyer_idx
  ON public.content_access(buyer_id);
CREATE INDEX IF NOT EXISTS content_access_payment_link_idx
  ON public.content_access(payment_link_id);
CREATE INDEX IF NOT EXISTS content_access_guest_token_idx
  ON public.content_access(guest_access_token);
CREATE UNIQUE INDEX IF NOT EXISTS content_access_guest_payment_uidx
  ON public.content_access(guest_access_token, payment_link_id)
  WHERE guest_access_token IS NOT NULL;

-- ORDERS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  buyer_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  seller_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  payment_link_id uuid REFERENCES public.payment_links(id) ON DELETE SET NULL,

  order_number text NOT NULL UNIQUE,

  item_title text NOT NULL DEFAULT '',
  amount numeric(18,2) NOT NULL CHECK (amount >= 0),
  currency text NOT NULL DEFAULT 'IDR',

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN (
      'pending','waiting_payment','paid','processing',
      'completed','failed','cancelled','expired','refunded'
    )),

  payment_reference text,
  provider text,
  provider_order_id text,

  guest_access_token text,

  gateway_payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  paid_at timestamptz,
  completed_at timestamptz,
  expires_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),

  CHECK (buyer_id IS NOT NULL OR guest_access_token IS NOT NULL)
);

CREATE UNIQUE INDEX IF NOT EXISTS orders_payment_reference_uidx
  ON public.orders(payment_reference)
  WHERE payment_reference IS NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS orders_provider_order_uidx
  ON public.orders(provider, provider_order_id)
  WHERE provider IS NOT NULL AND provider_order_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS orders_buyer_idx
  ON public.orders(buyer_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_seller_idx
  ON public.orders(seller_id, created_at DESC);
CREATE INDEX IF NOT EXISTS orders_payment_link_idx
  ON public.orders(payment_link_id, created_at DESC);

-- PAYMENTS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,

  provider text NOT NULL,
  payment_method text,
  provider_payment_id text,
  invoice_id text,

  amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  fee numeric(18,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  net_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (net_amount >= 0),

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','paid','failed','expired','refunded','cancelled')),

  checkout_url text,
  qr_string text,

  provider_payload jsonb NOT NULL DEFAULT '{}'::jsonb,

  paid_at timestamptz,
  expired_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payments_order_idx
  ON public.payments(order_id);
CREATE INDEX IF NOT EXISTS payments_status_idx
  ON public.payments(status);

CREATE UNIQUE INDEX IF NOT EXISTS payments_provider_payment_uidx
  ON public.payments(provider, provider_payment_id)
  WHERE provider_payment_id IS NOT NULL;

-- INTERNAL SETTLEMENT
-- IMPORTANT: seller/platform split is private backend data.
-- ============================================================

CREATE TABLE IF NOT EXISTS public.order_settlements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL UNIQUE REFERENCES public.orders(id) ON DELETE CASCADE,
  seller_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,

  gross_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (gross_amount >= 0),
  payment_fee numeric(18,2) NOT NULL DEFAULT 0 CHECK (payment_fee >= 0),

  seller_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (seller_amount >= 0),
  platform_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (platform_amount >= 0),

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','held','released','refunded')),

  available_at timestamptz,
  released_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.platform_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  source text NOT NULL DEFAULT 'payment_link',
  description text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Non-unique lookup index. Settlement uses a transaction advisory lock
-- so existing historical duplicate rows cannot make this migration fail.
CREATE INDEX IF NOT EXISTS platform_earnings_order_idx
  ON public.platform_earnings(order_id)
  WHERE order_id IS NOT NULL;

-- WALLETS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.wallets (
  user_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  available_balance numeric(18,2) NOT NULL DEFAULT 0 CHECK (available_balance >= 0),
  pending_balance numeric(18,2) NOT NULL DEFAULT 0 CHECK (pending_balance >= 0),
  lifetime_earned numeric(18,2) NOT NULL DEFAULT 0 CHECK (lifetime_earned >= 0),
  lifetime_withdrawn numeric(18,2) NOT NULL DEFAULT 0 CHECK (lifetime_withdrawn >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  type text NOT NULL
    CHECK (type IN ('earning','withdrawal','refund','adjustment','release','reversal')),

  direction text NOT NULL
    CHECK (direction IN ('credit','debit')),

  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  balance_before numeric(18,2) NOT NULL DEFAULT 0,
  balance_after numeric(18,2) NOT NULL DEFAULT 0,

  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  withdrawal_id uuid,

  description text NOT NULL DEFAULT '',
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS wallet_transactions_user_idx
  ON public.wallet_transactions(user_id, created_at DESC);

-- WITHDRAWALS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.withdrawal_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  method_type text NOT NULL,
  account_name text NOT NULL,
  account_number text NOT NULL,

  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  is_default boolean NOT NULL DEFAULT false,
  is_active boolean NOT NULL DEFAULT true,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  method_id uuid REFERENCES public.withdrawal_methods(id) ON DELETE SET NULL,

  amount numeric(18,2) NOT NULL CHECK (amount > 0),
  fee numeric(18,2) NOT NULL DEFAULT 0 CHECK (fee >= 0),
  net_amount numeric(18,2) NOT NULL DEFAULT 0 CHECK (net_amount >= 0),

  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','processing','paid','rejected','cancelled')),

  admin_note text,
  provider_reference text,
  processed_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  processed_at timestamptz,

  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS withdrawals_user_idx
  ON public.withdrawals(user_id, created_at DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE c.conname = 'wallet_transactions_withdrawal_fk'
      AND n.nspname = 'public'
      AND t.relname = 'wallet_transactions'
  ) THEN
    ALTER TABLE public.wallet_transactions
      ADD CONSTRAINT wallet_transactions_withdrawal_fk
      FOREIGN KEY (withdrawal_id)
      REFERENCES public.withdrawals(id)
      ON DELETE SET NULL;
  END IF;
END
$$;

-- NOTIFICATIONS
-- ============================================================

CREATE TABLE IF NOT EXISTS public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,

  type text NOT NULL,
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  link_url text,

  is_read boolean NOT NULL DEFAULT false,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,

  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON public.notifications(user_id, created_at DESC);


CREATE OR REPLACE FUNCTION public.showlink_touch_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at=now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.showlink_touch_updated_at();

-- PROFILE CREATION FROM SUPABASE AUTH
-- ============================================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  base_username text;
  final_username text;
BEGIN
  base_username := lower(
    regexp_replace(
      coalesce(new.raw_user_meta_data->>'username',
               split_part(coalesce(new.email,''),'@',1),
               'user'),
      '[^a-zA-Z0-9_]+', '', 'g'
    )
  );

  IF base_username = '' THEN
    base_username := 'user';
  END IF;

  final_username := left(base_username, 24);

  IF EXISTS (SELECT 1 FROM public.profiles WHERE username = final_username) THEN
    final_username := left(base_username, 18) || '_' ||
      substr(replace(gen_random_uuid()::text,'-',''),1,6);
  END IF;

  INSERT INTO public.profiles (
    id, username, auth_email, display_name
  )
  VALUES (
    new.id,
    final_username,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', final_username)
  )
  ON CONFLICT (id) DO UPDATE
  SET auth_email = excluded.auth_email,
      updated_at = now();

  INSERT INTO public.wallets (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;

  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created_showlink ON auth.users;
CREATE TRIGGER on_auth_user_created_showlink
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.showlink_random_slug(p_length integer DEFAULT 6) RETURNS text LANGUAGE plpgsql VOLATILE AS $$ DECLARE s text; BEGIN LOOP s:=lower(substr(encode(gen_random_bytes(8),'hex'),1,greatest(4,least(p_length,16)))); EXIT WHEN NOT EXISTS(SELECT 1 FROM public.payment_links WHERE slug=s); END LOOP; RETURN s; END; $$;


-- 4. Buyer price calculator.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_payment_link_buyer_price(
  p_original_amount numeric,
  p_buyer_id uuid DEFAULT NULL
)
RETURNS TABLE (
  original_amount numeric,
  buyer_plan text,
  buyer_price_percent numeric,
  buyer_amount numeric,
  platform_fee_percent numeric,
  platform_fee_amount numeric,
  seller_amount numeric
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_plan text := 'guest';
  v_percent numeric := 100.00;
  v_platform_percent numeric := 20.00;
  v_buyer_amount numeric;
  v_platform_amount numeric;
  v_seller_amount numeric;
BEGIN
  IF p_original_amount IS NULL OR p_original_amount <= 0 THEN
    RAISE EXCEPTION 'INVALID_PAYMENT_LINK_AMOUNT';
  END IF;

  -- Never trust a caller-supplied buyer UUID.
  -- Logged-in buyers are priced from auth.uid(); anonymous buyers are guests.
  IF auth.uid() IS NOT NULL THEN
    SELECT lower(coalesce(plan, 'free'))
      INTO v_plan
    FROM public.profiles
    WHERE id = auth.uid();

    v_plan := coalesce(v_plan, 'free');

    IF v_plan NOT IN ('free','vip','premium') THEN
      v_plan := 'free';
    END IF;
  ELSE
    v_plan := 'guest';
  END IF;

  SELECT
    CASE v_plan
      WHEN 'vip' THEN vip_percent
      WHEN 'premium' THEN premium_percent
      WHEN 'free' THEN free_percent
      ELSE guest_percent
    END,
    cfg.platform_fee_percent
  INTO v_percent, v_platform_percent
  FROM public.payment_link_pricing_config AS cfg
  WHERE id = true;

  v_percent := coalesce(v_percent, 100.00);
  v_platform_percent := coalesce(v_platform_percent, 20.00);

  v_buyer_amount := round(p_original_amount * v_percent / 100.00, 2);
  v_platform_amount := round(v_buyer_amount * v_platform_percent / 100.00, 2);
  v_seller_amount := round(v_buyer_amount - v_platform_amount, 2);

  RETURN QUERY
  SELECT
    round(p_original_amount, 2),
    v_plan,
    v_percent,
    v_buyer_amount,
    v_platform_percent,
    v_platform_amount,
    v_seller_amount;
END;
$$;

GRANT EXECUTE
ON FUNCTION public.get_payment_link_buyer_price(numeric, uuid)
TO anon, authenticated;

-- 5. Canonical checkout order.
--
-- This replaces the Master function so pricing is calculated
-- BEFORE orders.amount is inserted.
--
-- Cashi must use:
--   returned amount == orders.amount
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.create_checkout_order(
  p_payment_link_id uuid,
  p_guest_access_token text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  v_link public.payment_links%ROWTYPE;
  v_order_id uuid;
  v_order_number text;
  v_buyer uuid;
  v_original_amount numeric;
  v_buyer_plan text;
  v_buyer_price_percent numeric;
  v_buyer_amount numeric;
  v_platform_fee_percent numeric;
  v_platform_fee_amount numeric;
  v_seller_amount numeric;
BEGIN
  IF auth.uid() IS NULL
     AND coalesce(trim(p_guest_access_token),'') = '' THEN
    RAISE EXCEPTION 'AUTH_OR_GUEST_TOKEN_REQUIRED';
  END IF;

  SELECT * INTO v_link
  FROM public.payment_links
  WHERE id = p_payment_link_id
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_sales IS NULL OR sales_count < max_sales);

  IF NOT FOUND THEN
    RAISE EXCEPTION 'PAYMENT_LINK_NOT_AVAILABLE';
  END IF;

  v_buyer := auth.uid();

  -- Creator cannot purchase their own Payment Link.
  IF v_buyer IS NOT NULL AND v_buyer = v_link.owner_id THEN
    RAISE EXCEPTION 'CANNOT_BUY_OWN_PAYMENT_LINK';
  END IF;

  -- Logged-in buyers who already have access do not pay again.
  IF v_buyer IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.content_access
    WHERE payment_link_id = v_link.id
      AND buyer_id = v_buyer
  ) THEN
    RETURN jsonb_build_object(
      'ok', true,
      'already_accessible', true,
      'payment_link_id', v_link.id,
      'amount', 0,
      'currency', v_link.currency,
      'checkout_url', 'https://showlink.my.id/p/' || v_link.slug
    );
  END IF;

  -- Calculate the actual buyer amount before creating the order.
  SELECT
    p.original_amount,
    p.buyer_plan,
    p.buyer_price_percent,
    p.buyer_amount,
    p.platform_fee_percent,
    p.platform_fee_amount,
    p.seller_amount
  INTO
    v_original_amount,
    v_buyer_plan,
    v_buyer_price_percent,
    v_buyer_amount,
    v_platform_fee_percent,
    v_platform_fee_amount,
    v_seller_amount
  FROM public.get_payment_link_buyer_price(v_link.price, v_buyer) p;

  -- Cashi minimum is Rp2,000.
  IF v_buyer_amount < 2000 THEN
    RAISE EXCEPTION
      'PAYMENT_AMOUNT_BELOW_CASHI_MINIMUM:%',
      v_buyer_amount;
  END IF;

  v_order_number := public.showlink_order_number();

  INSERT INTO public.orders (
    buyer_id,
    seller_id,
    payment_link_id,
    order_number,
    item_title,
    amount,
    currency,
    status,
    guest_access_token,
    expires_at,
    original_amount,
    buyer_plan,
    buyer_price_percent,
    platform_fee_percent,
    platform_fee_amount,
    seller_amount
  )
  VALUES (
    v_buyer,
    v_link.owner_id,
    v_link.id,
    v_order_number,
    v_link.title,
    v_buyer_amount,
    v_link.currency,
    'pending',
    NULLIF(trim(p_guest_access_token), ''),
    now() + interval '30 minutes',
    v_original_amount,
    v_buyer_plan,
    v_buyer_price_percent,
    v_platform_fee_percent,
    v_platform_fee_amount,
    v_seller_amount
  )
  RETURNING id INTO v_order_id;

  RETURN jsonb_build_object(
    'ok', true,
    'already_accessible', false,
    'order_id', v_order_id,
    'order_number', v_order_number,
    'amount', v_buyer_amount,
    'original_amount', v_original_amount,
    'buyer_plan', v_buyer_plan,
    'buyer_price_percent', v_buyer_price_percent,
    'platform_fee_percent', v_platform_fee_percent,
    'platform_fee_amount', v_platform_fee_amount,
    'seller_amount', v_seller_amount,
    'currency', v_link.currency,
    'payment_link_id', v_link.id,
    'checkout_url', 'https://showlink.my.id/p/' || v_link.slug
  );
END;
$$;

REVOKE ALL ON FUNCTION public.create_checkout_order(uuid,text) FROM PUBLIC;
GRANT EXECUTE
ON FUNCTION public.create_checkout_order(uuid,text)
TO anon, authenticated;

-- 6. Settlement = 80% seller / 20% platform of ACTUAL amount.
--
-- This is intentionally tied to orders.amount, which is the
-- amount already sent to Cashi.
-- ------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.settle_paid_order(
  p_order_id uuid,
  p_provider text DEFAULT NULL,
  p_provider_payment_id text DEFAULT NULL,
  p_provider_payload jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path=public,extensions
AS $$
DECLARE
  v_order public.orders%ROWTYPE;
  v_seller numeric(18,2);
  v_platform numeric(18,2);
  v_available_at timestamptz;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended('showlink-payment-link-settlement:'||p_order_id::text,0));
  SELECT * INTO v_order FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'ORDER_NOT_FOUND'; END IF;
  IF v_order.status IN ('paid','completed') THEN RETURN jsonb_build_object('ok',true,'already_settled',true,'order_id',v_order.id); END IF;

  v_platform := round(v_order.amount*20.00/100.00,2);
  v_seller := round(v_order.amount-v_platform,2);
  v_available_at := now()+interval '2 days';

  UPDATE public.orders SET status='paid',paid_at=now(),updated_at=now(),payment_reference=coalesce(payment_reference,p_provider_payment_id),provider=coalesce(p_provider,provider),provider_order_id=coalesce(provider_order_id,p_provider_payment_id),platform_fee_percent=20,platform_fee_amount=v_platform,seller_amount=v_seller,gateway_payload=coalesce(p_provider_payload,'{}'::jsonb) WHERE id=v_order.id;

  INSERT INTO public.order_settlements(order_id,seller_id,gross_amount,payment_fee,seller_amount,platform_amount,status,available_at)
  VALUES(v_order.id,v_order.seller_id,v_order.amount,0,v_seller,v_platform,'held',v_available_at)
  ON CONFLICT(order_id) DO UPDATE SET gross_amount=excluded.gross_amount,seller_amount=excluded.seller_amount,platform_amount=excluded.platform_amount,status='held',available_at=excluded.available_at,updated_at=now();

  INSERT INTO public.platform_earnings(order_id,amount,source,description)
  SELECT v_order.id,v_platform,'payment_link','Payment Link platform fee 20%'
  WHERE NOT EXISTS(SELECT 1 FROM public.platform_earnings WHERE order_id=v_order.id);

  IF v_order.seller_id IS NOT NULL THEN
    INSERT INTO public.wallets(user_id) VALUES(v_order.seller_id) ON CONFLICT(user_id) DO NOTHING;
    UPDATE public.wallets SET pending_balance=pending_balance+v_seller,lifetime_earned=lifetime_earned+v_seller,updated_at=now() WHERE user_id=v_order.seller_id;
    UPDATE public.profiles SET pending_balance=pending_balance+v_seller,total_earned=total_earned+v_seller,updated_at=now() WHERE id=v_order.seller_id;
    INSERT INTO public.wallet_transactions(user_id,type,direction,amount,balance_before,balance_after,order_id,description)
    SELECT v_order.seller_id,'earning','credit',v_seller,w.pending_balance-v_seller,w.pending_balance,v_order.id,'Payment Link sale — pending H+2' FROM public.wallets w WHERE w.user_id=v_order.seller_id;
    INSERT INTO public.notifications(user_id,type,title,message,link_url) VALUES(v_order.seller_id,'order','Pembayaran berhasil',format('Order %s berhasil dibayar. Rp%s masuk saldo pending dan tersedia setelah H+2.',v_order.order_number,to_char(v_seller,'FM999G999G999G990D00')),'/withdraw.html');
  END IF;
  UPDATE public.payment_links SET sales_count=sales_count+1,updated_at=now() WHERE id=v_order.payment_link_id;
  PERFORM public.grant_payment_access(v_order.id);
  RETURN jsonb_build_object('ok',true,'order_id',v_order.id,'settled',true,'gross_amount',v_order.amount,'platform_fee',v_platform,'seller_amount',v_seller,'available_at',v_available_at);
END; $$;
REVOKE ALL ON FUNCTION public.settle_paid_order(uuid,text,text,jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.settle_paid_order(uuid,text,text,jsonb) TO service_role;

-- CREATE PAYMENT LINK
CREATE OR REPLACE FUNCTION public.create_payment_link(
  p_title text,
  p_description text,
  p_price numeric,
  p_content_html text DEFAULT '',
  p_content_text text DEFAULT '',
  p_thumbnail_url text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY INVOKER SET search_path = public, extensions
AS $$
DECLARE v_id uuid; v_slug text; v_plan text;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  SELECT lower(coalesce(plan,'free')) INTO v_plan FROM public.profiles WHERE id=auth.uid();
  IF coalesce(v_plan,'free') NOT IN ('vip','premium') THEN RAISE EXCEPTION 'PLAN_REQUIRED: Payment Link hanya tersedia untuk akun VIP dan Premium'; END IF;
  IF p_title IS NULL OR length(trim(p_title))=0 THEN RAISE EXCEPTION 'INVALID_TITLE'; END IF;
  IF p_content_text IS NULL OR length(trim(p_content_text))=0 THEN RAISE EXCEPTION 'INVALID_CONTENT'; END IF;
  IF p_price IS NULL OR p_price < 2000 OR p_price > 100000 THEN RAISE EXCEPTION 'INVALID_PRICE: Payment Link price must be between Rp2,000 and Rp100,000'; END IF;
  v_slug := public.showlink_random_slug(6);
  INSERT INTO public.payment_links(owner_id,slug,title,description,price,content_html,content_text,thumbnail_url,status,published_at)
  VALUES(auth.uid(),v_slug,trim(p_title),coalesce(p_description,''),p_price,coalesce(p_content_html,''),coalesce(p_content_text,''),p_thumbnail_url,'active',now())
  RETURNING id INTO v_id;
  RETURN jsonb_build_object('id',v_id,'slug',v_slug,'url','https://showlink.my.id/p/'||v_slug,'checkout_url','https://showlink.my.id/p/'||v_slug);
END; $$;
REVOKE ALL ON FUNCTION public.create_payment_link(text,text,numeric,text,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_payment_link(text,text,numeric,text,text,text) TO authenticated;

CREATE OR REPLACE FUNCTION public.showlink_order_number()
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE v text;
BEGIN
  LOOP
    v := 'SL-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(encode(gen_random_bytes(5),'hex'),1,10));
    EXIT WHEN NOT EXISTS(SELECT 1 FROM public.orders WHERE order_number=v);
  END LOOP;
  RETURN v;
END; $$;

CREATE OR REPLACE FUNCTION public.grant_payment_access(p_order_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE o public.orders%ROWTYPE;
BEGIN
  SELECT * INTO o FROM public.orders WHERE id=p_order_id FOR UPDATE;
  IF NOT FOUND OR o.status NOT IN ('paid','completed') THEN RAISE EXCEPTION 'ORDER_NOT_PAID'; END IF;
  IF o.payment_link_id IS NULL THEN RAISE EXCEPTION 'PAYMENT_LINK_MISSING'; END IF;
  INSERT INTO public.content_access(buyer_id,guest_access_token,payment_link_id,order_id,access_type)
  VALUES(o.buyer_id,NULLIF(trim(o.guest_access_token),''),o.payment_link_id,o.id,'paid')
  ON CONFLICT DO NOTHING;
END; $$;
REVOKE ALL ON FUNCTION public.grant_payment_access(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.grant_payment_access(uuid) TO service_role;


-- Public Payment Link lookup. Never returns protected content.
CREATE OR REPLACE FUNCTION public.get_payment_link_by_slug(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path=public,extensions
AS $$
DECLARE
  p public.payment_links%ROWTYPE;
  v_price jsonb;
BEGIN
  SELECT * INTO p
  FROM public.payment_links
  WHERE slug=trim(p_slug)
    AND status='active'
    AND (expires_at IS NULL OR expires_at > now())
    AND (max_sales IS NULL OR sales_count < max_sales)
  LIMIT 1;
  IF NOT FOUND THEN RETURN NULL; END IF;
  SELECT to_jsonb(x) INTO v_price
  FROM public.get_payment_link_buyer_price(p.price, auth.uid()) x;
  UPDATE public.payment_links SET views=views+1 WHERE id=p.id;
  RETURN jsonb_build_object(
    'id',p.id,'slug',p.slug,'title',p.title,'description',p.description,
    'thumbnail_url',p.thumbnail_url,'price',p.price,'currency',p.currency,
    'status',p.status,'buyer_amount',coalesce((v_price->>'buyer_amount')::numeric,p.price),
    'buyer_plan',coalesce(v_price->>'buyer_plan','guest'),
    'buyer_price_percent',coalesce((v_price->>'buyer_price_percent')::numeric,100)
  );
END; $$;
REVOKE ALL ON FUNCTION public.get_payment_link_by_slug(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_payment_link_by_slug(text) TO anon,authenticated;

CREATE OR REPLACE FUNCTION public.get_paid_content(p_payment_link_slug text,p_guest_access_token text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE p public.payment_links%ROWTYPE; ok boolean:=false;
BEGIN
  SELECT * INTO p FROM public.payment_links WHERE slug=trim(p_payment_link_slug) LIMIT 1;
  IF NOT FOUND THEN RETURN jsonb_build_object('unlocked',false,'error','PAYMENT_LINK_NOT_FOUND'); END IF;
  IF auth.uid() IS NOT NULL AND EXISTS(SELECT 1 FROM public.content_access WHERE payment_link_id=p.id AND buyer_id=auth.uid()) THEN ok:=true; END IF;
  IF NOT ok AND coalesce(trim(p_guest_access_token),'')<>'' AND EXISTS(SELECT 1 FROM public.content_access WHERE payment_link_id=p.id AND guest_access_token=trim(p_guest_access_token)) THEN ok:=true; END IF;
  IF NOT ok THEN RETURN jsonb_build_object('unlocked',false,'id',p.id,'slug',p.slug); END IF;
  RETURN jsonb_build_object('unlocked',true,'id',p.id,'slug',p.slug,'title',p.title,'description',p.description,'thumbnail_url',p.thumbnail_url,'price',p.price,'currency',p.currency,'content_html',p.content_html,'content_text',p.content_text,'access_type','paid');
END; $$;
REVOKE ALL ON FUNCTION public.get_paid_content(text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_paid_content(text,text) TO anon,authenticated;


-- 2. Payment Link pricing configuration.
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.payment_link_pricing_config (
  id boolean PRIMARY KEY DEFAULT true CHECK (id = true),

  free_percent numeric(5,2) NOT NULL DEFAULT 100.00,
  vip_percent numeric(5,2) NOT NULL DEFAULT 70.00,
  premium_percent numeric(5,2) NOT NULL DEFAULT 50.00,
  guest_percent numeric(5,2) NOT NULL DEFAULT 100.00,

  platform_fee_percent numeric(5,2) NOT NULL DEFAULT 20.00,

  updated_at timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT payment_link_pricing_percent_check
  CHECK (
    free_percent BETWEEN 0 AND 100
    AND vip_percent BETWEEN 0 AND 100
    AND premium_percent BETWEEN 0 AND 100
    AND guest_percent BETWEEN 0 AND 100
    AND platform_fee_percent BETWEEN 0 AND 100
  )
);

INSERT INTO public.payment_link_pricing_config (
  id,
  free_percent,
  vip_percent,
  premium_percent,
  guest_percent,
  platform_fee_percent
)
VALUES (true, 100.00, 70.00, 50.00, 100.00, 20.00)
ON CONFLICT (id) DO UPDATE
SET free_percent = EXCLUDED.free_percent,
    vip_percent = EXCLUDED.vip_percent,
    premium_percent = EXCLUDED.premium_percent,
    guest_percent = EXCLUDED.guest_percent,
    platform_fee_percent = EXCLUDED.platform_fee_percent,
    updated_at = now();

-- ------------------------------------------------------------
-- 3. Snapshot pricing on every order.
-- orders.amount = ACTUAL buyer amount sent to Cashi.
-- ------------------------------------------------------------
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS original_amount numeric(18,2);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS buyer_plan text;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS buyer_price_percent numeric(5,2);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS platform_fee_percent numeric(5,2);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS platform_fee_amount numeric(18,2);

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS seller_amount numeric(18,2);

-- Safe backfill for historical rows: preserve orders.amount.
UPDATE public.orders
SET original_amount = COALESCE(original_amount, amount)
WHERE original_amount IS NULL;

ALTER TABLE public.payment_link_pricing_config ENABLE ROW LEVEL SECURITY;
-- No direct client policy: pricing is read only by SECURITY DEFINER RPCs.




-- RLS: user-owned Payment Link data only.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawal_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS profiles_self_select ON public.profiles;
CREATE POLICY profiles_self_select ON public.profiles FOR SELECT TO authenticated USING (id=auth.uid());
DROP POLICY IF EXISTS profiles_self_update ON public.profiles;
CREATE POLICY profiles_self_update ON public.profiles FOR UPDATE TO authenticated USING (id=auth.uid()) WITH CHECK (id=auth.uid());
DROP POLICY IF EXISTS payment_links_owner_select ON public.payment_links;
CREATE POLICY payment_links_owner_select ON public.payment_links FOR SELECT TO authenticated USING (owner_id=auth.uid());
DROP POLICY IF EXISTS payment_links_owner_insert ON public.payment_links;
CREATE POLICY payment_links_owner_insert ON public.payment_links FOR INSERT TO authenticated WITH CHECK (owner_id=auth.uid());
DROP POLICY IF EXISTS payment_links_owner_update ON public.payment_links;
CREATE POLICY payment_links_owner_update ON public.payment_links FOR UPDATE TO authenticated USING (owner_id=auth.uid()) WITH CHECK (owner_id=auth.uid());
DROP POLICY IF EXISTS content_access_self ON public.content_access;
CREATE POLICY content_access_self ON public.content_access FOR SELECT TO authenticated USING (buyer_id=auth.uid());
DROP POLICY IF EXISTS orders_parties_select ON public.orders;
CREATE POLICY orders_parties_select ON public.orders FOR SELECT TO authenticated USING (buyer_id=auth.uid() OR seller_id=auth.uid());
DROP POLICY IF EXISTS wallets_self_select ON public.wallets;
CREATE POLICY wallets_self_select ON public.wallets FOR SELECT TO authenticated USING (user_id=auth.uid());
DROP POLICY IF EXISTS wallet_tx_self_select ON public.wallet_transactions;
CREATE POLICY wallet_tx_self_select ON public.wallet_transactions FOR SELECT TO authenticated USING (user_id=auth.uid());
DROP POLICY IF EXISTS withdrawal_methods_self ON public.withdrawal_methods;
CREATE POLICY withdrawal_methods_self ON public.withdrawal_methods FOR ALL TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());
DROP POLICY IF EXISTS withdrawals_self ON public.withdrawals;
CREATE POLICY withdrawals_self ON public.withdrawals FOR SELECT TO authenticated USING (user_id=auth.uid());
DROP POLICY IF EXISTS notifications_self ON public.notifications;
CREATE POLICY notifications_self ON public.notifications FOR SELECT TO authenticated USING (user_id=auth.uid());
DROP POLICY IF EXISTS notifications_self_update ON public.notifications;
CREATE POLICY notifications_self_update ON public.notifications FOR UPDATE TO authenticated USING (user_id=auth.uid()) WITH CHECK (user_id=auth.uid());

-- Due settlement release. Safe to call from the wallet page or a scheduler.
CREATE OR REPLACE FUNCTION public.release_due_settlements()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE r record; released_count integer:=0; released_amount numeric:=0;
BEGIN
  FOR r IN SELECT os.*,o.order_number FROM public.order_settlements os JOIN public.orders o ON o.id=os.order_id WHERE os.status='held' AND os.available_at IS NOT NULL AND os.available_at<=now() FOR UPDATE OF os LOOP
    IF r.seller_id IS NULL THEN UPDATE public.order_settlements SET status='released',released_at=now(),updated_at=now() WHERE id=r.id; CONTINUE; END IF;
    UPDATE public.wallets SET pending_balance=greatest(0,pending_balance-r.seller_amount),available_balance=available_balance+r.seller_amount,updated_at=now() WHERE user_id=r.seller_id;
    UPDATE public.profiles SET pending_balance=greatest(0,pending_balance-r.seller_amount),balance=balance+r.seller_amount,updated_at=now() WHERE id=r.seller_id;
    INSERT INTO public.wallet_transactions(user_id,type,direction,amount,balance_before,balance_after,order_id,description)
    SELECT r.seller_id,'release','credit',r.seller_amount,w.available_balance-r.seller_amount,w.available_balance,r.order_id,'Settlement H+2 released' FROM public.wallets w WHERE w.user_id=r.seller_id;
    UPDATE public.order_settlements SET status='released',released_at=now(),updated_at=now() WHERE id=r.id;
    INSERT INTO public.notifications(user_id,type,title,message,link_url) VALUES(r.seller_id,'settlement','Saldo tersedia',format('Settlement order %s sudah selesai. Dana Rp%s sekarang tersedia untuk withdrawal.',r.order_number,to_char(r.seller_amount,'FM999G999G999G990D00')),'/withdraw.html');
    released_count:=released_count+1; released_amount:=released_amount+r.seller_amount;
  END LOOP;
  RETURN jsonb_build_object('released_count',released_count,'released_amount',released_amount);
END; $$;
REVOKE ALL ON FUNCTION public.release_due_settlements() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.release_due_settlements() TO authenticated,service_role;

-- Secure withdrawal request: reserve available balance atomically.
CREATE OR REPLACE FUNCTION public.request_withdrawal(p_amount numeric,p_method_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE uid uuid:=auth.uid(); w public.wallets%ROWTYPE; m public.withdrawal_methods%ROWTYPE; wid uuid; fee numeric:=0; net numeric;
BEGIN
  IF uid IS NULL THEN RAISE EXCEPTION 'AUTH_REQUIRED'; END IF;
  PERFORM public.release_due_settlements();
  IF p_amount IS NULL OR p_amount < 10000 THEN RAISE EXCEPTION 'MIN_WITHDRAWAL_10000'; END IF;
  SELECT * INTO m FROM public.withdrawal_methods WHERE id=p_method_id AND user_id=uid AND is_active=true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WITHDRAWAL_METHOD_NOT_FOUND'; END IF;
  SELECT * INTO w FROM public.wallets WHERE user_id=uid FOR UPDATE;
  IF NOT FOUND OR w.available_balance < p_amount THEN RAISE EXCEPTION 'INSUFFICIENT_AVAILABLE_BALANCE'; END IF;
  net:=greatest(0,p_amount-fee);
  INSERT INTO public.withdrawals(user_id,method_id,amount,fee,net_amount,status) VALUES(uid,m.id,p_amount,fee,net,'pending') RETURNING id INTO wid;
  UPDATE public.wallets SET available_balance=available_balance-p_amount,lifetime_withdrawn=lifetime_withdrawn+p_amount,updated_at=now() WHERE user_id=uid;
  UPDATE public.profiles SET balance=greatest(0,balance-p_amount),total_withdrawn=total_withdrawn+p_amount,updated_at=now() WHERE id=uid;
  INSERT INTO public.wallet_transactions(user_id,type,direction,amount,balance_before,balance_after,withdrawal_id,description) VALUES(uid,'withdrawal','debit',p_amount,w.available_balance,w.available_balance-p_amount,wid,'Withdrawal request');
  INSERT INTO public.notifications(user_id,type,title,message,link_url) VALUES(uid,'withdrawal','Withdrawal diajukan',format('Permintaan withdrawal Rp%s berhasil dibuat.',to_char(p_amount,'FM999G999G999G990D00')),'/withdraw.html');
  RETURN jsonb_build_object('ok',true,'withdrawal_id',wid,'amount',p_amount,'net_amount',net,'status','pending');
END; $$;
REVOKE ALL ON FUNCTION public.request_withdrawal(numeric,uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(numeric,uuid) TO authenticated;


DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_payment_links_updated_at') THEN CREATE TRIGGER trg_payment_links_updated_at BEFORE UPDATE ON public.payment_links FOR EACH ROW EXECUTE FUNCTION public.showlink_touch_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_wallets_updated_at') THEN CREATE TRIGGER trg_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION public.showlink_touch_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_withdrawal_methods_updated_at') THEN CREATE TRIGGER trg_withdrawal_methods_updated_at BEFORE UPDATE ON public.withdrawal_methods FOR EACH ROW EXECUTE FUNCTION public.showlink_touch_updated_at(); END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_withdrawals_updated_at') THEN CREATE TRIGGER trg_withdrawals_updated_at BEFORE UPDATE ON public.withdrawals FOR EACH ROW EXECUTE FUNCTION public.showlink_touch_updated_at(); END IF;
END $$;

-- ============================================================
-- ADMIN PANEL — PAYMENT LINK ONLY
-- ============================================================
-- Admin access is controlled server-side through profiles.is_admin.
-- Set the first administrator after creating the account:
-- UPDATE public.profiles SET is_admin=true WHERE auth_email='YOUR_EMAIL';

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS profiles_is_admin_idx ON public.profiles(is_admin) WHERE is_admin=true;

CREATE OR REPLACE FUNCTION public.is_current_user_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path=public,extensions
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id=auth.uid()), false);
$$;
REVOKE ALL ON FUNCTION public.is_current_user_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_current_user_admin() TO authenticated;

-- Gateway switches and public platform settings. Secrets stay in Edge Function secrets.
CREATE TABLE IF NOT EXISTS public.payment_gateway_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id=true),
  cashi_enabled boolean NOT NULL DEFAULT true,
  bayargg_enabled boolean NOT NULL DEFAULT true,
  default_gateway text NOT NULL DEFAULT 'cashi' CHECK (default_gateway IN ('cashi','bayargg')),
  platform_fee_percent numeric(5,2) NOT NULL DEFAULT 20.00 CHECK (platform_fee_percent BETWEEN 0 AND 100),
  settlement_days integer NOT NULL DEFAULT 2 CHECK (settlement_days BETWEEN 0 AND 30),
  updated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.payment_gateway_settings(id) VALUES(true) ON CONFLICT(id) DO NOTHING;
ALTER TABLE public.payment_gateway_settings ENABLE ROW LEVEL SECURITY;

-- Admin dashboard summary.
CREATE OR REPLACE FUNCTION public.admin_dashboard_stats()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE result jsonb;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  SELECT jsonb_build_object(
    'users',(SELECT count(*) FROM public.profiles),
    'payment_links',(SELECT count(*) FROM public.payment_links WHERE status <> 'deleted'),
    'active_payment_links',(SELECT count(*) FROM public.payment_links WHERE status='active'),
    'orders',(SELECT count(*) FROM public.orders),
    'paid_orders',(SELECT count(*) FROM public.orders WHERE status IN ('paid','completed')),
    'pending_orders',(SELECT count(*) FROM public.orders WHERE status IN ('pending','waiting_payment','processing')),
    'gross_sales',coalesce((SELECT sum(amount) FROM public.orders WHERE status IN ('paid','completed')),0),
    'platform_earnings',coalesce((SELECT sum(amount) FROM public.platform_earnings),0),
    'pending_settlement',coalesce((SELECT sum(seller_amount) FROM public.order_settlements WHERE status='held'),0),
    'available_withdrawals',coalesce((SELECT sum(amount) FROM public.withdrawals WHERE status='pending'),0),
    'withdrawal_pending_count',(SELECT count(*) FROM public.withdrawals WHERE status='pending')
  ) INTO result;
  RETURN result;
END; $$;
REVOKE ALL ON FUNCTION public.admin_dashboard_stats() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_dashboard_stats() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_users(p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC) FROM (
    SELECT id,username,auth_email,display_name,plan,is_admin,balance,pending_balance,total_earned,total_withdrawn,created_at
    FROM public.profiles ORDER BY created_at DESC LIMIT greatest(1,least(p_limit,500))
  ) x),'[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.admin_users(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_users(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_payment_links(p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC) FROM (
    SELECT p.id,p.slug,p.title,p.price,p.currency,p.status,p.sales_count,p.views,p.unique_views,p.created_at,p.owner_id,pr.username AS owner_username
    FROM public.payment_links p LEFT JOIN public.profiles pr ON pr.id=p.owner_id
    WHERE p.status <> 'deleted' ORDER BY p.created_at DESC LIMIT greatest(1,least(p_limit,500))
  ) x),'[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.admin_payment_links(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_payment_links(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_orders(p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC) FROM (
    SELECT o.id,o.order_number,o.item_title,o.amount,o.currency,o.status,o.provider,o.provider_order_id,o.paid_at,o.created_at,
           o.seller_id,sp.username AS seller_username,o.buyer_id,bp.username AS buyer_username,o.payment_link_id
    FROM public.orders o LEFT JOIN public.profiles sp ON sp.id=o.seller_id LEFT JOIN public.profiles bp ON bp.id=o.buyer_id
    ORDER BY o.created_at DESC LIMIT greatest(1,least(p_limit,500))
  ) x),'[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.admin_orders(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_orders(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_withdrawals(p_limit integer DEFAULT 100)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  RETURN COALESCE((SELECT jsonb_agg(to_jsonb(x) ORDER BY x.created_at DESC) FROM (
    SELECT w.id,w.user_id,p.username,w.amount,w.fee,w.net_amount,w.status,w.admin_note,w.created_at,w.processed_at,
           wm.method_type,wm.account_name,wm.account_number
    FROM public.withdrawals w JOIN public.profiles p ON p.id=w.user_id
    LEFT JOIN public.withdrawal_methods wm ON wm.id=w.method_id
    ORDER BY w.created_at DESC LIMIT greatest(1,least(p_limit,500))
  ) x),'[]'::jsonb);
END; $$;
REVOKE ALL ON FUNCTION public.admin_withdrawals(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_withdrawals(integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_get_gateway_settings()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  RETURN (SELECT to_jsonb(g) FROM public.payment_gateway_settings g WHERE id=true);
END; $$;
REVOKE ALL ON FUNCTION public.admin_get_gateway_settings() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_get_gateway_settings() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_gateway_settings(
  p_cashi_enabled boolean,
  p_bayargg_enabled boolean,
  p_default_gateway text,
  p_platform_fee_percent numeric,
  p_settlement_days integer
)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE g public.payment_gateway_settings%ROWTYPE;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF NOT (p_cashi_enabled OR p_bayargg_enabled) THEN RAISE EXCEPTION 'AT_LEAST_ONE_GATEWAY_REQUIRED'; END IF;
  IF p_default_gateway NOT IN ('cashi','bayargg') THEN RAISE EXCEPTION 'INVALID_GATEWAY'; END IF;
  IF p_default_gateway='cashi' AND NOT p_cashi_enabled THEN RAISE EXCEPTION 'DEFAULT_GATEWAY_DISABLED'; END IF;
  IF p_default_gateway='bayargg' AND NOT p_bayargg_enabled THEN RAISE EXCEPTION 'DEFAULT_GATEWAY_DISABLED'; END IF;
  UPDATE public.payment_gateway_settings SET cashi_enabled=p_cashi_enabled,bayargg_enabled=p_bayargg_enabled,default_gateway=p_default_gateway,platform_fee_percent=p_platform_fee_percent,settlement_days=p_settlement_days,updated_at=now() WHERE id=true RETURNING * INTO g;
  RETURN to_jsonb(g);
END; $$;
REVOKE ALL ON FUNCTION public.admin_update_gateway_settings(boolean,boolean,text,numeric,integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_gateway_settings(boolean,boolean,text,numeric,integer) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_update_withdrawal(p_withdrawal_id uuid,p_status text,p_admin_note text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public,extensions AS $$
DECLARE w public.withdrawals%ROWTYPE; before_status text;
BEGIN
  IF NOT public.is_current_user_admin() THEN RAISE EXCEPTION 'ADMIN_REQUIRED'; END IF;
  IF p_status NOT IN ('pending','processing','paid','rejected','cancelled') THEN RAISE EXCEPTION 'INVALID_WITHDRAWAL_STATUS'; END IF;
  SELECT * INTO w FROM public.withdrawals WHERE id=p_withdrawal_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND'; END IF;
  before_status:=w.status;
  UPDATE public.withdrawals SET status=p_status,admin_note=coalesce(p_admin_note,admin_note),processed_at=CASE WHEN p_status IN ('paid','rejected','cancelled') THEN now() ELSE processed_at END,updated_at=now() WHERE id=w.id;
  IF before_status='pending' AND p_status IN ('rejected','cancelled') THEN
    UPDATE public.wallets SET available_balance=available_balance+w.amount,updated_at=now() WHERE user_id=w.user_id;
    UPDATE public.profiles SET balance=balance+w.amount,updated_at=now() WHERE id=w.user_id;
    INSERT INTO public.wallet_transactions(user_id,type,direction,amount,balance_before,balance_after,withdrawal_id,description)
    SELECT w.user_id,'reversal','credit',w.amount,wa.available_balance-w.amount,wa.available_balance,w.id,'Withdrawal dikembalikan oleh admin' FROM public.wallets wa WHERE wa.user_id=w.user_id;
  END IF;
  INSERT INTO public.notifications(user_id,type,title,message,link_url) VALUES(w.user_id,'withdrawal','Status withdrawal berubah',format('Withdrawal %s sekarang berstatus %s.',w.id,p_status),'/withdraw.html');
  RETURN jsonb_build_object('ok',true,'withdrawal_id',w.id,'status',p_status);
END; $$;
REVOKE ALL ON FUNCTION public.admin_update_withdrawal(uuid,text,text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_update_withdrawal(uuid,text,text) TO authenticated;
