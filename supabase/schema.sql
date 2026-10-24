-- TCGMarket : sauvegarde de la collection de chaque compte (Supabase → SQL Editor → coller → Run).
-- Une ligne par utilisateur ; chacun ne peut lire et modifier que la sienne.

create table if not exists public.collections (
  user_id uuid primary key references auth.users (id) on delete cascade,
  data jsonb not null default '[]'::jsonb,
  settings jsonb,
  updated_at timestamptz not null default now()
);

alter table public.collections enable row level security;

drop policy if exists "lire sa collection" on public.collections;
create policy "lire sa collection" on public.collections
  for select using ((select auth.uid()) = user_id);

drop policy if exists "créer sa collection" on public.collections;
create policy "créer sa collection" on public.collections
  for insert with check ((select auth.uid()) = user_id);

drop policy if exists "modifier sa collection" on public.collections;
create policy "modifier sa collection" on public.collections
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

-- Signalements « Signaler un problème » : tout le monde peut en envoyer, personne ne peut les relire depuis l'app
-- (lecture depuis le tableau de bord Supabase : Table Editor → reports).
create table if not exists public.reports (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  topic text,
  message text not null,
  email text,
  card jsonb,
  version text,
  app_lang text,
  user_id uuid default auth.uid()
);
alter table public.reports enable row level security;
drop policy if exists "envoyer un signalement" on public.reports;
create policy "envoyer un signalement" on public.reports
  for insert to anon, authenticated with check (char_length(message) between 1 and 5000);

-- Pseudos (« @pseudo ») : un par compte, unique, 3 à 20 caractères (lettres minuscules, chiffres, « _ » et « . »).
-- Chacun lit et modifie le sien ; la disponibilité d'un pseudo se vérifie sans voir les autres comptes.
create table if not exists public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_.]{3,20}$'),
  created_at timestamptz not null default now()
);
alter table public.profiles enable row level security;

drop policy if exists "lire son profil" on public.profiles;
create policy "lire son profil" on public.profiles
  for select using ((select auth.uid()) = user_id);
drop policy if exists "créer son profil" on public.profiles;
create policy "créer son profil" on public.profiles
  for insert with check ((select auth.uid()) = user_id);
drop policy if exists "modifier son profil" on public.profiles;
create policy "modifier son profil" on public.profiles
  for update using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create or replace function public.username_available(name text)
returns boolean language sql stable security definer set search_path = '' as $$
  select not exists (select 1 from public.profiles where username = lower(name));
$$;
grant execute on function public.username_available(text) to anon, authenticated;

-- À la création du compte, le pseudo choisi (métadonnée « username ») devient son profil ; un pseudo déjà pris
-- fait échouer l'inscription (aucun compte n'est créé).
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.raw_user_meta_data ? 'username' then
    insert into public.profiles (user_id, username) values (new.id, lower(new.raw_user_meta_data ->> 'username'));
  end if;
  return new;
end;
$$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Profil public (lien « …/app/u/pseudo ») : désactivé par défaut. Lecture par tous, sans compte, par la fonction
-- public_profile : pseudo, photo, collection (sans les prix payés, ni ceux de chaque exemplaire) et cartes recherchées
-- (sans les prix cibles).
alter table public.profiles add column if not exists is_public boolean not null default false;
-- Pseudo affiché (libre, 1 à 30 caractères), distinct de l'identifiant « @pseudo » ; vide : on affiche l'identifiant.
alter table public.profiles add column if not exists display_name text
  check (display_name is null or char_length(btrim(display_name)) between 1 and 30);

create or replace function public.public_profile(name text)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'username', p.username,
    'displayName', p.display_name,
    'since', p.created_at,
    'avatar', c.settings -> 'avatar',
    'collection', coalesce((select jsonb_agg(case when jsonb_typeof(e -> 'copies') = 'array'
        then jsonb_set(e - 'paid' - 'paidCurrency', '{copies}', coalesce((select jsonb_agg(x - 'paid' - 'paidCurrency') from jsonb_array_elements(e -> 'copies') x), '[]'::jsonb))
        else e - 'paid' - 'paidCurrency' end) from jsonb_array_elements(c.data) e), '[]'::jsonb),
    'wishlist', coalesce((select jsonb_agg(jsonb_build_object('card', w -> 'card')) from jsonb_array_elements(coalesce(c.settings -> 'wishlist', '[]'::jsonb)) w), '[]'::jsonb)
  )
  from public.profiles p
  left join public.collections c on c.user_id = p.user_id
  where p.username = lower(name) and p.is_public;
$$;
grant execute on function public.public_profile(text) to anon, authenticated;

-- Notifications sur le téléphone (Web Push), même appli fermée : un abonnement par appareil. Le robot qui met les
-- prix à jour (GitHub, tools/push/send.mjs) lit les abonnements et les listes de souhaits avec prix cible par
-- push_targets, protégée par un jeton dont seule l'empreinte figure ici (le jeton vient de la clé privée VAPID,
-- secret GitHub). Aucune lecture directe de la table : seulement ces fonctions.
create table if not exists public.push_subscriptions (
  endpoint text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  p256dh text not null,
  auth text not null,
  lang text,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;

create or replace function public.save_push_subscription(p_endpoint text, p_p256dh text, p_auth text, p_lang text)
returns void language sql volatile security definer set search_path = '' as $$
  insert into public.push_subscriptions (endpoint, user_id, p256dh, auth, lang)
  select p_endpoint, (select auth.uid()), p_p256dh, p_auth, p_lang where (select auth.uid()) is not null
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, lang = excluded.lang;
$$;
grant execute on function public.save_push_subscription(text, text, text, text) to authenticated;

create or replace function public.delete_push_subscription(p_endpoint text)
returns void language sql volatile security definer set search_path = '' as $$
  delete from public.push_subscriptions s where s.endpoint = p_endpoint and s.user_id = (select auth.uid());
$$;
grant execute on function public.delete_push_subscription(text) to authenticated;

create or replace function public.push_targets(token text)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if encode(sha256(convert_to(token, 'UTF8')), 'hex') <> '807d2d410571679501962a5d91e618669f456c71120933f0f05cbff4f8ca1719' then
    raise exception 'forbidden';
  end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'user', s.user_id, 'endpoint', s.endpoint, 'p256dh', s.p256dh, 'auth', s.auth, 'lang', s.lang,
      'wishlist', coalesce((select jsonb_agg(w) from jsonb_array_elements(coalesce(c.settings -> 'wishlist', '[]'::jsonb)) w
        where jsonb_typeof(w -> 'target') = 'number'), '[]'::jsonb)))
    from public.push_subscriptions s
    left join public.collections c on c.user_id = s.user_id
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.push_targets(text) from public;
grant execute on function public.push_targets(text) to anon;

create or replace function public.push_forget(token text, p_endpoint text)
returns void language plpgsql volatile security definer set search_path = '' as $$
begin
  if encode(sha256(convert_to(token, 'UTF8')), 'hex') <> '807d2d410571679501962a5d91e618669f456c71120933f0f05cbff4f8ca1719' then
    raise exception 'forbidden';
  end if;
  delete from public.push_subscriptions s where s.endpoint = p_endpoint;
end;
$$;
revoke all on function public.push_forget(text, text) from public;
grant execute on function public.push_forget(text, text) to anon;

-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
-- Pack Rush : packs virtuels (cartes originales sans valeur réelle, ni échangeables ni transférables).
-- Le serveur décide de tout : tirages, packs gratuits (recharge 12 h, horloge du serveur), Pièces et Fragments
-- (journal pr_ledger : le solde est la somme du journal, une clé unique par opération empêche les doubles
-- récompenses), quêtes du jour (jour UTC), bonus de rareté complétée, échange de Fragments. Chaque joueur lit ses
-- propres données ; personne ne peut les modifier directement : seules les fonctions pr_* écrivent.
-- Taux et barèmes : colonne rates de chaque set (modifiables sans toucher au moteur ; « version » enregistrée avec
-- chaque ouverture).
-- ═══════════════════════════════════════════════════════════════════════════════════════════════════════════════
create table if not exists public.pr_sets (
  id text primary key,
  block jsonb not null,
  name jsonb not null,
  sort int not null default 0,
  active boolean not null default true,
  pack_cost int not null default 50,
  rates jsonb not null,
  released_at date
);
create table if not exists public.pr_cards (
  id text primary key,
  set_id text not null references public.pr_sets (id),
  number int not null,
  rarity text not null check (rarity in ('C', 'U', 'R', 'SR', 'SSR')),
  name text not null,
  art jsonb not null default '{}'::jsonb
);
create index if not exists pr_cards_set on public.pr_cards (set_id, rarity);
create table if not exists public.pr_inventory (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id text not null references public.pr_cards (id),
  qty int not null check (qty > 0),
  first_at timestamptz not null default now(),
  primary key (user_id, card_id)
);
create table if not exists public.pr_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  currency text not null check (currency in ('coins', 'fragments')),
  amount int not null,
  -- Pièces achetées (remboursements) : séparées des Pièces gagnées.
  paid boolean not null default false,
  reason text not null,
  ref text not null,
  created_at timestamptz not null default now(),
  unique (user_id, currency, reason, ref)
);
create index if not exists pr_ledger_user on public.pr_ledger (user_id, currency);
create table if not exists public.pr_openings (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  set_id text not null references public.pr_sets (id),
  free boolean not null,
  cards jsonb,
  bonus int not null default 0,
  rates_version int,
  created_at timestamptz not null default now()
);
create index if not exists pr_openings_user on public.pr_openings (user_id, created_at);
-- Packs gratuits : 1 toutes les 12 h, mis de côté jusqu'à 2. Deux emplacements, chacun daté du moment où il est
-- disponible ; un pack ouvert recharge 12 h après le dernier emplacement en attente (jamais deux en même temps).
create table if not exists public.pr_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  free_at timestamptz[] not null default array['-infinity'::timestamptz, now() + interval '12 hours']
);
alter table public.pr_state alter column free_at set default array['-infinity'::timestamptz, now() + interval '12 hours'];
-- Règle précédente (1 seul emplacement) : le second se recharge 12 h après le premier.
update public.pr_state set free_at = array[free_at[1], greatest(free_at[1], now()) + interval '12 hours'] where cardinality(free_at) = 1;
-- Récompenses uniques déjà versées (rareté complétée, paliers de quêtes) et connexions du jour.
create table if not exists public.pr_claims (
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null,
  ref text not null,
  created_at timestamptz not null default now(),
  primary key (user_id, kind, ref)
);

alter table public.pr_sets enable row level security;
alter table public.pr_cards enable row level security;
alter table public.pr_inventory enable row level security;
alter table public.pr_ledger enable row level security;
alter table public.pr_openings enable row level security;
alter table public.pr_state enable row level security;
alter table public.pr_claims enable row level security;
drop policy if exists "pr catalogue" on public.pr_sets;
create policy "pr catalogue" on public.pr_sets for select using (true);
drop policy if exists "pr cartes" on public.pr_cards;
create policy "pr cartes" on public.pr_cards for select using (true);
drop policy if exists "pr inventaire" on public.pr_inventory;
create policy "pr inventaire" on public.pr_inventory for select using ((select auth.uid()) = user_id);
drop policy if exists "pr journal" on public.pr_ledger;
create policy "pr journal" on public.pr_ledger for select using ((select auth.uid()) = user_id);
drop policy if exists "pr ouvertures" on public.pr_openings;
create policy "pr ouvertures" on public.pr_openings for select using ((select auth.uid()) = user_id);
drop policy if exists "pr état" on public.pr_state;
create policy "pr état" on public.pr_state for select using ((select auth.uid()) = user_id);
drop policy if exists "pr récompenses" on public.pr_claims;
create policy "pr récompenses" on public.pr_claims for select using ((select auth.uid()) = user_id);

-- Tirage pondéré : une clé de {clé: poids}.
create or replace function public.pr_pick(weights jsonb)
returns text language plpgsql volatile set search_path = '' as $$
declare total numeric; r numeric; k text; v numeric;
begin
  select sum(value::numeric) into total from jsonb_each_text(weights);
  r := random() * total;
  for k, v in select key, value::numeric from jsonb_each_text(weights) order by key loop
    r := r - v;
    if r < 0 then return k; end if;
  end loop;
  return k;
end;
$$;

create or replace function public.pr_balance(uid uuid, cur text)
returns int language sql stable set search_path = '' as $$
  select coalesce(sum(amount), 0)::int from public.pr_ledger where user_id = uid and currency = cur;
$$;

-- Écriture au journal, une seule fois par (raison, référence) : true si elle a eu lieu.
create or replace function public.pr_credit(uid uuid, cur text, amt int, why text, key text)
returns boolean language plpgsql volatile set search_path = '' as $$
begin
  if amt = 0 then return false; end if;
  insert into public.pr_ledger (user_id, currency, amount, reason, ref) values (uid, cur, amt, why, key)
  on conflict (user_id, currency, reason, ref) do nothing;
  return found;
end;
$$;

-- Bonus de rareté complétée (une fois par rareté et par set) : [{rarity, coins}] versés maintenant.
create or replace function public.pr_completions(uid uuid, p_set text)
returns jsonb language plpgsql volatile set search_path = '' as $$
declare r record; out jsonb := '[]'::jsonb; reward int; v_rates jsonb;
begin
  select s.rates into v_rates from public.pr_sets s where s.id = p_set;
  for r in
    select c.rarity, count(*) as total, count(i.card_id) as owned
    from public.pr_cards c left join public.pr_inventory i on i.card_id = c.id and i.user_id = uid
    where c.set_id = p_set group by c.rarity
  loop
    if r.owned = r.total and r.total > 0 then
      insert into public.pr_claims (user_id, kind, ref) values (uid, 'complete', p_set || ':' || r.rarity)
      on conflict do nothing;
      if found then
        reward := coalesce((v_rates -> 'complete' ->> r.rarity)::int, 0);
        perform public.pr_credit(uid, 'coins', reward, 'complete', p_set || ':' || r.rarity);
        out := out || jsonb_build_object('rarity', r.rarity, 'coins', reward);
      end if;
    end if;
  end loop;
  return out;
end;
$$;

-- État du joueur pour un set : soldes, packs gratuits, quêtes du jour, cartes possédées, raretés complétées.
-- Enregistre la connexion du jour (quête 1).
create or replace function public.pr_status(p_set text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); day date := (now() at time zone 'utc')::date; st public.pr_state; opened int;
begin
  if uid is null then raise exception 'auth'; end if;
  insert into public.pr_state (user_id) values (uid) on conflict do nothing;
  select * into st from public.pr_state where user_id = uid;
  insert into public.pr_claims (user_id, kind, ref) values (uid, 'login', day::text) on conflict do nothing;
  select count(*) into opened from public.pr_openings
    where user_id = uid and created_at >= (day::timestamp at time zone 'utc');
  return jsonb_build_object(
    'now', now(),
    'nextDay', ((day + 1)::timestamp at time zone 'utc'),
    'coins', public.pr_balance(uid, 'coins'),
    'fragments', public.pr_balance(uid, 'fragments'),
    'free', (select count(*) from unnest(st.free_at) t where t <= now()),
    'nextFree', (select min(t) from unnest(st.free_at) t where t > now()),
    'opened', opened,
    'quests', jsonb_build_object(
      'login', true, 'open1', opened >= 1, 'open2', opened >= 2,
      'claimed2', exists (select 1 from public.pr_claims where user_id = uid and kind = 'quest' and ref = day || ':2'),
      'claimed3', exists (select 1 from public.pr_claims where user_id = uid and kind = 'quest' and ref = day || ':3')),
    'inventory', coalesce((select jsonb_object_agg(i.card_id, i.qty) from public.pr_inventory i
      join public.pr_cards c on c.id = i.card_id where i.user_id = uid and c.set_id = p_set), '{}'::jsonb),
    'completed', coalesce((select jsonb_agg(split_part(ref, ':', 2)) from public.pr_claims
      where user_id = uid and kind = 'complete' and ref like p_set || ':%'), '[]'::jsonb)
  );
end;
$$;

-- Ouverture d'un pack (gratuit ou 50 Pièces), en une seule transaction : tirage, collection, Fragments des
-- doublons, récompense bonus, raretés complétées. Renvoie les cartes tirées et le nouvel état.
create or replace function public.pr_open(p_set text, p_free boolean)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare
  uid uuid := auth.uid(); s public.pr_sets; st public.pr_state; idx int; oid bigint;
  rar text; cid text; q int; frag int; total_frag int := 0; v_cards jsonb := '[]'::jsonb; v_bonus int := 0;
  completions jsonb;
begin
  if uid is null then raise exception 'auth'; end if;
  select * into s from public.pr_sets where id = p_set and active;
  if not found then raise exception 'set'; end if;
  insert into public.pr_state (user_id) values (uid) on conflict do nothing;
  -- Un joueur à la fois : deux ouvertures simultanées ne peuvent pas utiliser le même pack ou les mêmes Pièces.
  select * into st from public.pr_state where user_id = uid for update;
  if p_free then
    select i into idx from generate_subscripts(st.free_at, 1) i where st.free_at[i] <= now() order by st.free_at[i] limit 1;
    if idx is null then raise exception 'no_free_pack'; end if;
    update public.pr_state
      set free_at[idx] = greatest(now(), (select max(t) from unnest(st.free_at) t)) + interval '12 hours'
      where user_id = uid;
  elsif public.pr_balance(uid, 'coins') < s.pack_cost then
    raise exception 'not_enough_coins';
  end if;
  insert into public.pr_openings (user_id, set_id, free, rates_version)
    values (uid, p_set, p_free, (s.rates ->> 'version')::int) returning id into oid;
  if not p_free then perform public.pr_credit(uid, 'coins', -s.pack_cost, 'pack', oid::text); end if;

  for slot in 1..5 loop
    rar := public.pr_pick(case when slot <= 4 then s.rates -> 'standard' else s.rates -> 'boosted' end);
    select c.id into cid from public.pr_cards c where c.set_id = p_set and c.rarity = rar order by random() limit 1;
    select i.qty into q from public.pr_inventory i where i.user_id = uid and i.card_id = cid;
    insert into public.pr_inventory (user_id, card_id, qty) values (uid, cid, 1)
      on conflict (user_id, card_id) do update set qty = public.pr_inventory.qty + 1;
    frag := case when q is null then 0 else coalesce((s.rates -> 'duplicate' ->> rar)::int, 0) end;
    total_frag := total_frag + frag;
    v_cards := v_cards || jsonb_build_object('id', cid, 'rarity', rar, 'new', q is null, 'fragments', frag);
  end loop;
  perform public.pr_credit(uid, 'fragments', total_frag, 'duplicates', oid::text);
  if random() < coalesce((s.rates -> 'bonus' ->> 'chance')::numeric, 0) then
    v_bonus := public.pr_pick(s.rates -> 'bonus' -> 'amounts')::int;
    perform public.pr_credit(uid, 'coins', v_bonus, 'bonus', oid::text);
  end if;
  update public.pr_openings o set cards = v_cards, bonus = v_bonus where o.id = oid;
  completions := public.pr_completions(uid, p_set);
  return jsonb_build_object('opening', oid, 'cards', v_cards, 'bonus', v_bonus, 'fragments', total_frag,
    'completions', completions, 'status', public.pr_status(p_set));
end;
$$;

-- Récompenses des quêtes du jour : 5 Pièces à 2 quêtes sur 3, puis 10 de plus à 3 sur 3 (chaque palier une fois).
create or replace function public.pr_claim_quests()
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); day date := (now() at time zone 'utc')::date; opened int; done int; got int := 0;
begin
  if uid is null then raise exception 'auth'; end if;
  insert into public.pr_claims (user_id, kind, ref) values (uid, 'login', day::text) on conflict do nothing;
  select count(*) into opened from public.pr_openings
    where user_id = uid and created_at >= (day::timestamp at time zone 'utc');
  done := 1 + (opened >= 1)::int + (opened >= 2)::int;
  if done >= 2 then
    insert into public.pr_claims (user_id, kind, ref) values (uid, 'quest', day || ':2') on conflict do nothing;
    if found and public.pr_credit(uid, 'coins', 5, 'quest', day || ':2') then got := got + 5; end if;
  end if;
  if done >= 3 then
    insert into public.pr_claims (user_id, kind, ref) values (uid, 'quest', day || ':3') on conflict do nothing;
    if found and public.pr_credit(uid, 'coins', 10, 'quest', day || ':3') then got := got + 10; end if;
  end if;
  return jsonb_build_object('coins', got);
end;
$$;

-- Échange de Fragments contre une carte manquante (prix selon la rareté).
create or replace function public.pr_craft(p_card text)
returns jsonb language plpgsql volatile security definer set search_path = '' as $$
declare uid uuid := auth.uid(); c public.pr_cards; s public.pr_sets; cost int; completions jsonb;
begin
  if uid is null then raise exception 'auth'; end if;
  select * into c from public.pr_cards where id = p_card;
  if not found then raise exception 'card'; end if;
  select * into s from public.pr_sets where id = c.set_id;
  insert into public.pr_state (user_id) values (uid) on conflict do nothing;
  perform 1 from public.pr_state where user_id = uid for update;
  if exists (select 1 from public.pr_inventory where user_id = uid and card_id = p_card) then raise exception 'owned'; end if;
  cost := (s.rates -> 'craft' ->> c.rarity)::int;
  if public.pr_balance(uid, 'fragments') < cost then raise exception 'not_enough_fragments'; end if;
  perform public.pr_credit(uid, 'fragments', -cost, 'craft', p_card);
  insert into public.pr_inventory (user_id, card_id, qty) values (uid, p_card, 1);
  completions := public.pr_completions(uid, c.set_id);
  return jsonb_build_object('card', p_card, 'cost', cost, 'completions', completions, 'status', public.pr_status(c.set_id));
end;
$$;

revoke all on function public.pr_pick(jsonb) from public;
revoke all on function public.pr_balance(uuid, text) from public;
revoke all on function public.pr_credit(uuid, text, int, text, text) from public;
revoke all on function public.pr_completions(uuid, text) from public;
revoke all on function public.pr_status(text) from public;
revoke all on function public.pr_open(text, boolean) from public;
revoke all on function public.pr_claim_quests() from public;
revoke all on function public.pr_craft(text) from public;
grant execute on function public.pr_status(text) to authenticated;
grant execute on function public.pr_open(text, boolean) to authenticated;
grant execute on function public.pr_claim_quests() to authenticated;
grant execute on function public.pr_craft(text) to authenticated;

-- Premier bloc et premier set : Origines Cosmiques · Éclats Stellaires (58 créatures cosmiques : 25 C, 15 U, 10 R, 5 SR, 3 SSR).
-- `art` : espèce dessinée (mobile/src/lib/packrush/creatures), stade, teinte et graine.
insert into public.pr_sets (id, block, name, sort, pack_cost, released_at, rates) values (
  'es1',
  '{"fr":"Origines Cosmiques","en":"Cosmic Origins","ja":"宇宙の起源","zh-tw":"宇宙起源","zh-cn":"宇宙起源","es":"Orígenes Cósmicos","it":"Origini Cosmiche","de":"Kosmische Ursprünge","nl":"Kosmische Oorsprong","pt":"Origens Cósmicas","ru":"Космические истоки","th":"ต้นกำเนิดจักรวาล","ko":"우주의 기원"}',
  '{"fr":"Éclats Stellaires","en":"Stellar Shards","ja":"星の煌めき","zh-tw":"星辰閃耀","zh-cn":"星辰闪耀","es":"Destellos Estelares","it":"Schegge Stellari","de":"Sternensplitter","nl":"Sterrenscherven","pt":"Lampejos Estelares","ru":"Звёздные осколки","th":"ประกายดวงดาว","ko":"별의 광채"}',
  1, 50, '2026-10-17',
  '{"version":1,
    "standard":{"C":60,"U":33,"R":5,"SR":1.6,"SSR":0.4},
    "boosted":{"R":70,"SR":25,"SSR":5},
    "bonus":{"chance":0.05,"amounts":{"5":60,"10":30,"15":10}},
    "duplicate":{"C":1,"U":2,"R":5,"SR":12,"SSR":30},
    "craft":{"C":8,"U":15,"R":40,"SR":100,"SSR":300},
    "complete":{"C":10,"U":15,"R":25,"SR":50,"SSR":100}}'
) on conflict (id) do update set block = excluded.block, name = excluded.name, sort = excluded.sort,
  pack_cost = excluded.pack_cost, rates = excluded.rates, released_at = excluded.released_at;

insert into public.pr_cards (id, set_id, number, rarity, name, art) values
  ('es1-001', 'es1', 1, 'C', 'Lumikit', '{"kind": "lumikit", "stage": 0, "hue": 28, "seed": 7919}'::jsonb),
  ('es1-002', 'es1', 2, 'C', 'Lunaréon', '{"kind": "lumikit", "stage": 1, "hue": 200, "seed": 15838}'::jsonb),
  ('es1-003', 'es1', 3, 'U', 'Selenvulpe', '{"kind": "lumikit", "stage": 2, "hue": 300, "seed": 23757}'::jsonb),
  ('es1-004', 'es1', 4, 'C', 'Noctimoth', '{"kind": "noctimoth", "stage": 0, "hue": 250, "seed": 31676}'::jsonb),
  ('es1-005', 'es1', 5, 'C', 'Phalénuit', '{"kind": "noctimoth", "stage": 1, "hue": 20, "seed": 39595}'::jsonb),
  ('es1-006', 'es1', 6, 'U', 'Séléniaile', '{"kind": "noctimoth", "stage": 2, "hue": 170, "seed": 47514}'::jsonb),
  ('es1-007', 'es1', 7, 'C', 'Médusel', '{"kind": "medusel", "stage": 0, "hue": 190, "seed": 55433}'::jsonb),
  ('es1-008', 'es1', 8, 'C', 'Filastra', '{"kind": "medusel", "stage": 1, "hue": 320, "seed": 63352}'::jsonb),
  ('es1-009', 'es1', 9, 'U', 'Coronéa', '{"kind": "medusel", "stage": 2, "hue": 210, "seed": 71271}'::jsonb),
  ('es1-010', 'es1', 10, 'C', 'Hibouclipse', '{"kind": "hibouclipse", "stage": 0, "hue": 40, "seed": 79190}'::jsonb),
  ('es1-011', 'es1', 11, 'C', 'Éclipsule', '{"kind": "hibouclipse", "stage": 1, "hue": 230, "seed": 87109}'::jsonb),
  ('es1-012', 'es1', 12, 'U', 'Umbrel', '{"kind": "hibouclipse", "stage": 2, "hue": 270, "seed": 95028}'::jsonb),
  ('es1-013', 'es1', 13, 'C', 'Axolume', '{"kind": "axolume", "stage": 0, "hue": 200, "seed": 102947}'::jsonb),
  ('es1-014', 'es1', 14, 'C', 'Branchiluz', '{"kind": "axolume", "stage": 1, "hue": 320, "seed": 110866}'::jsonb),
  ('es1-015', 'es1', 15, 'U', 'Cristaxolo', '{"kind": "axolume", "stage": 2, "hue": 20, "seed": 118785}'::jsonb),
  ('es1-016', 'es1', 16, 'C', 'Carapluton', '{"kind": "carapluton", "stage": 0, "hue": 30, "seed": 126704}'::jsonb),
  ('es1-017', 'es1', 17, 'C', 'Orbitortue', '{"kind": "carapluton", "stage": 1, "hue": 190, "seed": 134623}'::jsonb),
  ('es1-018', 'es1', 18, 'U', 'Mondécaille', '{"kind": "carapluton", "stage": 2, "hue": 260, "seed": 142542}'::jsonb),
  ('es1-019', 'es1', 19, 'C', 'Lapinova', '{"kind": "lapinova", "stage": 0, "hue": 220, "seed": 150461}'::jsonb),
  ('es1-020', 'es1', 20, 'C', 'Lunalièvre', '{"kind": "lapinova", "stage": 1, "hue": 30, "seed": 158380}'::jsonb),
  ('es1-021', 'es1', 21, 'U', 'Sélénalto', '{"kind": "lapinova", "stage": 2, "hue": 260, "seed": 166299}'::jsonb),
  ('es1-022', 'es1', 22, 'C', 'Cétoile', '{"kind": "cetoile", "stage": 0, "hue": 20, "seed": 174218}'::jsonb),
  ('es1-023', 'es1', 23, 'C', 'Baleinelle', '{"kind": "cetoile", "stage": 1, "hue": 140, "seed": 182137}'::jsonb),
  ('es1-024', 'es1', 24, 'U', 'Nébulène', '{"kind": "cetoile", "stage": 2, "hue": 210, "seed": 190056}'::jsonb),
  ('es1-025', 'es1', 25, 'C', 'Cervastre', '{"kind": "cervastre", "stage": 0, "hue": 30, "seed": 197975}'::jsonb),
  ('es1-026', 'es1', 26, 'C', 'Cervelune', '{"kind": "cervastre", "stage": 1, "hue": 150, "seed": 205894}'::jsonb),
  ('es1-027', 'es1', 27, 'U', 'Astrocerf', '{"kind": "cervastre", "stage": 2, "hue": 250, "seed": 213813}'::jsonb),
  ('es1-028', 'es1', 28, 'C', 'Spirago', '{"kind": "spirago", "stage": 0, "hue": 330, "seed": 221732}'::jsonb),
  ('es1-029', 'es1', 29, 'C', 'Volutoile', '{"kind": "spirago", "stage": 1, "hue": 190, "seed": 229651}'::jsonb),
  ('es1-030', 'es1', 30, 'U', 'Galactemple', '{"kind": "spirago", "stage": 2, "hue": 270, "seed": 237570}'::jsonb),
  ('es1-031', 'es1', 31, 'C', 'Drakomet', '{"kind": "drakomet", "stage": 0, "hue": 200, "seed": 245489}'::jsonb),
  ('es1-032', 'es1', 32, 'U', 'Wyvernova', '{"kind": "drakomet", "stage": 1, "hue": 300, "seed": 253408}'::jsonb),
  ('es1-033', 'es1', 33, 'R', 'Cométhéon', '{"kind": "drakomet", "stage": 2, "hue": 0, "seed": 261327}'::jsonb),
  ('es1-034', 'es1', 34, 'C', 'Lynxaure', '{"kind": "lynxaure", "stage": 0, "hue": 200, "seed": 269246}'::jsonb),
  ('es1-035', 'es1', 35, 'U', 'Boréalynx', '{"kind": "lynxaure", "stage": 1, "hue": 170, "seed": 277165}'::jsonb),
  ('es1-036', 'es1', 36, 'R', 'Aurorion', '{"kind": "lynxaure", "stage": 2, "hue": 265, "seed": 285084}'::jsonb),
  ('es1-037', 'es1', 37, 'C', 'Phenova', '{"kind": "phenova", "stage": 0, "hue": 15, "seed": 293003}'::jsonb),
  ('es1-038', 'es1', 38, 'U', 'Pyrastrel', '{"kind": "phenova", "stage": 1, "hue": 350, "seed": 300922}'::jsonb),
  ('es1-039', 'es1', 39, 'R', 'Supernovis', '{"kind": "phenova", "stage": 2, "hue": 35, "seed": 308841}'::jsonb),
  ('es1-040', 'es1', 40, 'C', 'Serpentaire', '{"kind": "serpentaire", "stage": 0, "hue": 140, "seed": 316760}'::jsonb),
  ('es1-041', 'es1', 41, 'U', 'Nébulisse', '{"kind": "serpentaire", "stage": 1, "hue": 250, "seed": 324679}'::jsonb),
  ('es1-042', 'es1', 42, 'R', 'Astrocoatl', '{"kind": "serpentaire", "stage": 2, "hue": 185, "seed": 332598}'::jsonb),
  ('es1-043', 'es1', 43, 'C', 'Météorin', '{"kind": "meteorgolem", "stage": 0, "hue": 30, "seed": 340517}'::jsonb),
  ('es1-044', 'es1', 44, 'U', 'Cristallos', '{"kind": "meteorgolem", "stage": 1, "hue": 215, "seed": 348436}'::jsonb),
  ('es1-045', 'es1', 45, 'R', 'Astrolithe', '{"kind": "meteorgolem", "stage": 2, "hue": 290, "seed": 356355}'::jsonb),
  ('es1-046', 'es1', 46, 'R', 'Colibrastre', '{"kind": "colibrastre", "stage": 0, "hue": 190, "seed": 364274}'::jsonb),
  ('es1-047', 'es1', 47, 'R', 'Scarabolide', '{"kind": "scarabolide", "stage": 0, "hue": 40, "seed": 372193}'::jsonb),
  ('es1-048', 'es1', 48, 'R', 'Hippocosme', '{"kind": "hippocosme", "stage": 0, "hue": 290, "seed": 380112}'::jsonb),
  ('es1-049', 'es1', 49, 'R', 'Pangolune', '{"kind": "pangolune", "stage": 0, "hue": 250, "seed": 388031}'::jsonb),
  ('es1-050', 'es1', 50, 'R', 'Ursaurore', '{"kind": "ursaurore", "stage": 0, "hue": 200, "seed": 395950}'::jsonb),
  ('es1-051', 'es1', 51, 'SR', 'Nébularaie', '{"kind": "nebularaie", "stage": 4, "hue": 250, "seed": 403869}'::jsonb),
  ('es1-052', 'es1', 52, 'SR', 'Abyssquid', '{"kind": "abyssquid", "stage": 4, "hue": 275, "seed": 411788}'::jsonb),
  ('es1-053', 'es1', 53, 'SR', 'Griffastre', '{"kind": "griffastre", "stage": 4, "hue": 40, "seed": 419707}'::jsonb),
  ('es1-054', 'es1', 54, 'SR', 'Koiluna', '{"kind": "koiluna", "stage": 4, "hue": 200, "seed": 427626}'::jsonb),
  ('es1-055', 'es1', 55, 'SR', 'Sphinxlipse', '{"kind": "sphinxlipse", "stage": 4, "hue": 260, "seed": 435545}'::jsonb),
  ('es1-056', 'es1', 56, 'SSR', 'Lunaphage', '{"kind": "lunaphage", "stage": 4, "hue": 235, "seed": 443464}'::jsonb),
  ('es1-057', 'es1', 57, 'SSR', 'Aeonis', '{"kind": "aeonis", "stage": 4, "hue": 160, "seed": 451383}'::jsonb),
  ('es1-058', 'es1', 58, 'SSR', 'Ophalia', '{"kind": "ophalia", "stage": 4, "hue": 30, "seed": 459302}'::jsonb)

on conflict (id) do update set number = excluded.number, rarity = excluded.rarity, name = excluded.name, art = excluded.art;
