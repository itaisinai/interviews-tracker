# Person Research Setup Guide

The person research feature uses **Exa** for neural search of LinkedIn profiles.

## Setup (2 minutes)

### 1. Get Exa API Key

Sign up at **https://exa.ai**

- Click "Get API Key"
- Choose the **Starter plan** ($5/month for 1000 searches) or pay-as-you-go
- Copy your API key

### 2. Add to Environment Variables

Add to your `.env` file:

```bash
EXA_API_KEY=your_exa_api_key_here
```

### 3. Restart API Server

```bash
yarn dev:api
```

That's it! The feature is now ready to use.

---

## How It Works

When you research a person:

1. **Exa searches LinkedIn** using the query format: `"NAME from COMPANY"`
   - Example: `"John Smith from Google"`
   - Uses neural/semantic search (finds profiles even with typos)

2. **Gets LinkedIn content** from the profile page using Exa's content extraction

3. **Parses the profile** to extract:
   - Professional summary
   - Current role and company
   - Work experience
   - Education
   - Skills

---

## Features

✅ **Neural search** - Finds profiles even with nicknames, typos, or alternate names  
✅ **Direct LinkedIn access** - Gets full profile content via Exa  
✅ **Structured content** - Exa returns clean, parsed text  
✅ **Fast** - 1-2 seconds per person  
✅ **Affordable** - Only $0.005 per profile  

---

## Cost Breakdown

| Item | Cost |
|------|------|
| **Exa search + content** | $0.005 per search |
| **Total per profile** | $0.005 |

**Monthly examples:**
- 100 profiles = $0.50
- 500 profiles = $2.50
- 1000 profiles = $5.00

**Much more affordable than alternatives:**
- Proxycurl: $20-30/month for 1000 profiles
- Google + AI: ~$20/month
- **Exa: $5/month** 🎉

---

## Testing

Once configured:

1. Start the app: `yarn dev`
2. Navigate to any interaction with a person name
3. Click the search icon next to the person name
4. Click "Research this person"
5. Optionally add a LinkedIn URL (improves accuracy)
6. Click "Start research"
7. Review the results
8. Click "Save research"

Check the API logs to see Exa searches in action.

---

## Search Query Format

The system uses this format: **`"NAME from COMPANY"`**

Examples:
- `"Sarah Johnson from Microsoft"`
- `"Alex Chen from Stripe"`
- `"Maria Garcia from Tesla"`

If no company is provided, it searches just: **`"NAME"`**

Exa's neural search is smart enough to:
- Handle nicknames ("Bob" → "Robert")
- Fix typos
- Match alternate spellings
- Find profiles even with incomplete info

---

## Troubleshooting

**"EXA_API_KEY environment variable is required"**
- Add the API key to your `.env` file
- Restart the API server

**"No results found"**
- Try adding a LinkedIn URL for better accuracy
- Check the person's name spelling
- Some profiles may be private or not indexed
- Check API logs for error details


**API logs show rate limits**
- Upgrade your Exa plan
- Or wait a few minutes and try again

---

## API Keys

**Exa** offers a free tier with limited searches, then $5/month for 1000 searches.

No credit card required for initial testing.

---

## Environment Variables

```bash
# Required
EXA_API_KEY=your_exa_api_key_here
```

That's it - just 1 environment variable!
