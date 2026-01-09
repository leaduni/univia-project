# UniVia - Project Structure Guide

## Overview
UniVia is a professional academic orientation platform built with Next.js 16, TypeScript, Tailwind CSS v4, and Shadcn UI. All data is centralized in a `mockData.ts` file for easy API integration later.

## Directory Structure

```
/
├── app/                              # Next.js App Router
│   ├── layout.tsx                    # Root layout
│   ├── page.tsx                      # Dashboard home page
│   ├── globals.css                   # Global styles & design tokens
│   ├── auth/
│   │   ├── login/page.tsx            # Login page
│   │   └── signup/page.tsx           # Sign up page
│   ├── curso/[id]/page.tsx           # Individual course learning path
│   ├── mi-malla/page.tsx             # Curriculum map view
│   ├── onboarding/page.tsx           # Student onboarding wizard
│   └── recursos/page.tsx             # Central resource library
│
├── components/                       # Reusable React components
│   ├── ui/                          # Shadcn UI base components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── tabs.tsx
│   │   ├── badge.tsx
│   │   ├── checkbox.tsx
│   │   ├── select.tsx
│   │   ├── sheet.tsx
│   │   └── ... (all other Shadcn components)
│   │
│   ├── layout/                      # Layout components
│   │   ├── sidebar.tsx              # Main navigation sidebar
│   │   ├── header.tsx               # Top header with search & profile
│   │   └── dashboard-layout.tsx     # Layout wrapper for protected pages
│   │
│   ├── dashboard/                   # Dashboard page components
│   │   ├── dashboard.tsx            # Main dashboard container
│   │   ├── stats-cards.tsx          # Top 3 stat cards
│   │   ├── current-courses-section.tsx  # Active courses list
│   │   ├── course-card.tsx          # Individual course card
│   │   ├── right-sidebar.tsx        # Achievements & quick actions
│   │   └── ai-recommendation.tsx    # AI insights banner
│   │
│   ├── curriculum/                  # Mi Malla (Curriculum) components
│   │   ├── malla-view.tsx           # Main curriculum grid view
│   │   ├── ciclo-section.tsx        # Semester section
│   │   ├── malla-course-card.tsx    # Curriculum course card
│   │   ├── course-legend.tsx        # Status legend
│   │   └── course-details-sheet.tsx # Course details modal
│   │
│   ├── learning-path/               # Course learning path components
│   │   ├── learning-path.tsx        # Main learning path container
│   │   ├── timeline.tsx             # Vertical timeline steps
│   │   ├── ai-analysis-box.tsx      # AI insights box
│   │   └── exam-bank.tsx            # Exam bank filterable list
│   │
│   ├── onboarding/                  # Onboarding wizard components
│   │   ├── career-step.tsx          # Career selection
│   │   ├── academic-status-step.tsx # Completed courses selector
│   │   ├── current-enrollment-step.tsx  # Current semester courses
│   │   ├── completion-step.tsx      # Success celebration screen
│   │   ├── onboarding-progress.tsx  # Progress indicator
│   │   └── onboarding-wizard.tsx    # Main wizard controller
│   │
│   ├── recursos/                    # Resource library components
│   │   ├── recurso-card.tsx         # Individual resource card
│   │   └── empty-state.tsx          # Empty search state
│   │
│   └── recursos-biblioteca.tsx      # Main resource library container
│
├── lib/                             # Utility functions & data
│   ├── mockData.ts                  # Centralized mock data (MAIN DATA SOURCE)
│   ├── utils.ts                     # Tailwind cn() utility
│   └── api/                         # Future API helpers (when replacing mockData)
│
├── types/                           # TypeScript interfaces
│   ├── course.ts                    # Course interface
│   ├── onboarding.ts                # Onboarding data interface
│   └── recurso.ts                   # Resource interface
│
├── hooks/                           # Custom React hooks
│   ├── use-mobile.ts                # Mobile viewport detection
│   └── use-toast.ts                 # Toast notifications
│
├── public/                          # Static assets
│   ├── icon.svg
│   ├── apple-icon.png
│   └── ... (other static files)
│
├── scripts/                         # Utility scripts (optional)
│
├── next.config.mjs                  # Next.js configuration
├── tsconfig.json                    # TypeScript configuration
├── package.json                     # Dependencies
├── tailwind.config.js               # Tailwind CSS configuration
└── README.md                        # Project documentation
```

## Key Design Decisions

### 1. **Centralized Data (mockData.ts)**
All hardcoded data is in `/lib/mockData.ts`, organized by feature:
- `CAREERS` - Available degree programs
- `CURRICULUM_DATA` - Course structure across all semesters
- `LEARNING_PATH_DATA` - Individual course details
- `TIMELINE_DATA` - Learning steps for each course
- `AI_INSIGHTS_DATA` - AI-generated insights per course
- `EXAM_BANK_DATA` - Exam resources by course
- `RECURSOS_DATA` - Central library resources
- `DASHBOARD_STATS` - User statistics
- `ACHIEVEMENTS` - Student badges/achievements

**Why?** Easy API replacement without refactoring components. Simply replace the data source in `mockData.ts` with API calls.

### 2. **Component Organization**
Components are organized by feature/page, not by type:
- `/components/layout/` - Shared layout components
- `/components/dashboard/` - Dashboard-specific components
- `/components/curriculum/` - Curriculum map components
- `/components/learning-path/` - Course detail components
- `/components/onboarding/` - Onboarding flow components
- `/components/recursos/` - Resource library components

**Why?** Makes it easier to find related components and understand feature dependencies.

### 3. **Design System**
- **Colors**: Cyan/Blue accents for academic tech feel (defined in `globals.css`)
- **Typography**: Geist font family for professional appearance
- **Components**: All Shadcn UI components in `/components/ui/`
- **Spacing**: Consistent Tailwind spacing scale (no arbitrary values)

### 4. **Type Safety**
Three main interfaces in `/types/`:
- `Course` - Individual course definition
- `Recurso` - Library resource metadata
- `OnboardingData` - User profile during onboarding

## Page Routes & Components

| Route | Purpose | Main Component | Data Source |
|-------|---------|---|---|
| `/` | Dashboard home | `Dashboard` | `DASHBOARD_STATS`, `CURRICULUM_DATA` |
| `/mi-malla` | Curriculum map | `MallaView` | `CURRICULUM_DATA` |
| `/curso/[id]` | Course learning path | `LearningPath` | `LEARNING_PATH_DATA`, `TIMELINE_DATA`, `AI_INSIGHTS_DATA`, `EXAM_BANK_DATA` |
| `/recursos` | Resource library | `RecursosBiblioteca` | `RECURSOS_DATA` |
| `/onboarding` | Student setup wizard | `OnboardingWizard` | `CAREERS`, `CURRICULUM_DATA` |
| `/auth/login` | User login | Login form | Auth service (future) |
| `/auth/signup` | User registration | Sign up form | Auth service (future) |

## How to Integrate a Real API

1. **Create API service layer**:
   ```typescript
   // lib/api/courses.ts
   export async function getCourses() {
     const response = await fetch('/api/courses');
     return response.json();
   }
   ```

2. **Update component imports**:
   ```typescript
   // Before
   import { CURRICULUM_DATA } from "@/lib/mockData"
   
   // After
   import { getCourses } from "@/lib/api/courses"
   const data = await getCourses()
   ```

3. **Use Server Components where appropriate**:
   ```typescript
   export default async function Page() {
     const courses = await getCourses()
     return <MallaView courses={courses} />
   }
   ```

## Technology Stack

- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS v4 + Shadcn UI
- **Icons**: Lucide React
- **Forms**: React Hook Form + Zod validation
- **State**: React hooks (useState, useEffect)
- **Database**: Ready for Supabase/Neon integration

## Development Guidelines

1. **Always import data from `mockData.ts`** - Makes it easy to add real API later
2. **Use Shadcn components** - Consistent, accessible UI components
3. **Maintain responsive design** - Mobile-first approach
4. **Follow TypeScript** - Full type safety for props and data
5. **Organize components by feature** - Keep related components together

## Future Improvements

- Database integration (Supabase/Neon)
- Real authentication system
- User progress tracking
- AI API integration
- File upload for resources
- Email notifications
- Real-time collaboration features
```

Now create an API integration guide:
