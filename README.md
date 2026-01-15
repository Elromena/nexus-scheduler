# Nexus Scheduler for Webflow Cloud

A full-stack scheduler application with visitor analytics, designed to run on Webflow Cloud.

## Features

- **Multi-step booking form** - 3-step onboarding flow with calendar scheduling
- **Full attribution tracking** - Track visitors, sessions, page views, and conversions
- **HubSpot integration** - Create/update contacts, deals, and meetings
- **Google Calendar integration** - Check availability and create events with Google Meet
- **Admin dashboard** - View leads, analytics, and funnel metrics
- **SQLite database** - Persistent storage via Cloudflare D1

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Runtime**: Cloudflare Workers (Edge)
- **Database**: SQLite (Cloudflare D1)
- **ORM**: Drizzle ORM
- **Styling**: Tailwind CSS
- **Deployment**: Webflow Cloud

## Quick Start

### 1. Install Dependencies

```bash
cd nexus-scheduler
npm install
```

### 2. Local Development

```bash
# Start dev server
npm run dev

# Preview with Cloudflare Workers runtime
npm run preview
```

### 3. Generate Database Migrations

```bash
npm run db:generate
```

## Deployment to Webflow Cloud

### Step 1: Push to GitHub

```bash
git init
git add .
git commit -m "Initial Nexus Scheduler"
git remote add origin https://github.com/yourusername/nexus-scheduler.git
git push -u origin main
```

### Step 2: Set Up Webflow Cloud

1. Go to your Webflow site → Site Settings → Webflow Cloud
2. Click "Login to GitHub" and connect your account
3. Click "Create New Project"
4. Enter project details:
   - **Name**: nexus-scheduler
   - **GitHub Repository**: Select your repo
5. Click "Create project"

### Step 3: Create Environment

1. Click "Create Environment"
2. Configure:
   - **Branch**: main
   - **Mount Path**: /scheduler
3. Click "Create environment"

### Step 4: Add Storage (SQLite)

1. Go to Environment → Storage tab
2. Click "Add Storage" → SQLite
3. Copy the generated binding and update `wrangler.jsonc`:

```jsonc
"d1_databases": [
  {
    "binding": "DB",
    "database_name": "nexus-scheduler-db",
    "database_id": "YOUR_GENERATED_ID"
  }
]
```

4. Commit and push the change

### Step 5: Configure Environment Variables

Go to Environment → Environment Variables and add:

| Variable | Value | Secret |
|----------|-------|--------|
| `HUBSPOT_ACCESS_TOKEN` | Your HubSpot token | Yes |
| `GOOGLE_SERVICE_ACCOUNT` | Service account JSON | Yes |
| `GOOGLE_CALENDAR_EMAIL` | Calendar email | No |
| `ADMIN_PASSWORD` | Admin login password | Yes |
| `TEST_MODE` | true or false | No |

### Step 6: Deploy

Push to GitHub - Webflow Cloud will auto-deploy:

```bash
git push origin main
```

### Step 7: Publish Webflow Site

Click "Publish" in the Webflow Designer to make changes live.

## Webflow Site Integration

### Add Tracking Script

In Webflow: Site Settings → Custom Code → Head Code:

```html
<script src="https://yourdomain.com/scheduler/tracker.js" defer></script>
```

### Add Scheduler Button

Option 1: Link directly
```
https://yourdomain.com/scheduler
```

Option 2: Open in modal - Add this class to any button:
```
nexus-trigger-btn
```

Then add to Footer Code:

```html
<script>
document.querySelectorAll('.nexus-trigger-btn').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    const overlay = document.createElement('div');
    overlay.id = 'nexus-modal';
    overlay.innerHTML = `
      <div style="position:fixed;inset:0;background:rgba(255,255,255,0.95);z-index:999999;display:flex;align-items:center;justify-content:center;padding:20px;">
        <div style="position:relative;width:100%;max-width:700px;height:90vh;max-height:700px;background:#fff;border-radius:12px;box-shadow:0 25px 60px rgba(0,0,0,0.12);overflow:hidden;">
          <button onclick="this.closest('#nexus-modal').remove()" style="position:absolute;top:15px;right:20px;width:32px;height:32px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:50%;font-size:20px;cursor:pointer;z-index:10;">&times;</button>
          <iframe src="/scheduler" style="width:100%;height:100%;border:none;"></iframe>
        </div>
      </div>
    `;
    document.body.appendChild(overlay);
  });
});
</script>
```

## Admin Dashboard

Access at: `https://yourdomain.com/scheduler/admin`

Login with your `ADMIN_PASSWORD`.

## Project Structure

```
nexus-scheduler/
├── src/
│   ├── app/
│   │   ├── page.tsx              # Scheduler form
│   │   ├── admin/                # Admin dashboard
│   │   └── api/                  # API routes
│   ├── components/
│   │   └── scheduler/            # Form step components
│   └── lib/
│       ├── db/                   # Database schema
│       ├── integrations/         # HubSpot, Google Calendar
│       └── utils/                # Helpers
├── public/
│   └── tracker.js                # Embeddable tracking script
├── wrangler.jsonc                # Cloudflare Workers config
├── webflow.json                  # Webflow Cloud config
└── package.json
```

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/track | Record analytics events |
| POST | /api/slots | Get available time slots |
| POST | /api/submit/step1 | Submit step 1 |
| POST | /api/submit/step2 | Submit step 2 |
| POST | /api/submit/step3 | Complete booking |

### Admin (requires auth)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | /api/leads | Fetch leads |
| GET | /api/analytics | Fetch analytics |

## Analytics Tracked

- Unique visitors & sessions
- Page views with time on page
- Scroll depth
- UTM parameters (first touch & last touch)
- Referrer sources
- Device & browser info
- Country/city (via Cloudflare headers)
- Form funnel events
- Full attribution for conversions

## License

MIT
