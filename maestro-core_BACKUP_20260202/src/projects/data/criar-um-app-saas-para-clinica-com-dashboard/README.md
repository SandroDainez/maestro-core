# criar um app saas para clínica com dashboard

Projeto criado automaticamente pelo Maestro.

Objetivo:
criar um app saas para clínica com dashboard

Gerado em: 2026-01-31T19:56:01.826Z


## 🔐 Autenticação (Supabase)

Este projeto utiliza Supabase para autenticação.

### Setup:

1. Crie um projeto em https://supabase.com
2. Copie as chaves para um arquivo `.env.local`
3. Use `lib/supabase.ts` para acessar o client.

Providers suportados futuramente:
- Clerk
- Auth.js


## 🔐 Autenticação (Supabase)

Este projeto utiliza Supabase para autenticação.

### Setup:

1. Crie um projeto em https://supabase.com
2. Copie as chaves para um arquivo `.env.local`
3. Use `lib/supabase.ts` para acessar o client.

Providers suportados futuramente:
- Clerk
- Auth.js


## 🗄 Banco de Dados (Postgres + Prisma)

Este projeto usa Prisma ORM com Postgres.

### Setup:

1. Crie um banco Postgres local ou cloud (Supabase, Neon, Railway, RDS).
2. Atualize `DATABASE_URL` no `.env.local`.
3. Rode:

```bash
npx prisma migrate dev --name init
```

4. Gere o client:

```bash
npx prisma generate
```


## 🔐 Autenticação (Supabase)

Este projeto utiliza Supabase para autenticação.

### Setup:

1. Crie um projeto em https://supabase.com
2. Copie as chaves para um arquivo `.env.local`
3. Use `lib/supabase.ts` para acessar o client.

Providers suportados futuramente:
- Clerk
- Auth.js


## 🗄 Banco de Dados (Postgres + Prisma)

Este projeto usa Prisma ORM com Postgres.

### Setup:

1. Crie um banco Postgres local ou cloud (Supabase, Neon, Railway, RDS).
2. Atualize `DATABASE_URL` no `.env.local`.
3. Rode:

```bash
npx prisma migrate dev --name init
```

4. Gere o client:

```bash
npx prisma generate
```


## 📊 Dashboard (Next.js)

Frontend criado em `/web`.

Rodar:

```bash
cd web
npm run dev
```

Acesse:

http://localhost:3000/dashboard
