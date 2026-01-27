# Nexus Scheduler for Webflow Cloud

A full-stack scheduler application with visitor analytics, booking management, and CRM integrations — designed to run on Webflow Cloud.

## Features

### Core
- **Multi-step booking form** — 3-step onboarding flow with calendar scheduling
- **Manage bookings** — Users can reschedule or cancel via email verification
- **Double-booking prevention** — Slot locks + real-time Google Calendar availability checks

### Integrations
- **Google Calendar** — Check availability, create events with Google Meet links
- **HubSpot CRM** — Create/update contacts, deals, and meeting engagements
- **Resend Email** — Verification codes for booking management

### Analytics & Admin
- **Full attribution tracking** — Visitors, sessions, page views, UTM, referrers
- **Admin dashboard** — Leads, analytics, funnel metrics, reports
- **Exclude from analytics** — Hide test/internal bookings from reports

### Infrastructure
- **SQLite database** — Persistent storage via Cloudflare D1
- **Edge runtime** — Fast global response times via Cloudflare Workers

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | Next.js 15 (App Router) |
| Runtime | Cloudflare Workers (Edge) |
| Database | SQLite (Cloudflare D1) |
| ORM | Drizzle ORM |
| Styling | Tailwind CSS |
| Deployment | Webflow Cloud |

---

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

---

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

| Variable | Description | Secret |
|----------|-------------|--------|
| `ADMIN_PASSWORD` | Admin login password | Yes |
| `HUBSPOT_ACCESS_TOKEN` | HubSpot private app token | Yes |
| `GOOGLE_SERVICE_ACCOUNT` | Service account JSON (stringified) | Yes |
| `RESEND_API_KEY` | Resend.com API key (for verification emails) | Yes |
| `DEBUG_LOGGING` | Set to `true` for verbose logging (optional) | No |

**Configured via Admin Settings (not env vars):**
- `TEST_MODE` — Toggle test mode on/off
- `GOOGLE_CALENDAR_EMAIL` — Host calendar email
- `HOST_TIMEZONE` — Host timezone (IANA format)
- Calendar availability (days, hours, slot duration, blocked dates)

### Step 6: Deploy

Push to GitHub - Webflow Cloud will auto-deploy:

```bash
git push origin main
```

### Step 7: Publish Webflow Site

Click "Publish" in the Webflow Designer to make changes live.

---

## User-Facing Pages

| URL | Description |
|-----|-------------|
| `/scheduler` | Main booking form (3-step flow) |
| `/scheduler/manage` | Manage existing booking (reschedule/cancel) |

### Manage Booking Flow

1. User enters their email at `/scheduler/manage`
2. System sends 6-digit verification code via Resend
3. User enters code to verify identity
4. User can view booking details, reschedule, or cancel
5. Changes sync to Google Calendar and update database

---

## Admin Dashboard

Access at: `https://yourdomain.com/scheduler/admin`

Login with your `ADMIN_PASSWORD`.

### Admin Sections

| Section | Description |
|---------|-------------|
| **Dashboard** | Overview stats, recent bookings, funnel metrics |
| **Leads** | All bookings with search, filter, pagination |
| **Lead Detail** | Individual booking with full visitor timeline |
| **Analytics** | Conversion metrics, attribution breakdown |
| **Reports** | Monthly trends, export to CSV |
| **Settings** | Test mode, host settings, calendar config, integrations |

### Admin Features

- **Test Mode** — Toggle to skip HubSpot/Google Calendar integrations
- **Exclude Bookings** — Mark internal/test bookings to hide from analytics
- **HubSpot Sync** — Pull latest deal stages from HubSpot
- **Delete Test Bookings** — Remove bookings made in test mode
- **Debug Panel** — View integration status, test connections

---

## Webflow Site Integration

### Option 1: Direct Link

Link directly to the scheduler:
```
https://yourdomain.com/scheduler
```

### Option 2: Modal Popup

Add this class to any button:
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
    ? 'https://your-staging.webflow.io'
    : 'https://www.yourdomain.com';

  // Load tracker
  const s = document.createElement('script');
  s.src = `${schedulerBase}/scheduler/tracker.js`;
  s.defer = true;
  document.head.appendChild(s);

  // Listen for messages from iframe
  window.addEventListener('message', function(e) {
    if (!e.data) return;

    if (e.data.type === 'nexus-scheduler-height') {
      const iframe = document.getElementById('nexus-scheduler-iframe');
      if (iframe) {
        const newHeight = Math.min(e.data.height + 20, window.innerHeight - 100);
        iframe.style.height = newHeight + 'px';
      }
    }

    if (e.data.type === 'nexus-scheduler-close' || e.data === 'close-modal') {
      const modal = document.getElementById('nexus-modal');
      if (modal) {
        modal.remove();
        document.body.style.overflow = '';
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
            
            <div id="nexus-loader" style="position:absolute;inset:0;background:white;border-radius:16px;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:5;">
              <div style="width:40px;height:40px;border:3px solid #e2e8f0;border-top-color:#2563eb;border-radius:50%;animation:nexus-spin 0.8s linear infinite;"></div>
              <div style="margin-top:16px;color:#64748b;font-size:14px;">Loading scheduler...</div>
            </div>
            
            <iframe 
              id="nexus-scheduler-iframe" 
              src="${schedulerBase}/scheduler" 
              style="width:100%;height:650px;min-height:500px;border:none;border-radius:16px;background:white;opacity:0;transition:opacity 0.3s ease,height 0.3s ease;"
              onload="document.getElementById('nexus-loader').style.display='none';this.style.opacity='1';"
            ></iframe>
          </div>
        </div>
        <style>@keyframes nexus-spin { to { transform: rotate(360deg); } }</style>
      `;
      document.body.appendChild(overlay);
      document.body.style.overflow = 'hidden';
      
      overlay.querySelector('#nexus-overlay').addEventListener('click', function(ev) {
        if (ev.target === this) {
          overlay.remove();
          document.body.style.overflow = '';
        }
      });
    });
  });

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

---

## Project Structure

```
nexus-scheduler/
├── src/
│   ├── app/
│   │   ├── page.tsx                    # Scheduler form
│   │   ├── manage/page.tsx             # Manage booking page
│   │   ├── admin/                      # Admin dashboard
│   │   │   ├── page.tsx                # Dashboard home
│   │   │   ├── leads/                  # Leads list & detail
│   │   │   ├── analytics/              # Analytics page
│   │   │   ├── reports/                # Reports page
│   │   │   └── settings/               # Settings page
│   │   └── api/                        # API routes
│   │       ├── submit/                 # Step 1, 2, 3 endpoints
│   │       ├── manage/                 # Send-code, verify, reschedule, cancel
│   │       ├── slots/                  # Available time slots
│   │       ├── track/                  # Analytics tracking
│   │       ├── leads/                  # Admin leads API
│   │       ├── analytics/              # Admin analytics API
│   │       ├── reports/                # Admin reports API
│   │       ├── hubspot/                # HubSpot sync
│   │       └── bookings/               # Booking management (exclude, etc.)
│   ├── components/
│   │   └── scheduler/                  # Form step components
│   └── lib/
│       ├── db/
│       │   ├── schema.ts               # Drizzle ORM schema
│       │   ├── slot-locks.ts           # Slot lock table
│       │   └── migrations/             # SQL migrations
│       ├── integrations/
│       │   ├── hubspot.ts              # HubSpot API client
│       │   ├── google-calendar.ts      # Google Calendar client
│       │   └── resend.ts               # Email (verification codes)
│       └── utils/                      # Helpers
├── public/
│   └── tracker.js                      # Embeddable tracking script
├── wrangler.jsonc                      # Cloudflare Workers config
├── webflow.json                        # Webflow Cloud config
└── package.json
```

---

## API Endpoints

### Public

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/track` | Record analytics events |
| POST | `/api/slots` | Get available time slots |
| POST | `/api/submit/step1` | Submit step 1 (contact info) |
| POST | `/api/submit/step2` | Submit step 2 (qualification) |
| POST | `/api/submit/step3` | Complete booking |
| POST | `/api/manage/send-code` | Send verification code |
| POST | `/api/manage/verify` | Verify code & get booking |
| POST | `/api/manage/reschedule` | Reschedule booking |
| POST | `/api/manage/cancel` | Cancel booking |

### Admin (requires Authorization header)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/leads` | Fetch leads (paginated, filterable) |
| GET | `/api/leads/[id]` | Fetch single lead with timeline |
| PATCH | `/api/leads/[id]` | Update lead (e.g., exclude flag) |
| GET | `/api/analytics` | Fetch analytics metrics |
| GET | `/api/reports` | Fetch report data |
| GET | `/api/reports/export` | Export reports as CSV |
| POST | `/api/hubspot/sync` | Sync deal stages from HubSpot |
| GET/POST | `/api/settings` | Get/update settings |
| GET/POST | `/api/calendar-config` | Get/update calendar config |
| POST | `/api/bookings/exclude` | Preview/apply booking exclusions |
| DELETE | `/api/delete-test-bookings` | Delete test mode bookings |
| GET/POST | `/api/debug` | Debug info & integration tests |

---

## Database Schema

### Tables

| Table | Description |
|-------|-------------|
| `visitors` | Anonymous visitor tracking |
| `sessions` | Individual visit sessions |
| `page_views` | Every page visited |
| `form_events` | Form interactions (step started/completed) |
| `bookings` | Completed bookings with all data |
| `slot_locks` | Prevent double-booking race conditions |
| `verification_codes` | Email verification codes |
| `settings` | Key-value app settings |

---

## Integrations

### Google Calendar

- **Service Account** with domain-wide delegation
- Impersonates host email to read/write calendar
- Checks FreeBusy API for real availability
- Creates events with Google Meet links
- Updates/deletes events on reschedule/cancel

### HubSpot

- **Private App** with CRM scopes
- Creates/updates contacts through booking flow
- Creates deals and meeting engagements
- Syncs deal stages back to local database

### Resend

- **Transactional email** for verification codes
- Used in manage booking flow
- 6-digit codes with 10-minute expiry

---

## Analytics Tracked

- Unique visitors & sessions (30-min timeout)
- Page views with time on page
- Scroll depth
- UTM parameters (first touch & last touch)
- Referrer sources
- Landing pages
- Device, browser, OS
- Country/city (via Cloudflare headers)
- Form funnel events
- Full attribution for conversions

---

## Double-Booking Prevention

The system uses two layers to prevent double-bookings:

1. **Google Calendar Check** — Before showing slots, queries FreeBusy API
2. **Slot Locks** — Database table with unique constraint on (date, time)

When a booking is made:
1. Attempt to acquire slot lock (fails if slot taken)
2. Re-check Google Calendar availability
3. If either fails, release lock and reject booking
4. If both pass, create calendar event and save booking

---

## Test Mode

When enabled in Admin Settings:
- Bookings skip HubSpot integration
- Bookings skip Google Calendar integration
- Bookings are marked with `is_test = 1`
- Test bookings can be bulk deleted later

---

## License

MIT
