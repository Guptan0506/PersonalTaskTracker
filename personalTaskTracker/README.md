# Personal Task Tracker

A simple React + Vite app for managing projects, tasks, and resources. Uses Supabase for auth, storage, and persistence.

## Features

- Email/password sign up and sign in
- Create, rename, and delete projects
- Add, complete, and remove tasks
- Attach links, notes, and uploaded files to projects

## Quick start

1. Install dependencies

```bash
cd personalTaskTracker
npm install
```

2. Add environment variables in a `.env` file at the project root:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-public-key
```

3. Start the dev server

```bash
npm run dev
```

## Minimal database expectations

The app expects three tables: `projects`, `tasks`, and `resources`, and a Supabase storage bucket named `resources` for file uploads.

## Usage

Sign up, create a project, add tasks, and attach resources from the Resources panel.

## Notes

- Update `src/App.jsx` to read Supabase values from `import.meta.env` when deploying.
- Run `npm run lint` to check code style.

---
