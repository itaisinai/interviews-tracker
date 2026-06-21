# Telegram Bot - User Guide

## 🚀 Quick Start

Send `/start` to your bot to begin!

## 📋 Commands

### `/start` - Welcome & Instructions
Shows a welcome message with usage instructions.

### `/help` - Help Message
Displays detailed help on how to use the bot.

## 💼 Creating Opportunities

### Simple Flow
Just paste your job opportunity details and the bot will handle the rest!

**Example:**
```
Senior Software Engineer at Google
Remote, $180k-$220k
Applied through LinkedIn
```

### What Happens:
1. **You send** opportunity text
2. **Bot replies:** "🔄 Processing your opportunity... Extracting details with AI..."
3. **AI extracts** company name, role, compensation, etc.
4. **Bot updates message:** "✅ Opportunity Created! 📊 Google 💼 Senior Software Engineer"

## 📝 Message Format

The bot accepts natural language! Just include:

**Required:**
- Company name
- Role/position title

**Optional:**
- Location
- Compensation/salary
- How you heard about it
- Any other notes

### Good Examples

✅ **Minimal:**
```
Software Engineer at Amazon
```

✅ **Detailed:**
```
Senior Backend Engineer at Stripe
$180k-$220k base + equity
Remote (US only)
Applied through employee referral
```

✅ **Casual:**
```
Got a lead on a Staff SWE role at Netflix
Palo Alto office
$250k range
Recruiter reached out on LinkedIn
```

✅ **Multi-line:**
```
Position: Engineering Manager
Company: Shopify
Location: Toronto or Remote
Comp: $200k CAD
Source: Company career page
Notes: They're looking for someone with 5+ years experience
```

## ✨ Features

### Loading States
- Shows "Processing..." while AI is working
- Updates the same message with results (no spam!)

### Smart Parsing
AI automatically extracts:
- ✅ Company name
- ✅ Role title
- ✅ Priority suggestion
- ✅ Status (e.g., "RESEARCH_LEAD")
- ✅ Compensation details
- ✅ Location
- ✅ Important notes

### Rich Formatting
- Uses **bold** and _italics_
- Emoji indicators: 🔄 📊 💼 ✅ ❌
- Clean, readable messages

## 🎯 Tips

### 1. Be Natural
You don't need a specific format. Write naturally:
- "Looking at a PM role at Figma, ~$180k"
- "Stripe is hiring senior engineers, applied today"

### 2. Include Context
Add helpful details:
- How you heard about it
- Referrals or connections
- Application date
- Important deadlines

### 3. One at a Time
Send one opportunity per message for best results.

## 🔍 What Gets Extracted

| Field | Description | Example |
|-------|-------------|---------|
| **Company** | Company name | "Google", "Stripe" |
| **Role** | Job title | "Senior Engineer" |
| **Location** | Office or remote | "Remote", "NYC" |
| **Compensation** | Salary range | "$180k-$220k" |
| **Source** | How you found it | "LinkedIn", "Referral" |
| **Status** | Application stage | "RESEARCH_LEAD" |
| **Priority** | Urgency level | "HIGH", "MEDIUM" |

## ❌ Troubleshooting

### "Failed to create opportunity"
**Cause:** Message too short or missing required info

**Fix:** Include at least company name and role:
```
Software Engineer at Acme Corp
```

### No response from bot
**Check:**
1. Is your API running? (`yarn dev:api`)
2. Is ngrok tunnel active?
3. Is webhook registered? (`./register-webhook.sh`)

### Wrong details extracted
The AI does its best, but you can always edit the opportunity in the web app later.

## 🎨 Message Examples

### Startup Role
```
Seed-stage startup looking for founding engineer
Company: Acme AI
Tech: Python, ML/AI
Equity: 0.5-1%
Found through YC job board
```

### FAANG
```
L5 Software Engineer at Meta
Menlo Park, CA
$250k base + $150k RSU
Recruiter cold outreach
```

### Remote
```
Fully remote Senior Frontend role
Company: GitLab
Stack: Vue.js, Ruby on Rails
$170k-$200k
Applied on their careers page
```

### Referral
```
Backend Engineer position at Notion
Friend John referred me
SF or Remote
~$200k total comp
Interview scheduled for next week
```

## 🔄 Workflow

```
┌─────────────────────────────────────────┐
│  You: Send job description              │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Bot: "🔄 Processing..."                │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  AI: Extract company, role, details     │
└────────────┬────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────┐
│  Bot: "✅ Opportunity Created!"         │
│  📊 Company Name                         │
│  💼 Role Title                           │
└─────────────────────────────────────────┘
```

## 🎓 Advanced Usage

### Quick Add
For rapid fire adding multiple opportunities, just paste them one after another:

```
1st message: "SWE at Google, $200k"
[wait for confirmation]

2nd message: "Engineer at Stripe, remote"
[wait for confirmation]

3rd message: "PM at Figma, $180k"
```

### Rich Descriptions
Include as much detail as you want:
```
Position: Senior Platform Engineer
Company: Datadog
Location: New York or Boston
Compensation: $180-220k base + equity + signing bonus
Benefits: Unlimited PTO, full remote option
Tech Stack: Go, Python, Kubernetes, AWS
Team: Infrastructure team (20 people)
Interview Process: 1 phone screen + 4 on-sites
Timeline: Looking to fill by end of quarter
Source: LinkedIn InMail from recruiter Sarah
Notes: Really excited about this one, they're working on
       interesting distributed systems problems
```

The AI will extract the important parts and organize it for you!

## 🆘 Getting Help

1. Send `/help` for in-bot help
2. Check the API logs for errors
3. See `TELEGRAM_BOT_SETUP.md` for technical setup

---

**Pro tip:** Just start typing naturally! The AI is smart enough to figure it out. 🧠
