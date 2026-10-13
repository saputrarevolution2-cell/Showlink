-- ShowLink Pastelink migration. Run once in Supabase SQL Editor.
create table if not exists public.pastelinks (
 id bigint generated always as identity primary key,
 slug text not null unique check (slug ~ '^[A-Za-z0-9]{3,12}$'),
 title text not null default 'PasteLink',
 content text not null check (char_length(content) between 1 and 20000),
 created_at timestamptz not null default now()
);
alter table public.pastelinks enable row level security;
revoke all on public.pastelinks from anon, authenticated;
create or replace function public.create_pastelink(p_title text, p_content text)
returns jsonb language plpgsql security definer set search_path=public as $$
declare s text; i int; alphabet text := 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
begin
 if p_content is null or length(trim(p_content))=0 or length(p_content)>20000 then raise exception 'Isi PasteLink wajib diisi (maksimal 20000 karakter).'; end if;
 for i in 1..8 loop
   s := ''; for j in 1..3 loop s := s || substr(alphabet, 1+floor(random()*length(alphabet))::int,1); end loop;
   begin insert into public.pastelinks(slug,title,content) values(s,coalesce(nullif(left(trim(p_title),120),''),'PasteLink'),p_content); return jsonb_build_object('slug',s); exception when unique_violation then continue; end;
 end loop;
 raise exception 'Gagal membuat slug unik, coba lagi.';
end; $$;
create or replace function public.get_pastelink(p_slug text)
returns jsonb language sql stable security definer set search_path=public as $$
 select jsonb_build_object('slug',slug,'title',title,'content',content,'created_at',created_at) from public.pastelinks where slug=p_slug limit 1;
$$;
revoke all on function public.create_pastelink(text,text) from public;
revoke all on function public.get_pastelink(text) from public;
grant execute on function public.create_pastelink(text,text) to anon, authenticated;
grant execute on function public.get_pastelink(text) to anon, authenticated;
