# API Integration Guide

This document explains how to replace the mock data in UniVia with real API endpoints.

## Current State
All data flows from `/lib/mockData.ts`. This file exports:
- Course curriculum structure
- Learning paths and timelines
- AI insights and recommendations
- Exam banks
- Resource library
- User statistics

## Integration Steps

### Step 1: Set Up API Routes
Create endpoint files in `/app/api/`:

```typescript
// app/api/courses/route.ts
export async function GET() {
  try {
    const courses = await db.courses.findMany();
    return Response.json(courses);
  } catch (error) {
    return Response.json({ error: 'Failed to fetch courses' }, { status: 500 });
  }
}
```

### Step 2: Create API Client Functions
Create a service layer in `/lib/api/`:

```typescript
// lib/api/courses.ts
export async function getCourses() {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses`, {
    cache: 'revalidate',
    next: { revalidate: 60 },
  });
  return response.json();
}

export async function getCourseById(id: string) {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/courses/${id}`);
  return response.json();
}
```

### Step 3: Update Components

**Option A: Server Component**
```typescript
import { getCourses } from "@/lib/api/courses"

export default async function MallaView() {
  const courses = await getCourses()
  return <CourseGrid courses={courses} />
}
```

**Option B: Client Component with SWR**
```typescript
'use client'
import useSWR from 'swr'

export function MallaView() {
  const { data: courses, error } = useSWR('/api/courses', fetch)
  
  if (error) return <div>Error loading courses</div>
  if (!courses) return <div>Loading...</div>
  
  return <CourseGrid courses={courses} />
}
```

### Step 4: Environment Variables
Add to `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:3000
DATABASE_URL=postgresql://...
```

## Database Schema Reference

### Courses Table
```sql
CREATE TABLE courses (
  id TEXT PRIMARY KEY,
  code VARCHAR(10) UNIQUE,
  name VARCHAR(255),
  credits INT,
  description TEXT,
  ciclo INT,
  status VARCHAR(50),
  created_at TIMESTAMP
);
```

### Learning Paths Table
```sql
CREATE TABLE learning_paths (
  id TEXT PRIMARY KEY,
  course_id TEXT REFERENCES courses(id),
  professor VARCHAR(255),
  progress INT,
  start_date DATE,
  end_date DATE,
  created_at TIMESTAMP
);
```

### Resources Table
```sql
CREATE TABLE resources (
  id TEXT PRIMARY KEY,
  title VARCHAR(255),
  code VARCHAR(10),
  type VARCHAR(50),
  ciclo INT,
  year INT,
  downloads INT,
  rating DECIMAL(3,1),
  created_at TIMESTAMP
);
```

## Gradual Migration

You don't need to replace everything at once:

1. **Week 1**: Replace course curriculum data
2. **Week 2**: Replace learning path and exam data
3. **Week 3**: Replace resource library
4. **Week 4**: Replace user profile and statistics

## Testing Mock Data

Keep mockData.ts for testing:
```typescript
// lib/mockData.ts (PRODUCTION)
export const CURRICULUM_DATA = process.env.USE_MOCK_DATA 
  ? MOCK_CURRICULUM 
  : await getCurriculumFromAPI()
```

## Common Issues & Solutions

**Q: How do I handle real-time updates?**
A: Use SWR with `revalidateOnFocus: true` for client-side, or `revalidate` option for server-side.

**Q: How do I cache API responses?**
A: Use Next.js fetch caching: `next: { revalidate: 3600 }`

**Q: How do I handle authentication?**
A: Add JWT tokens to API requests:
```typescript
const response = await fetch(url, {
  headers: {
    'Authorization': `Bearer ${token}`
  }
})
