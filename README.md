# Social Media Backend (NestJS & Prisma Learning Project)

Welcome to my Social Media Backend! This project serves as a hands-on learning environment for mastering **NestJS** and **Prisma** (alongside PostgreSQL) by building out the core features of a modern social media platform.

## 🎯 Project Goal
The primary objective of this project is to deeply understand backend architecture, Dependency Injection, routing, validation, and database interactions using the NestJS framework. It moves from writing raw SQL queries to eventually integrating Prisma ORM for type-safe database access.

## 🚀 Features Implemented So Far

### 🔐 Authentication & Authorization
* **JWT-based Authentication**: Secure login and registration using JSON Web Tokens.
* **Guards & Roles**: Implemented `JwtAuthGuard` for protecting routes and `RolesGuard` for role-based access control (e.g., Admin vs User).

### 👥 User Management & Follower System
* **Twitter-Style Following**: A 1-way following architecture allowing users to follow/unfollow each other without mutual requests.
* **Profile Management**: Endpoints to fetch and update user profiles (bio, website, location).

### 📝 Posts, Likes & Comments
* **Post Creation**: Users can create, edit, and delete their own posts.
* **Likes System**: A many-to-many relationship allowing users to like/unlike posts, complete with aggregate queries to fetch total like counts.
* **Comments**: Users can leave comments on posts, linked relationally to both the user and the post.

### 📰 User Feed & Cursor-Based Pagination
* **Personalized Feed (`GET /feed`)**: Fetches posts from users the current authenticated user follows, ordered by newest.
* **Complex Multi-Table JOINs**: Combines `followers`, `posts`, `users`, `user_profiles`, `post_likes`, and `post_comments` with aggregation for `like_count`, `comment_count`, and `is_liked`.
* **High-Performance Cursor Pagination**: Uses `WHERE p.id < :cursor ORDER BY p.id DESC LIMIT :limit + 1` instead of slow `OFFSET`, enabling infinite scrolling with O(1) page transitions even on huge tables.
* **Supports Flexible Queries**: Supports query parameters `cursor` (or `last_id`), `limit` (default 10, max 100), and optional `include_self` flag.

### 🛡️ Data Validation & Transformation
* Extensive use of **Data Transfer Objects (DTOs)**.
* Global implementation of `class-validator` for strict payload validation.
* Global implementation of `class-transformer` (e.g., automatically trimming whitespace and lowercasing emails before they hit the controllers).

## 🛠️ Tech Stack
* **Framework**: [NestJS](https://nestjs.com/)
* **Language**: TypeScript
* **Database**: PostgreSQL
* **ORM**: Prisma (Transitioning / Planned)
* **Validation**: `class-validator` & `class-transformer`

---
*This project is actively being developed as a learning journey.*
