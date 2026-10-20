# 💎 Prisma ORM Complete Master Guide & Roadmap
> **Your Codebase**: Social Media Backend using **NestJS + Prisma 8 (`@prisma/orm-postgres`) + PostgreSQL**
> **Current Stack**: Node.js, TypeScript, PostgreSQL, NestJS, Prisma 8 CLI (`8.0.0-rc.22`), Runtime Adapter (`8.0.0-rc.17`)
> This roadmap is **tailored directly to your codebase** (`users`, `posts`, `post_likes`, `post_comments`, `followers`, `bookmarks`, `tags`, `notifications`).

---

## ⏱️ Time Plan & Topic Overview

| # | Topic | Time | Priority | Focus Area |
|---|-------|------|----------|------------|
| 1 | Prisma ORM Fundamentals & The Prisma 8 Revolution | 20 min | 🔴 Must | What Prisma is, Prisma 7 vs 8, Contract-First Architecture |
| 2 | Codebase Anatomy & Configuration | 15 min | 🔴 Must | `prisma.config.ts`, `src/prisma/`, `db.ts`, `PrismaService` |
| 3 | Contract Authoring (PSL Schema & Data Modeling) | 25 min | 🔴 Must | Models, Fields, Types, Enums, 1:1, 1:N, N:M Relations, Indexes |
| 4 | Contract Emits (`prisma contract emit`) Deep-Dive | 15 min | 🔴 Must | AST lowering, `contract.json`, `contract.d.ts`, type pipeline |
| 5 | Migrations Architecture (The 2 Paths & Data Transforms) | 30 min | 🔴 Must | `db update` vs `migration plan` + `db migrate`, markers, refs, data backfills |
| 6 | Querying with the ORM Lane (`db.orm.public.*`) | 30 min | 🔴 Must | CRUD, `.where()`, `.select()`, `.orderBy()`, cursor pagination, async iterables |
| 7 | Relations & Eager Loading (`.include` & Reducers) | 20 min | 🔴 Must | Nested loading, branch queries, `.count()`, `.sum()`, aggregate typing |
| 8 | Mutations, Transactions & Row-Level Locking | 20 min | 🔴 Must | `create`, `update`, `delete`, `upsert`, `db.transaction`, `forUpdate()` |
| 9 | The SQL Builder Lane (`db.sql`) & Raw Queries | 15 min | 🟡 Important | Query plans, `runtime.query()` vs `runtime.execute()`, `RETURNING` |
| 10 | NestJS Integration & Architectural Best Practices | 15 min | 🟡 Important | DI, Global Modules, Connection Pool Lifecycle, Error Filters |
| 11 | CLI Command Master Reference & Day-to-Day Workflows | 15 min | 🟡 Important | All commands, flags, schema-change checklist, CI/CD deploys |
| 12 | Common Pitfalls & Hands-On Exercises | 15 min | 🟢 Practice | 12 deadly gotchas, 5 real-world practice challenges |

---

## 📚 Topic 1 — Prisma ORM Fundamentals & The Prisma 8 Revolution (20 min)

### What to Learn
- What an ORM (Object-Relational Mapper) is and why we use it instead of raw SQL strings.
- The evolution of Prisma: **Prisma 2–7 (Engine-centric)** vs **Prisma 8 (Contract-First)**.
- Why Prisma 8 removes heavy binary query engines (`query-engine-linux-musl`, etc.) in favor of lightweight target-specific TypeScript/Rust adapters (`@prisma/orm-postgres`).
- How your project runs Prisma 8 while leveraging your PSL schema (`prisma7Schema("prisma/schema.prisma")`).

### Conceptual Architecture Comparison

```
┌─────────────────────────────────────────────────────────────────────────────┐
│ TRADITIONAL PRISMA (Prisma 2 - Prisma 7)                                    │
│  prisma/schema.prisma ──[prisma generate]──► @prisma/client (Heavy Binary) │
│                                            (Rust query-engine binary IPC)   │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ▲
                                 TRANSITION
                                      ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│ MODERN PRISMA 8 (This Codebase)                                             │
│  prisma/schema.prisma                                                       │
│         │                                                                   │
│   [prisma contract emit]                                                    │
│         ├──► src/prisma/contract.json (Canonical Contract IR)               │
│         └──► src/prisma/contract.d.ts (Strict TypeScript Types)             │
│                                                                             │
│  Runtime: @prisma/orm-postgres/runtime ──► Direct Pool Connection (pg)      │
│  Zero engine binaries • Instant cold starts • Full TypeScript inference    │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Key Concepts
1. **The Contract-First Philosophy**:
   *"Edit your data contract. Prisma handles the rest."*
   The data contract is the single source of truth. Your application runtime, IDE autocompletion, database migrations, and CI validators all derive directly from this emitted contract.
2. **Dual-Lane System**:
   Prisma 8 provides two distinct query surfaces from a single database client:
   - **`db.orm.<schema>.<Model>`**: High-level, ergonomic, type-safe ORM for standard CRUD, nested relations, and aggregations.
   - **`db.sql.<schema>.<table>`**: Low-level, expressive SQL query builder for complex queries, explicit joins, and window functions without dropping to raw text.

---

## 📚 Topic 2 — Codebase Anatomy & Configuration (15 min)

### What to Learn
- The purpose of every Prisma-related file in your Social Media project.
- How `prisma.config.ts` acts as the root configuration envelope.
- How the runtime client is created and shared.

### Your Code References

#### 1. Config Envelope: [`prisma.config.ts`](file:///home/nitin/Desktop/SocialMedia/prisma.config.ts)
```typescript
import 'dotenv/config';
import { definePrismaConfig } from '@prisma/cli-engine';
import { defineConfig as ormConfig, prisma7Schema } from '@prisma/orm-postgres/config';

export default definePrismaConfig({
  orm: ormConfig({
    contract: prisma7Schema('prisma/schema.prisma'), // Schema source
    output: 'src/prisma',                             // Destination for emitted artifacts
    db: {
      connection: process.env['DATABASE_URL']!,       // Connection string from .env
    },
  }),
});
```
- `definePrismaConfig`: Root wrapper from `@prisma/cli-engine`.
- `ormConfig`: Target-specific configuration for PostgreSQL (`@prisma/orm-postgres/config`).
- `prisma7Schema`: Adapter bridge allowing Prisma 8 to consume standard PSL syntax seamlessly.

#### 2. Runtime Client: [`src/prisma/db.ts`](file:///home/nitin/Desktop/SocialMedia/src/prisma/db.ts)
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
- Imports the compiled `contractJson` (using ES import attributes `with { type: 'json' }`).
- Casts the database instance with `postgres<Contract>`, providing 100% strict autocompletion for models, columns, relations, and return types.

#### 3. NestJS Service Bridge: [`src/prisma/prisma.service.ts`](file:///home/nitin/Desktop/SocialMedia/src/prisma/prisma.service.ts)
```typescript
@Injectable()
export class PrismaService implements OnModuleDestroy {
  readonly client = db;

  get orm() {
    return this.client.orm.public; // Shortcut to PostgreSQL 'public' schema ORM
  }

  get sql() {
    return this.client.sql.public; // Shortcut to PostgreSQL 'public' SQL builder
  }
}
```

---

## 📚 Topic 3 — Contract Authoring (PSL Schema & Data Modeling) (25 min)

### What to Learn
- Prisma Schema Language (PSL) syntax and semantics.
- Mapping database tables & columns: `@map` vs `@@map`.
- Defining relationships: One-to-One, One-to-Many, Many-to-Many, and Self-Referential.
- Indexes, Unique constraints, and Foreign key cascades.

### Your Code Reference: [`prisma/schema.prisma`](file:///home/nitin/Desktop/SocialMedia/prisma/schema.prisma)

Let's examine how each database relationship in your social media backend is declared:

#### 1. Models, Types, and Column Mapping
```prisma
enum UserRole {
  USER
  ADMIN

  @@map("user_role") // Maps TypeScript enum to PostgreSQL enum 'user_role'
}

model User {
  id           Int       @id @default(autoincrement())
  email        String    @unique @db.VarChar(255)
  passwordHash String    @map("password_hash") @db.VarChar(255) // TS: passwordHash -> DB: password_hash
  role         UserRole  @default(USER)
  createdAt    DateTime  @default(now()) @map("created_at")

  profile      UserProfile? // 1:1 relation
  posts        Post[]       // 1:N relation
  likes        PostLike[]   // N:M junction
  
  // Self-relation: Followers & Following
  followers    Follower[]   @relation("UserFollowers")
  following    Follower[]   @relation("UserFollowing")

  @@map("users") // Database table is named 'users'
}
```

#### 2. One-to-One (1:1) Relation: User ↔ UserProfile
```prisma
model UserProfile {
  id                Int      @id @default(autoincrement())
  userId            Int      @unique @map("user_id") // Unique foreign key ensures 1:1
  bio               String?
  updatedAt         DateTime @updatedAt @map("updated_at")

  user              User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@map("user_profiles")
}
```

#### 3. One-to-Many (1:N) Relation: User ↔ Post
```prisma
model Post {
  id        Int           @id @default(autoincrement())
  authorId  Int           @map("author_id")
  content   String
  createdAt DateTime      @default(now()) @map("created_at")
  updatedAt DateTime      @updatedAt @map("updated_at")

  author    User          @relation(fields: [authorId], references: [id], onDelete: Cascade)
  comments  PostComment[]

  @@index([authorId], map: "idx_posts_author_id") // Speeds up queries like: WHERE author_id = ?
  @@map("posts")
}
```

#### 4. Many-to-Many (N:M) Junction Table: Post ↔ Tag via PostTag
```prisma
model Tag {
  id        Int       @id @default(autoincrement())
  name      String    @unique @db.VarChar(255)
  posts     PostTag[]

  @@map("tags")
}

model PostTag {
  postId    Int      @map("post_id")
  tagId     Int      @map("tag_id")
  createdAt DateTime @default(now()) @map("created_at")

  post      Post     @relation(fields: [postId], references: [id], onDelete: Cascade)
  tag       Tag      @relation(fields: [tagId], references: [id], onDelete: Cascade)

  @@id([postId, tagId]) // Composite Primary Key
  @@index([tagId], map: "idx_post_tags_tag_id")
  @@map("post_tags")
}
```

#### 5. Self-Referential Relation: Follower Network
```prisma
model Follower {
  followerId  Int      @map("follower_id")
  followingId Int      @map("following_id")
  createdAt   DateTime @default(now()) @map("created_at")

  // follower is the user performing the follow action
  follower    User     @relation("UserFollowing", fields: [followerId], references: [id], onDelete: Cascade)
  // following is the user being followed
  following   User     @relation("UserFollowers", fields: [followingId], references: [id], onDelete: Cascade)

  @@id([followerId, followingId])
  @@index([followingId], map: "idx_followers_following_id")
  @@map("followers")
}
```

### Golden Schema Rules in Prisma 8:
1. **Never combine `@updatedAt` with `@default(now())`**: `@updatedAt` automatically sets both the creation timestamp and updates on mutation. Combining them causes schema parsing errors.
2. **No redundant indices on `@id`**: Primary keys in PostgreSQL are automatically backed by a unique B-Tree index; adding `@@index([id])` is wasted storage and I/O.
3. **Explicit cascade policies**: Always specify `onDelete: Cascade` or `onDelete: SetNull` on foreign keys so deletions don't fail with database constraint errors.

---

## 📚 Topic 4 — Contract Emits (`prisma contract emit`) Deep-Dive (15 min)

### What to Learn
- What running `npx prisma contract emit` actually does behind the scenes.
- Why `contract.json` and `contract.d.ts` must be committed to version control.
- How the compiler validates your models before runtime.

```
┌────────────────────────────────────────────────────────────────────────┐
│                        prisma contract emit                            │
└───────────────────────────────────┬────────────────────────────────────┘
                                    │
                                    ▼
       1. Load & validate prisma.config.ts
       2. Parse prisma/schema.prisma into Abstract Syntax Tree (AST)
       3. Run structural & capability checks (PostgreSQL adapter limits)
       4. Compute 64-hex SHA Content Hash of the contract
                                    │
                  ┌─────────────────┴─────────────────┐
                  ▼                                   ▼
        src/prisma/contract.json            src/prisma/contract.d.ts
    (Canonical Runtime Metadata)          (TypeScript Definitions)
    - Tables, columns, DB data types      - Type inference for User, Post...
    - Relations, foreign keys, cascades   - db.orm.public.* interfaces
    - Check constraints & storage hash    - Query payload typing (first, all)
```

### What happens when you emit:
1. **Validation**: The CLI verifies that all foreign keys have matching target columns, types align, and annotations are valid.
2. **Artifact Generation**:
   - `src/prisma/contract.json`: Machine-readable representation used by the runtime client and migration planner.
   - `src/prisma/contract.d.ts`: TypeScript definition file providing autocompletion for `db.orm.public.User`, `db.sql.public.post`, relation includes, and mutation shapes.
3. **Deterministic Content Hashing**: Prisma calculates a cryptographic hash over the contract structure. This hash is embedded into database markers to detect schema drift!

### Command:
```bash
npm run contract:emit
# or directly:
npx prisma contract emit
```
> [!IMPORTANT]
> **Always run `contract:emit` immediately after editing `schema.prisma`.**
> If you don't run emit, your TypeScript editor and runtime will remain out of sync with your schema.

---

## 📚 Topic 5 — Migrations Architecture (The 2 Paths & Data Transforms) (30 min)

### What to Learn
- The difference between **`db update`** (quick local prototyping) and **`migration plan` + `db migrate`** (formal production migrations).
- How the migration graph and content hashes work.
- The role of `prisma_contract.marker` and detecting schema drift.
- How to author **data migrations / backfills** using `placeholder(...)` and self-emitting.

### Decision Matrix: Which Migration Path to Take?

| Scenario | Path to Use | Why |
|:---|:---|:---|
| **Local dev, prototyping schema changes** | `npx prisma db update` | Instant, interactive, applies directly to DB, no migration files cluttering git. |
| **Shared Git branch / Team development** | `migration plan` + `db migrate` | Produces reviewable, replayable, content-hashed migration directory. |
| **Production or CI/CD deployment** | `prisma db migrate` | Guaranteed deterministic execution inside an atomic PostgreSQL transaction. |
| **Adding a `NOT NULL` column to existing rows** | `migration plan` (with data transform) | `db update` refuses data transformations; `migration.ts` lets you write the backfill logic. |
| **Adopting an existing database** | `prisma db sign` | Verifies DB matches contract and stamps marker without modifying data. |

---

### Path 1: Rapid Local Development (`db update`)

When you are experimenting locally:
```bash
# 1. Update schema.prisma
# 2. Emit contract
npx prisma contract emit

# 3. (Optional) Dry-run to preview what will change
npx prisma db update --dry-run

# 4. Apply changes directly to your PostgreSQL database
npx prisma db update
```

#### Handling Data Loss Questions
If a change drops a column or table, `db update` stops and requests consent:
```bash
# Explicitly approve deleting a column/table
npx prisma db update --delete public.posts.legacy_column

# Or notify Prisma of a column rename (avoids dropping and recreating)
npx prisma db update --rename public.users.name:display_name
```

---

### Path 2: The Formal Migration Path (`migration plan` + `db migrate`)

This is the standard engineering workflow for version-controlled schema evolution.

```
       1. Edit schema.prisma
                 │
                 ▼
       2. npx prisma contract emit
                 │
                 ▼
       3. npx prisma migration plan --name add_bookmark_table
                 │
                 ├─► Generates: migrations/app/20261018T1200_add_bookmark_table/
                 │     ├── migration.json  (Manifest & SHA hash)
                 │     ├── ops.json        (Canonical operation list)
                 │     └── migration.ts    (Executable TypeScript)
                 │
                 ▼
       4. (If data backfill required: edit migration.ts & self-emit)
                 │
                 ▼
       5. npx prisma db migrate
                 │
                 └─► Executes in 1 PostgreSQL transaction (BEGIN...COMMIT)
                     Advances marker in prisma_contract.marker
```

#### Running the Commands:
```bash
# Step 1: Emit contract
npx prisma contract emit

# Step 2: Plan migration
npx prisma migration plan --name add_user_bookmarks

# Step 3: Inspect planned migration
npx prisma migration show migrations/app/20261018T1200_add_user_bookmarks

# Step 4: Preview what will execute across the whole graph
npx prisma db migrate --show

# Step 5: Apply pending migrations
npx prisma db migrate
```

---

### Data Migrations & Transforms (The `placeholder` Workflow)

Suppose you add a new non-null column `display_name` to `users`. The database already has 10,000 users!
A standard DDL migration `ALTER TABLE users ADD COLUMN display_name VARCHAR(255) NOT NULL;` would fail because existing rows have no value.

Prisma 8 handles this gracefully with **framework-rendered data transforms**:

1. Run `npx prisma migration plan --name add_user_display_name`.
2. Prisma detects the non-null requirement and renders a `migration.ts` containing a `placeholder`:
   ```typescript
   // migrations/app/20261018T1200_add_user_display_name/migration.ts
   this.addColumn({
     schema: 'public',
     table: 'users',
     column: col('display_name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
   }),
   this.dataTransform(endContract, 'backfill-display-name', {
     check: () => placeholder('backfill-display-name:check'),
     run: () => placeholder('backfill-display-name:run'),
   }),
   this.setNotNull({ schema: 'public', table: 'users', column: 'display_name' }),
   ```

3. **Fill the placeholder** with real queries:
   ```typescript
   import { col, Migration, MigrationCLI } from '@internal/postgres/migration';
   import postgres from '@prisma/orm-postgres/runtime';
   import type { Contract as End } from '../../snapshots/.../contract';
   import endContract from '../../snapshots/.../contract.json' with { type: 'json' };

   const { sql: db, contract } = postgres<End>({ contractJson: endContract });

   export default class M extends Migration<Start, End> {
     override readonly endContractJson = endContract;

     override get operations() {
       return [
         this.addColumn({
           schema: 'public',
           table: 'users',
           column: col('display_name', 'text', { codecRef: { codecId: 'pg/text@1' } }),
         }),
         this.dataTransform(contract, 'backfill-display-name', {
           // check: returns a row if work remains (wrapped in EXISTS by runner)
           check: () => db.public.users.select('id').where((u, fns) => fns.eq(u.display_name, null)).limit(1),
           // run: executes backfill update
           run: () => db.public.users.update({ display_name: 'Anonymous' }).where((u, fns) => fns.eq(u.display_name, null)),
         }),
         this.setNotNull({ schema: 'public', table: 'users', column: 'display_name' }),
       ];
     }
   }

   MigrationCLI.run(import.meta.url, M);
   ```

4. **Self-Emit the Migration Package**:
   ```bash
   node migrations/app/20261018T1200_add_user_display_name/migration.ts
   ```
   *Self-emitting regenerates `ops.json` and updates the cryptographic hash in `migration.json`.*

5. Apply with `npx prisma db migrate`.

---

## 📚 Topic 6 — Querying with the ORM Lane (`db.orm.public.*`) (30 min)

### What to Learn
- Addressing models in PostgreSQL (`db.orm.public.<Model>`).
- Filtering with `.where()` (object shorthand vs lambda proxy).
- Selecting specific columns with `.select()`.
- Sorting with `.orderBy()` and pagination (limit/offset vs cursor).
- How to consume results (`AsyncIterableResult`, `await ...all()`, `for await`).

### Your Code Reference: [`src/users/users.service.ts`](file:///home/nitin/Desktop/SocialMedia/src/users/users.service.ts)

```typescript
// Find user by primary key shorthand (adds LIMIT 1)
const user = await this.prisma.orm.User.first({ id });

// Find single user with predicate
const user = await this.prisma.orm.User
  .where({ email: 'user@example.com' })
  .first();

// Find many with select, filter, and ordering
const activeUsers = await this.prisma.orm.User
  .select('id', 'email', 'role', 'createdAt')
  .where((u) => u.role.eq('USER'))
  .orderBy((u) => u.createdAt.desc())
  .limit(10)
  .all();
```

### Filtering Operators & Lambda Proxy

```typescript
// 1. Equality Shorthand
this.prisma.orm.User.where({ email: 'alice@example.com' });

// 2. Lambda Proxy Syntax (Full Expression Power)
this.prisma.orm.User.where((u) => u.email.ilike('%@gmail.com'));
this.prisma.orm.User.where((u) => u.id.gt(100));
this.prisma.orm.User.where((u) => u.id.in([1, 2, 3, 4]));
this.prisma.orm.User.where((u) => u.role.neq('ADMIN'));

// 3. Combining AND / OR / NOT
import { and, or, not } from '@prisma/orm-postgres/orm-client';

this.prisma.orm.User.where((u) =>
  and(
    or(u.role.eq('ADMIN'), u.email.ilike('%@company.com')),
    not(u.email.ilike('%@temp.com')),
  ),
);

// 4. Range Queries (No .between — chain multiple where clauses)
this.prisma.orm.Post
  .where((p) => p.createdAt.gte(startDate))
  .where((p) => p.createdAt.lte(endDate));
```

### Cursor Pagination (High Performance Infinite Scroll)
Unlike `.offset()` which scans and skips rows, `.cursor()` jumps directly via index:
```typescript
const pageSize = 20;

// Fetch first page
const page1 = await this.prisma.orm.Post
  .orderBy((p) => p.id.desc())
  .limit(pageSize)
  .all();

const lastPost = page1[page1.length - 1];

// Fetch next page starting after lastPost.id
const page2 = await this.prisma.orm.Post
  .orderBy((p) => p.id.desc())
  .cursor({ id: lastPost.id })
  .limit(pageSize)
  .all();
```

### Result Consumption: `await`, `.toArray()`, and `for await`
`.all()` returns an `AsyncIterableResult<T>`. You do **not** need `.toArray()`:
```typescript
// Default and recommended:
const posts = await this.prisma.orm.Post.select('id', 'content').all();

// Stream rows one by one for massive datasets:
for await (const post of this.prisma.orm.Post.all()) {
  await processBatch(post);
}
```
> [!WARNING]
> **Single Consumption Rule (`RUNTIME.ITERATOR_CONSUMED`)**:
> An `AsyncIterableResult` can only be consumed once. Awaiting the exact same result instance twice throws `RUNTIME.ITERATOR_CONSUMED`. Store the awaited array in a variable and reuse the variable.

---

## 📚 Topic 7 — Relations & Eager Loading (`.include` & Reducers) (20 min)

### What to Learn
- How to eager-load relations with `.include()`.
- Applying filters, limits, and order inside related branches.
- Using **Reducers** (`.count()`, `.sum()`, `.avg()`) to compute aggregates directly on foreign keys without fetching sub-records.

### Your Code Reference: [`src/posts/posts.service.ts`](file:///home/nitin/Desktop/SocialMedia/src/posts/posts.service.ts)

```typescript
// Fetch posts with author profile and like count:
const posts = await this.prisma.orm.Post
  .include('author', (user) => user.select('id', 'email'))
  .include('likes', (l) => l.count()) // REDUCER: turns relation into a number!
  .include('comments', (c) => 
    c.select('id', 'content', 'createdAt')
     .orderBy((cmt) => cmt.createdAt.desc())
     .limit(3) // Only latest 3 comments per post
  )
  .orderBy((p) => p.createdAt.desc())
  .all();
```

### Reduction to Scalars:
Instead of fetching all related records into memory and doing `likes.length`, Prisma 8 lets you reduce the relation in SQL:
```typescript
// 1. Count
await db.orm.public.User.include('posts', (p) => p.count()).all();
// Result: Array<{ ...user, posts: number }>

// 2. Sum
await db.orm.public.Post.include('likes', (l) => l.count()).all();

// 3. Sub-views via combine()
await db.orm.public.User.include('posts', (posts) =>
  posts.combine({
    recent: posts.orderBy((p) => p.createdAt.desc()).limit(3),
    totalCount: posts.count(),
  }),
).all();
// Result: Array<{ ...user, posts: { recent: Post[], totalCount: number } }>
```

---

## 📚 Topic 8 — Mutations, Transactions & Row-Level Locking (20 min)

### What to Learn
- Creating records (`.create()`).
- The **Mandatory Filter Rule** on updates and deletes.
- Upserting records (`.upsert()`).
- ACID transactions with `db.transaction(async (tx) => ...)`.
- Pessimistic locking (`.forUpdate()`, `forNoKeyUpdate()`).

### Mutations

```typescript
// 1. Create with selected return fields
const post = await this.prisma.orm.Post
  .select('id', 'content', 'createdAt')
  .create({
    authorId: 1,
    content: 'Learning Prisma 8 is awesome!',
  });

// 2. Update with Filter (Mandatory Filter Rule)
const updatedUser = await this.prisma.orm.User
  .where({ id: userId })
  .select('id', 'email', 'role')
  .update({ role: 'ADMIN' });

// 3. Delete by predicate
await this.prisma.orm.PostLike
  .where({ userId, postId })
  .delete();

// 4. Upsert (Create if not exists, Update if exists)
const bookmark = await this.prisma.orm.Bookmark
  .select('userId', 'postId', 'createdAt')
  .upsert({
    create: { userId, postId },
    update: { createdAt: new Date() },
  });
```

> [!CAUTION]
> **The Mandatory Filter Rule**:
> In Prisma 8, calling `.update()`, `.updateAll()`, `.delete()`, or `.deleteAll()` on an unfiltered collection will **fail to compile at the TypeScript level**. You must explicitly provide `.where(...)` before modifying data.

---

### Atomic Transactions

Wrap multiple queries in a transaction. If any query fails, the entire transaction rolls back:
```typescript
await this.prisma.client.transaction(async (tx) => {
  // 1. Create a post
  const post = await tx.orm.public.Post.create({
    authorId: userId,
    content: 'Transaction Demo',
  });

  // 2. Link a tag
  await tx.orm.public.PostTag.create({
    postId: post.id,
    tagId: 1,
  });

  // 3. Create a notification
  await tx.orm.public.Notification.create({
    recipientId: 2,
    actorId: userId,
    type: 'COMMENT',
    postId: post.id,
  });
});
```

### Row-Level Locking (`FOR UPDATE`)
Prevent race conditions when reading a record that you intend to update immediately (e.g. balance updates or inventory claims):
```typescript
await this.prisma.client.transaction(async (tx) => {
  // Lock the user row against concurrent updates
  const user = await tx.orm.public.User
    .where({ id: userId })
    .forNoKeyUpdate()
    .first();

  // Perform modification safely
  await tx.orm.public.User
    .where({ id: userId })
    .update({ role: 'ADMIN' });
});
```
*Note: Use `forNoKeyUpdate()` when foreign keys reference this row to avoid deadlock with foreign key checks.*

---

## 📚 Topic 9 — The SQL Builder Lane (`db.sql`) & Raw Queries (15 min)

### What to Learn
- When to step down from `db.orm` to `db.sql`.
- Building query plans with `db.sql.public.<table>`.
- Executing query plans with `runtime.query(plan)` vs `runtime.execute(plan)`.
- Running raw SQL with parameters via `PrismaService`.

### The SQL Builder Lane

```typescript
// 1. Build a SQL query plan
const plan = this.prisma.sql.posts
  .select('id', 'content', 'author_id', 'created_at')
  .where((f, fns) => fns.eq(f.author_id, authorId))
  .limit(10)
  .build();

// 2. Execute plan returning rows
const rows = await this.prisma.client.runtime().query(plan);

// 3. Non-returning writes (get affected rows)
const updatePlan = this.prisma.sql.posts
  .update({ content: 'Updated Content' })
  .where((f, fns) => fns.eq(f.id, postId))
  .build();

const { affectedRows } = await this.prisma.client.runtime().execute(updatePlan);
```

### Raw SQL in `PrismaService`:
For complex PostgreSQL queries with window functions or CTEs:
```typescript
const result = await this.prisma.query(
  `SELECT p.*, COUNT(pl.user_id)::int as like_count
   FROM posts p
   LEFT JOIN post_likes pl ON p.id = pl.post_id
   WHERE p.author_id = $1
   GROUP BY p.id
   ORDER BY like_count DESC
   LIMIT $2`,
  [authorId, 10],
);
```

---

## 📚 Topic 10 — NestJS Integration & Architectural Best Practices (15 min)

### What to Learn
- Structuring `PrismaService` and `PrismaModule`.
- Managing database connections during NestJS lifecycle (`OnModuleDestroy`).
- Mapping Prisma errors into NestJS HTTP exceptions.

### LifeCycle Hook & Connection Teardown
In [`src/prisma/prisma.service.ts`](file:///home/nitin/Desktop/SocialMedia/src/prisma/prisma.service.ts):
```typescript
@Injectable()
export class PrismaService implements OnModuleDestroy {
  // ...
  async onModuleDestroy() {
    try {
      await this.pool.end();
      if (typeof this.client.close === 'function') {
        await this.client.close();
      }
      this.logger.log('Prisma 8 database connection pool closed.');
    } catch (error) {
      this.logger.error('Error closing Prisma connection', error);
    }
  }
}
```

### Exception Mapping
Map Prisma error codes to standard HTTP errors in NestJS controllers or filters:
```typescript
try {
  return await this.prisma.orm.User.create(dto);
} catch (error: any) {
  if (error.code === '23505') { // PostgreSQL Unique Constraint Violation
    throw new ConflictException('Email already in use');
  }
  if (error.code === 'RUNTIME.NO_ROWS') {
    throw new NotFoundException('Requested resource does not exist');
  }
  throw error;
}
```

---

## 📚 Topic 11 — CLI Command Master Reference & Day-to-Day Workflows (15 min)

### Command Cheatsheet

| Command | Purpose | When to Use |
|:---|:---|:---|
| `npx prisma contract emit` | Compiles schema into `contract.json` & `contract.d.ts` | Every time `schema.prisma` is modified |
| `npx prisma contract format` | Formats indentation and alignments in schema | Code cleanup before committing |
| `npx prisma db update` | Directly applies current contract to local DB | Fast local prototyping |
| `npx prisma db update --dry-run` | Shows pending SQL operations without executing | Before running `db update` |
| `npx prisma migration plan --name <slug>` | Generates a new versioned migration package | When preparing a change for Git / PR |
| `npx prisma migration show <target>` | Inspects operations inside a planned migration | During code review |
| `npx prisma db migrate --show` | Previews pending migrations in the graph | Pre-deployment validation |
| `npx prisma db migrate` | Executes all pending migrations in a transaction | Local migration test & CI/CD deploy |
| `npx prisma db sign` | Records live database matches current contract | Initial adoption or post-manual sync |
| `npx prisma db verify` | Checks live database against contract (exit code 4 on drift) | CI pipeline linting check |
| `npx prisma skills sync` | Synchronizes AI agent instructions for IDE | Workspace setup |

---

### Standard Developer Workflows

#### Scenario A: Adding a New Field to a Model (e.g. `bio` on `UserProfile`)
```bash
# 1. Open prisma/schema.prisma and add:
#    bio String?

# 2. Emit the updated contract
npm run contract:emit

# 3. Apply to local database
npx prisma db update

# 4. Use in your NestJS service immediately:
#    await this.prisma.orm.UserProfile.where({ userId }).update({ bio: 'Hello World' });
```

#### Scenario B: Preparing Schema Changes for Production Pull Request
```bash
# 1. Emit contract
npm run contract:emit

# 2. Plan formal migration
npx prisma migration plan --name add_bio_to_user_profile

# 3. Apply migration to test DB
npx prisma db migrate

# 4. Commit all files:
git add prisma/schema.prisma src/prisma/contract.* migrations/
git commit -m "feat(database): add bio to user profiles"
```

#### Scenario C: Production Deployment Pipeline (CI/CD)
```bash
# In your GitHub Actions / Docker deploy script:
npm ci
npx prisma db migrate
node dist/main.js
```

---

## 📚 Topic 12 — Common Pitfalls & Hands-On Exercises (15 min)

### The Top 10 Gotchas to Avoid

1. ❌ **Forgetting `contract emit`**: Modifying `schema.prisma` without running `npx prisma contract emit` leaves your TypeScript types and runtime metadata stale.
2. ❌ **Using `.all()` when you want one row**: `.all()` does not add a `LIMIT 1`. Always use `.first()` or `.first({ pk })`.
3. ❌ **Coalescing `count()` with `?? 0`**: In Prisma 8, `count()` returns `number` (`0` when empty), not `null`. `?? 0` is redundant on count, but needed on `sum` / `avg`.
4. ❌ **Looking for `.between(a, b)`**: Prisma 8 does not have `.between()`. Chain two `.where()` statements or use `and(...)`.
5. ❌ **Modifying data without a filter**: Calling `.update()` or `.delete()` without `.where()` fails TypeScript compilation.
6. ❌ **Awaiting `.all()` twice**: Consuming an `AsyncIterableResult` twice causes `RUNTIME.ITERATOR_CONSUMED`. Store in a variable.
7. ❌ **Hand-editing `contract.json` or `contract.d.ts`**: Never edit generated artifacts. Always edit `prisma/schema.prisma` and emit.
8. ❌ **Editing `migration.ts` without self-emitting**: If you fill a `placeholder` in `migration.ts`, you MUST run `node migrations/app/.../migration.ts` to update `ops.json` and `migration.json`.
9. ❌ **Wrong import paths**: Never import from `@internal/*`. Always import from `@prisma/orm-postgres/runtime` or `@prisma/orm-postgres/orm-client`.
10. ❌ **Missing `onDelete: Cascade`**: Forgetting cascade actions leads to foreign key constraint violations when deleting parent entities.

---

### 5 Hands-On Practice Exercises

#### Exercise 1: Build a Trending Hashtags Query
Using `this.prisma.orm.Tag`, query the top 5 tags with the most associated posts, ordered by post count descending.
<details>
<summary>🔍 Solution</summary>

```typescript
const trendingTags = await this.prisma.orm.Tag
  .include('posts', (p) => p.count())
  .all();

// Sort by post count descending and take top 5
return trendingTags
  .sort((a, b) => b.posts - a.posts)
  .slice(0, 5);
```
</details>

#### Exercise 2: Unread Notification Badge Count
Write a function in `NotificationsService` that returns the count of unread notifications for a specific user using the composite index `@@index([recipientId, isRead])`.
<details>
<summary>🔍 Solution</summary>

```typescript
async getUnreadCount(userId: number): Promise<number> {
  const result = await this.prisma.orm.Notification
    .where({ recipientId: userId, isRead: false })
    .all();
  return result.length;
}
```
</details>

#### Exercise 3: Bookmark Toggle with Transaction
Implement a method `toggleBookmark(userId: number, postId: number)`: if already bookmarked, delete it; if not, create it.
<details>
<summary>🔍 Solution</summary>

```typescript
async toggleBookmark(userId: number, postId: number) {
  const existing = await this.prisma.orm.Bookmark
    .where({ userId, postId })
    .first();

  if (existing) {
    await this.prisma.orm.Bookmark
      .where({ userId, postId })
      .delete();
    return { bookmarked: false };
  } else {
    await this.prisma.orm.Bookmark.create({ userId, postId });
    return { bookmarked: true };
  }
}
```
</details>

#### Exercise 4: Feed with Cursor Pagination and Author Profiles
Fetch 10 posts created by users whom the current user follows, using cursor pagination on `id`.
<details>
<summary>🔍 Solution</summary>

```typescript
async getFeed(followedUserIds: number[], cursor?: number) {
  let query = this.prisma.orm.Post
    .where((p) => p.authorId.in(followedUserIds))
    .include('author', (a) => a.select('id', 'email'))
    .include('likes', (l) => l.count())
    .orderBy((p) => p.id.desc())
    .limit(10);

  if (cursor) {
    query = query.cursor({ id: cursor });
  }

  return await query.all();
}
```
</details>

#### Exercise 5: Add a "Verified" Badge to Users (Migration Flow)
Simulate adding a `isVerified Boolean @default(false) @map("is_verified")` field to `User` in `prisma/schema.prisma`.
<details>
<summary>🔍 Solution Steps</summary>

```bash
# 1. Edit prisma/schema.prisma:
#    model User { ... isVerified Boolean @default(false) @map("is_verified") }

# 2. Emit contract:
npm run contract:emit

# 3. Create migration plan:
npx prisma migration plan --name add_user_is_verified

# 4. Apply to database:
npx prisma db migrate
```
</details>

---

## 🏁 Summary & What to Explore Next
You now have the complete roadmap and deep technical understanding of:
- **Contract-first architecture** with `schema.prisma`, `contract.json`, and `contract.d.ts`.
- **Emits**: Why and how to synchronize the compiler and type system.
- **Migrations**: The difference between `db update` (rapid dev) and `migration plan` + `db migrate` (production), along with data transforms and self-emits.
- **ORM & SQL builder querying**: Fluently querying `User`, `Post`, `Follower`, relations, reducers, and atomic transactions.
- **NestJS integration**: Injecting `PrismaService` cleanly into your controllers and services.
