# 📋 Nexus Scheduler - Weekly QA Checklist

**Purpose:** Verify the booking funnel, email sequences, and manage booking features are working correctly.

**Schedule:**
| Day | Action |
|-----|--------|
| 📅 **Thursday** | Complete all booking tests (morning) |
| 📅 **Friday** | Monitor reminder emails throughout the day |
| 📅 **Saturday** | Submit QA report |

**Estimated Time:** 25-30 minutes (Thursday) + email monitoring (Friday)

---

## 📆 Recommended Test Timing

Book your test meetings for **Friday between 12 PM - 3 PM** so all reminder emails arrive during working hours.

| Email | When It Sends | Day/Time (Example: Friday 2 PM meeting) |
|-------|---------------|----------------------------------------|
| Confirmation | +2 minutes | Thursday (right after booking) |
| Value Deck | +2 hours | Thursday afternoon |
| Reminder 1 | -20 hours | Thursday 6 PM |
| Reminder 2 | -4 hours | Friday 10 AM |
| Final (Join Link) | -1 hour | Friday 1 PM |

---

## 🔧 Pre-Test Setup (Thursday Morning)

- [ ] Open an **incognito/private browser window** (simulates new visitor)
- [ ] Have **two test email addresses** ready that you can access:
  - Email 1: `yourname+qa-emails@company.com` (for email sequence test)
  - Email 2: `yourname+qa-cancel@company.com` (for cancel/reschedule test)
- [ ] Note the current date and time
- [ ] Have this checklist open to mark items as you go
- [ ] Clear your calendar - you'll book 2 test meetings

---

## 📝 Test Information to Use

### Booking 1: Email Sequence Test
| Field | Value |
|-------|-------|
| First Name | QA Test |
| Last Name | Emails |
| Email | yourname+qa-emails@company.com |
| Website | qatest-emails-week[XX].com |
| Industry | Any option |
| How did you hear? | Any option |
| Budget | Any option |
| Objective | Any option |
| **Meeting Time** | **Friday 2:00 PM** (do NOT cancel) |

### Booking 2: Cancel/Reschedule Test
| Field | Value |
|-------|-------|
| First Name | QA Test |
| Last Name | Cancel |
| Email | yourname+qa-cancel@company.com |
| Website | qatest-cancel-week[XX].com |
| Industry | Any option |
| How did you hear? | Any option |
| Budget | Any option |
| Objective | Any option |
| **Meeting Time** | **Friday 10:00 AM** (will be cancelled) |

> ⚠️ Use unique website names each week (e.g., qatest-emails-week05.com) for tracking.

---

# PART 1: BOOKING FLOW TEST

## ✅ Step 1: Access the Scheduler

- [ ] Go to **blockchain-ads.com**
- [ ] Locate the "Book a Call" or "Get Started" button
- [ ] Click to open the scheduler

**Verify:**
- [ ] Scheduler opens without errors
- [ ] No broken images or missing text

**If FAIL:** Screenshot and note the error message.

---

## ✅ Step 2: Complete Step 1 (Basic Information)

- [ ] Enter First Name
- [ ] Enter Last Name
- [ ] Enter Email Address
- [ ] Enter Website URL
- [ ] Select Industry from dropdown
- [ ] Select "How did you hear about us?" from dropdown
- [ ] Click **Next**

**Verify:**
- [ ] All dropdowns load with options
- [ ] Form accepts input without errors
- [ ] Successfully moves to Step 2

**If FAIL:** Note which field caused the issue.

---

## ✅ Step 3: Complete Step 2 (Qualifying Questions)

- [ ] Select Advertising Budget range
- [ ] Select Primary Objective/Goal
- [ ] Click **Next**

**Verify:**
- [ ] Dropdowns load with options
- [ ] Successfully moves to Step 3 (Calendar)

**If FAIL:** Note the error or unexpected behavior.

---

## ✅ Step 4: Select Date & Time

- [ ] Calendar loads with available dates
- [ ] Select **Friday** as the meeting date
- [ ] Time slots appear for the selected date
- [ ] Select your desired time slot (2:00 PM for Booking 1)
- [ ] Click **Confirm Booking**

**Verify:**
- [ ] Calendar displays correctly (no visual bugs)
- [ ] Only dates **24+ hours in the future** are selectable
- [ ] No past time slots are shown
- [ ] Booking processes without errors

**If FAIL:** Screenshot the calendar and note the issue.

---

## ✅ Step 5: Booking Confirmation Screen

**Verify the confirmation screen shows:**
- [ ] ✅ Correct meeting date and time
- [ ] ✅ Google Meet link (starts with `meet.google.com/...`)
- [ ] ✅ "Add to Calendar" option
- [ ] ✅ "Manage my booking" button/link

**If FAIL:** Screenshot the confirmation screen.

---

## ✅ Step 6: Verify Confirmation Email (+2 minutes)

- [ ] Check your test email inbox (Email 1)
- [ ] Wait up to 5 minutes

**Verify:**
- [ ] Confirmation email received
- [ ] Contains correct meeting date/time
- [ ] Contains Google Meet link
- [ ] All links are clickable and work

**If FAIL:** Check spam folder. Note if email was not received after 10 minutes.

---

## ✅ Step 7: Repeat for Booking 2

Complete Steps 1-6 again using **Email 2** test information.
- [ ] Book for **Friday 10:00 AM**
- [ ] Confirm booking successful
- [ ] Confirmation email received

---

# PART 2: MANAGE BOOKING TEST

## ✅ Step 8: Access Manage Booking

- [ ] Click "Manage my booking" from confirmation screen
  - OR go directly to the manage booking page
- [ ] Enter test email (Email 2: qa-cancel)
- [ ] Click to request verification code

**Verify:**
- [ ] Verification code email arrives within 2 minutes
- [ ] Code is clearly visible in email

---

## ✅ Step 9: Enter Verification Code

- [ ] Enter the verification code from email
- [ ] Click to verify

**Verify:**
- [ ] Code accepted successfully
- [ ] Booking details are displayed correctly:
  - [ ] Correct meeting date/time
  - [ ] Google Meet link shown
  - [ ] Reschedule option visible
  - [ ] Cancel option visible

**If FAIL:** Note if code was rejected or page showed error.

---

## ✅ Step 10: Test Cancel Booking

Using **Booking 2** (Email 2):

- [ ] Click **Cancel** button
- [ ] Confirm cancellation when prompted
- [ ] Cancellation success message appears

**Verify:**
- [ ] Booking status shows as cancelled
- [ ] You can no longer access this booking

**Important Check (Friday):**
- [ ] ❌ No further reminder emails arrive for this cancelled booking

**If FAIL:** Note any error messages.

---

## ✅ Step 11: (Alternative) Test Reschedule

*Only if testing reschedule instead of cancel:*

- [ ] Click **Reschedule** button
- [ ] Select a new date (must be **48+ hours** from original)
- [ ] Select a new time slot
- [ ] Confirm reschedule

**Verify:**
- [ ] Reschedule success message appears
- [ ] New date/time is displayed
- [ ] Google Meet link still works

**Important Check (Friday):**
- [ ] Reminder emails show the **NEW** meeting time, not old time

---

# PART 3: EMAIL SEQUENCE VERIFICATION

## 📧 Thursday Emails (Booking 1 - Email Sequence Test)

| Email | Expected Time | Received? | Correct Content? |
|-------|---------------|-----------|------------------|
| Confirmation | +2 minutes after booking | ☐ Yes ☐ No | ☐ Yes ☐ No |
| Value Deck | +2 hours after booking | ☐ Yes ☐ No | ☐ Yes ☐ No |
| Reminder 1 | -20 hours before meeting | ☐ Yes ☐ No | ☐ Yes ☐ No |

---

## 📧 Friday Emails (Booking 1 - Email Sequence Test)

| Email | Expected Time | Received? | Correct Content? |
|-------|---------------|-----------|------------------|
| Reminder 2 | -4 hours before meeting | ☐ Yes ☐ No | ☐ Yes ☐ No |
| Final (Join Link) | -1 hour before meeting | ☐ Yes ☐ No | ☐ Yes ☐ No |

**For each email, verify:**
- [ ] Correct meeting date/time displayed
- [ ] Google Meet link included and clickable
- [ ] No broken images or formatting issues
- [ ] Sender name/email looks professional

---

## 📧 Cancelled Booking Verification (Booking 2)

- [ ] **CONFIRM:** No reminder emails received for the cancelled booking
- If you DID receive reminders for the cancelled booking, this is a **CRITICAL BUG**

---

# PART 4: QA REPORT (Saturday)

## Test Details

| Field | Value |
|-------|-------|
| **Date of Test** | Thursday, _______________ |
| **Meeting 1 Booked For** | Friday, _______________ at _____ |
| **Meeting 2 Booked For** | Friday, _______________ at _____ (Cancelled) |
| **Tester Name** | _______________ |
| **Test Email 1** | _______________ |
| **Test Email 2** | _______________ |
| **Test Website 1** | _______________ |
| **Test Website 2** | _______________ |
| **Browser Used** | _______________ |
| **Device** | ☐ Desktop ☐ Mobile |

---

## Booking Flow Results

| Step | Status | Notes |
|------|--------|-------|
| Scheduler Access | ☐ Pass ☐ Fail | |
| Step 1 (Basic Info) | ☐ Pass ☐ Fail | |
| Step 2 (Qualifying) | ☐ Pass ☐ Fail | |
| Step 3 (Date/Time) | ☐ Pass ☐ Fail | |
| Confirmation Screen | ☐ Pass ☐ Fail | |
| Manage Booking Access | ☐ Pass ☐ Fail | |
| Verification Code | ☐ Pass ☐ Fail | |
| Cancel/Reschedule | ☐ Pass ☐ Fail | |

---

## Email Sequence Results

| Email | Status | Time Received | Notes |
|-------|--------|---------------|-------|
| Confirmation (+2 min) | ☐ Pass ☐ Fail | | |
| Value Deck (+2 hrs) | ☐ Pass ☐ Fail | | |
| Reminder 1 (-20 hrs) | ☐ Pass ☐ Fail | | |
| Reminder 2 (-4 hrs) | ☐ Pass ☐ Fail | | |
| Final Reminder (-1 hr) | ☐ Pass ☐ Fail | | |
| **Cancelled = No Emails** | ☐ Pass ☐ Fail | | |

---

## Overall Status

**☐ ALL PASS** — Funnel and emails working correctly ✅

**☐ MINOR ISSUES** — Funnel works, minor problems noted below

**☐ CRITICAL ISSUES** — Blocking problems found (see below)

---

## Issues Found

```
List any issues here:

1. Issue: 
   - What happened:
   - Which step:
   - Error message (if any):

2. Issue:
   - What happened:
   - Which step:
   - Error message (if any):
```

---

## Screenshots Attached

- [ ] Yes (attach to report or upload to shared folder)
- [ ] No (no issues found)

---

# 🚨 IMMEDIATE ESCALATION

**Do NOT wait until Saturday if any of these occur:**

| Critical Issue | Action |
|----------------|--------|
| ❌ Scheduler won't open | Notify immediately |
| ❌ Cannot complete booking | Notify immediately |
| ❌ No confirmation email after 10 min | Notify immediately |
| ❌ Google Meet link missing/broken | Notify immediately |
| ❌ Verification code not received | Notify immediately |
| ❌ Cancelled booking still receives emails | Notify immediately |

**Emergency Contact:** [Add primary contact email/phone/Slack]

**Backup Contact:** [Add backup contact]

---

# 🧹 Post-Test Cleanup

After submitting your report, notify the admin team to exclude test bookings from analytics:

**Test Bookings to Exclude:**
| Email | Website |
|-------|---------|
| | |
| | |

---

## 📅 Weekly Schedule Summary

| Day | Time | Task |
|-----|------|------|
| **Thursday** | Morning | Book 2 test meetings |
| **Thursday** | +2 min | Verify confirmation emails |
| **Thursday** | +2 hrs | Verify value deck emails |
| **Thursday** | Afternoon | Test cancel/reschedule on Booking 2 |
| **Thursday** | Evening | Verify Reminder 1 (-20 hrs) |
| **Friday** | Morning | Verify Reminder 2 (-4 hrs) |
| **Friday** | Midday | Verify Final Reminder (-1 hr) |
| **Friday** | End of day | Confirm cancelled booking got NO emails |
| **Saturday** | Any time | Submit QA report |

---

*Document Version: 1.0*  
*Last Updated: January 28, 2026*
