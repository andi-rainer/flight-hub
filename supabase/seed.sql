-- ============================================================================
-- SEED DATA FOR LOCAL DEVELOPMENT ONLY
-- ============================================================================
-- WARNING: This file should ONLY be used for local development.
-- Do NOT run this on staging or production environments.
--
-- This seed file creates a default admin user for testing purposes.
-- Credentials are intentionally simple for local development.
-- ============================================================================

-- Create local admin user in auth.users
-- This will only work if the user doesn't already exist
DO $$
DECLARE
  admin_user_id uuid;
BEGIN
  -- Check if admin user already exists
  SELECT id INTO admin_user_id
  FROM auth.users
  WHERE email = 'admin@test.local';

  -- Only create if doesn't exist
  IF admin_user_id IS NULL THEN
    -- Insert into auth.users
    INSERT INTO auth.users (
      instance_id,
      id,
      aud,
      role,
      email,
      encrypted_password,
      email_confirmed_at,
      recovery_sent_at,
      last_sign_in_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      email_change,
      email_change_token_new,
      recovery_token
    )
    VALUES (
      '00000000-0000-0000-0000-000000000000',
      gen_random_uuid(),
      'authenticated',
      'authenticated',
      'admin@test.local',
      crypt('password123', gen_salt('bf')),
      now(),
      now(),
      now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"name":"Admin","surname":"User"}'::jsonb,
      now(),
      now(),
      '',
      '',
      '',
      ''
    )
    RETURNING id INTO admin_user_id;

    RAISE NOTICE 'Created admin user with ID: %', admin_user_id;

    -- Insert into public.users (via trigger or explicit insert)
    INSERT INTO public.users (
      id,
      email,
      name,
      surname,
      role,
      created_at,
      updated_at
    )
    VALUES (
      admin_user_id,
      'admin@test.local',
      'Admin',
      'User',
      ARRAY['board']::text[],
      now(),
      now()
    )
    ON CONFLICT (id) DO UPDATE
    SET role = ARRAY['board']::text[];

    RAISE NOTICE 'Created admin profile in public.users';
    RAISE NOTICE '======================================';
    RAISE NOTICE 'Admin user created successfully!';
    RAISE NOTICE 'Email: admin@test.local';
    RAISE NOTICE 'Password: password123';
    RAISE NOTICE 'Role: board';
    RAISE NOTICE '======================================';
  ELSE
    RAISE NOTICE 'Admin user already exists with ID: %', admin_user_id;
  END IF;
END $$;

-- Verify the user was created
DO $$
DECLARE
  user_count integer;
BEGIN
  SELECT COUNT(*) INTO user_count
  FROM public.users
  WHERE email = 'admin@test.local' AND 'board' = ANY(role);

  IF user_count > 0 THEN
    RAISE NOTICE '✓ Admin user verified in public.users';
  ELSE
    RAISE WARNING '✗ Admin user not found or missing board role';
  END IF;
END $$;
