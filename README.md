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
| `GOOGLE_SERVICE_ACCOUNT` | Service account JSON (stringified) | Yes |
| `ADMIN_PASSWORD` | Admin login password | Yes |
| `DEBUG_LOGGING` | true (optional, for troubleshooting) | No |

**Note:** `TEST_MODE` and `GOOGLE_CALENDAR_EMAIL` are configured in Admin → Settings (not env vars).

### Step 6: Deploy

Push to GitHub - Webflow Cloud will auto-deploy:

```bash
git push origin main
```

### Step 7: Publish Webflow Site

Click "Publish" in the Webflow Designer to make changes live.

## Webflow Site Integration

The footer code below handles both:
1. Loading the tracker script automatically
2. Opening the scheduler in a modal

### Add Scheduler Button

Option 1: Link directly
```
https://yourdomain.com/scheduler
```

Option 2: Open in modal - Add this class to any button:
```
nexus-trigger-btn
```

Then add to **Footer Code** (Site Settings → Custom Code):

```html
<script>
(function () {
  const host = window.location.hostname;
  const isStaging = host.includes('webflow.io');

  const schedulerBase = isStaging
    ? 'https://blockchain-team.webflow.io'
    : 'https://www.blockchain-ads.com';

  // Load tracker
  const s = document.createElement('script');
  s.src = `${schedulerBase}/scheduler/tracker.js`;
  s.defer = true;
  document.head.appendChild(s);

  // Listen for height updates from iframe
  window.addEventListener('message', function(e) {
    if (e.data && e.data.type === 'nexus-scheduler-height') {
      const iframe = document.getElementById('nexus-scheduler-iframe');
      if (iframe) {
        // Set iframe height directly, with max based on viewport
        const newHeight = Math.min(e.data.height + 20, window.innerHeight - 100);
        iframe.style.height = newHeight + 'px';
      }
    }
  });

  // Modal trigger
  document.querySelectorAll('.nexus-trigger-btn').forEach(btn => {
    btn.addEventListener('click', function(e) {
      e.preventDefault();
      const overlay = document.createElement('div');
      overlay.id = 'nexus-modal';
      overlay.innerHTML = `
        <div id="nexus-overlay" style="position:fixed;inset:0;background:rgba(0,0,0,0.6);backdrop-filter:blur(4px);z-index:2147483647;display:flex;align-items:center;justify-content:center;padding:20px;overflow-y:auto;">
          <div id="nexus-iframe-wrapper" style="position:relative;width:100%;max-width:650px;margin:auto;">
            <button onclick="this.closest('#nexus-modal').remove();document.body.style.overflow='';" style="position:absolute;top:-12px;right:-12px;width:36px;height:36px;background:white;border:none;border-radius:50%;font-size:20px;cursor:pointer;z-index:10;display:flex;align-items:center;justify-content:center;box-shadow:0 2px 10px rgba(0,0,0,0.2);">&times;</button>
            
            <!-- Loading State -->
            <div id="nexus-loader" style="position:absolute;inset:0;background:white;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:5;">
              <div style="width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:nexus-spin 0.8s linear infinite;"></div>
              <div style="margin-top:16px;color:#64748b;font-size:14px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">Loading scheduler...</div>
            </div>
            
            <iframe 
              id="nexus-scheduler-iframe" 
              src="${schedulerBase}/scheduler" 
              style="width:100%;height:650px;min-height:500px;border:none;border-radius:16px;background:white;opacity:0;transition:opacity 0.3s ease,height 0.3s ease;"
              onload="document.getElementById('nexus-loader').style.display='none';this.style.opacity='1';"
            ></iframe>
          </div>
        </div>
        <style>
          @keyframes nexus-spin {
            to { transform: rotate(360deg); }
          }
        </style>
      `;
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
      
      // Close on overlay click (not wrapper)
      overlay.querySelector('#nexus-overlay').addEventListener('click', function(ev) {
        if (ev.target === this) {
          overlay.remove();
          document.body.style.overflow = '';
        }
      });
    });
  });

  // Close on Escape key
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
      const modal = document.getElementById('nexus-modal');
      if (modal) {
        modal.remove();
        document.body.style.overflow = '';
      }
    }
  });
})();
</script>
```

**Note:** Update `schedulerBase` URLs to match your staging and production domains.

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
