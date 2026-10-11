# 🛠️ Prisma Setup & Complete Command Reference Guide

This document provides a comprehensive, step-by-step record of how **Prisma ORM (Prisma 8 with `@prisma/orm-postgres`)** was installed, configured, and integrated into this NestJS backend.

---

## 📋 Overview & Architecture

This project uses the modern **Prisma 8** data contract architecture:
- **Contract Source:** [`prisma/schema.prisma`](prisma/schema.prisma) written in standard PSL (Prisma Schema Language).
- **Configuration:** [`prisma.config.ts`](prisma.config.ts) binds the schema contract, PostgreSQL adapter, and database connection.
- **Contract Artifacts:** Generated into [`src/prisma/`](src/prisma/):
  - [`contract.json`](src/prisma/contract.json): The canonical machine-readable data contract.
  - [`contract.d.ts`](src/prisma/contract.d.ts): Full TypeScript type definitions for all tables, columns, relations, and operations.
  - [`db.ts`](src/prisma/db.ts): The runtime client instance exported as `db`.

---

## 🚀 Complete Installation & Setup Steps

### Step 1: Install Required Dependencies
The project requires the Prisma CLI, the Postgres adapter, runtime engine, and dotenv:

```bash
# 1. Install Prisma CLI (Dev Dependency)
npm install prisma --save-dev

# 2. Install Prisma Client & Core Runtime Packages
npm install @prisma/client @prisma/orm-postgres dotenv
```

#### Installed Versions:
* `prisma`: `^8.0.0-rc.22`
* `@prisma/orm-postgres`: `^8.0.0-rc.17`
* `@prisma/client`: `^7.10.0`
* `dotenv`: `^17.x`

---

### Step 2: Define Schema Contract (`prisma/schema.prisma`)
Create [`prisma/schema.prisma`](prisma/schema.prisma) mapping your PostgreSQL database tables with idiomatic TypeScript camelCase properties and `@map` for PostgreSQL snake_case columns:

```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

enum UserRole {
  USER
  ADMIN

  @@map("user_role")
}

model User {
  id           Int          @id @default(autoincrement())
  email        String       @unique @db.VarChar(255)
  passwordHash String       @map("password_hash") @db.VarChar(255)
  role         UserRole     @default(USER)
  createdAt    DateTime     @default(now()) @map("created_at")

  profile      UserProfile?
  sessions     Session[]
  posts        Post[]
  likes        PostLike[]
  comments     PostComment[]

  followers    Follower[]   @relation("UserFollowers")
  following    Follower[]   @relation("UserFollowing")

  @@map("users")
}

model Session {
  id        Int      @id @default(autoincrement())
  userId    Int      @map("user_id")
  jwtToken  String   @map("jwt_token")
  expiresAt DateTime @map("expires_at")
  isActive  Boolean  @default(true) @map("is_active")
  createdAt DateTime @default(now()) @map("created_at")

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("sessions")
}

model UserProfile {
  id                Int      @id @default(autoincrement())
  userId            Int      @unique @map("user_id")
  username          String?  @unique @db.VarChar(255)
  fullName          String?  @map("full_name") @db.VarChar(255)
  bio               String?
  profilePictureUrl String?  @map("profile_picture_url") @db.VarChar(255)
  location          String?  @db.VarChar(255)
  website           String?  @db.VarChar(255)
  updatedAt         DateTime @updatedAt @map("updated_at")

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_profiles")
}

model Post {
  id        Int           @id @default(autoincrement())
  authorId  Int           @map("author_id")
  content   String
  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt @map("updated_at")

  author    User          @relation(fields: [authorId], references: [id], onDelete: Cascade)
  likes     PostLike[]
  comments  PostComment[]

  @@index([authorId], map: "idx_posts_author_id")
  @@map("posts")
}

model PostLike {
  userId    Int      @map("user_id")
  postId    Int      @map("post_id")
  createdAt DateTime @default(now()) @map("created_at")

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)

  @@id([userId, postId])
  @@index([postId], map: "idx_post_likes_post_id")
  @@map("post_likes")
}

model PostComment {
  id        Int      @id @default(autoincrement())
  postId    Int      @map("post_id")
  authorId  Int      @map("author_id")
  content   String
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  author    User     @relation(fields: [authorId], references: [id], onDelete: Cascade)

  @@index([postId], map: "idx_post_comments_post_id")
  @@map("post_comments")
}

model Follower {
  followerId  Int      @map("follower_id")
  followingId Int      @map("following_id")
  createdAt   DateTime @default(now()) @map("created_at")

  follower    User     @relation("UserFollowing", fields: [followerId], references: [id], onDelete: Cascade)
  following   User     @relation("UserFollowers", fields: [followingId], references: [id], onDelete: Cascade)

  @@id([followerId, followingId])
  @@index([followingId], map: "idx_followers_following_id")
  @@map("followers")
}
```

> **Important Prisma 8 PSL Rules Applied:**
> 1. Fields with `@updatedAt` should **not** include `@default(now())` (`@updatedAt` sets both the creation and update timestamps automatically).
> 2. Primary key columns (`@id`) do not need redundant `@@index([id])` because PostgreSQL already maintains a btree index on primary keys.

---

### Step 3: Scaffold Configuration & Initialize ORM
Run the Prisma ORM initialization using the schema contract:

```bash
npx prisma orm init --from-prisma7-schema prisma/schema.prisma --confirm SocialMedia --yes --skip-install
```

This generates [`prisma.config.ts`](prisma.config.ts) and [`src/prisma/db.ts`](src/prisma/db.ts).

#### Config File ([`prisma.config.ts`](prisma.config.ts)):
```typescript
import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as ormConfig, prisma7Schema } from '@prisma/orm-postgres/config';

export default definePrismaConfig({
  orm: ormConfig({
    contract: prisma7Schema('prisma/schema.prisma'),
    output: 'src/prisma',
    db: {
      connection: process.env['DATABASE_URL']!,
    },
  }),
});
```

#### Client File ([`src/prisma/db.ts`](src/prisma/db.ts)):
```typescript
import 'dotenv/config';
import postgres from '@prisma/orm-postgres/runtime';
import type { Contract } from './contract.d';
import contractJson from './contract.json' with { type: 'json' };

export const db = postgres<Contract>({
  contractJson,
  url: process.env['DATABASE_URL']!,
});
```

---

### Step 4: Emit Contract Artifacts
To compile the schema into type definitions and runtime contract:

```bash
# Direct CLI command:
npx prisma contract emit

# Or via the npm script added to package.json:
npm run contract:emit
```

This outputs:
* `src/prisma/contract.json` (Canonical contract data)
* `src/prisma/contract.d.ts` (Full TypeScript interfaces and query builder types)

---

### Step 5: Sync Agent Skills (Optional)
To sync Prisma instruction manuals for IDE AI agents (Cursor, Claude, Devin, etc.):

```bash
npx prisma skills sync
```

---

## ⚡ Complete Command Reference

| Command | Description |
| :--- | :--- |
| `npm run contract:emit` | Compiles `prisma/schema.prisma` into `src/prisma/contract.json` and `contract.d.ts`. Run this whenever you edit the schema. |
| `npx prisma contract format` | Formats and indents `prisma/schema.prisma`. |
| `npx prisma contract print` | Prints the compiled Prisma 8 contract to stdout. |
| `npx prisma db sign` | Verifies the live database schema against the contract and writes a signing marker (makes no destructive changes). |
| `npx prisma skills sync` | Synchronizes Prisma AI assistant skills in your workspace. |
| `npm run build` | Compiles the NestJS application with TypeScript. |
| `npm run lint` | Runs oxlint type-aware linting. |
| `npm test` | Runs the Vitest test suite. |

---

## 💡 How to Query with the Prisma 8 Client

Import the pre-configured `db` instance from [`src/prisma/db.ts`](src/prisma/db.ts):

### 1. Find a User by Email
```typescript
import { db } from '../prisma/db.js';

const user = await db.orm.public.User
  .where({ email: 'user@example.com' })
  .first();
```

### 2. Create a Post
```typescript
const post = await db.orm.public.Post.create({
  authorId: userId,
  content: 'Hello Prisma 8!',
});
```

### 3. Query with Relations (Feed Example)
```typescript
const posts = await db.orm.public.Post
  .where({
    authorId: { in: followedUserIds },
    id: { lt: cursor }, // Cursor pagination (WHERE id < cursor)
  })
  .orderBy({ id: 'desc' })
  .limit(10)
  .all();
```

### 4. Raw SQL Query (When needed)
If you need raw SQL while maintaining connection pooling:
```typescript
const result = await db.sql`
  SELECT p.*, COUNT(pl.user_id)::int as like_count
  FROM posts p
  LEFT JOIN post_likes pl ON p.id = pl.post_id
  WHERE p.id = ${postId}
  GROUP BY p.id;
`;
```
