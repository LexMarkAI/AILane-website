# Ailane Intelligence Scrapers

Tier 1 regulatory intelligence scrapers for the ACEI/CCI intelligence pipeline.

## Scrapers

### Coroner PFD Reports
Scrapes Prevention of Future Deaths reports from judiciary.uk.

```bash
python coroner_pfd_scraper.py                    # Latest page only
python coroner_pfd_scraper.py --all              # Full historical scrape
python coroner_pfd_scraper.py --since 2024-01-01 # From date onwards
python coroner_pfd_scraper.py --limit 50         # Max reports
```

**Target table:** `coroner_pfd_reports`
**Schedule:** Daily 12:00
**Rate limit:** 1s between requests to judiciary.uk

### HSE Prosecution Register
Scrapes conviction records from the HSE Prosecution Convictions Register.

```bash
python hse_prosecution_scraper.py                    # Recent (last 12 months)
python hse_prosecution_scraper.py --historical       # Full historical (1-10 years)
python hse_prosecution_scraper.py --since 2024-01-01 # From date onwards
python hse_prosecution_scraper.py --limit 100        # Max records
```

**Target table:** `hse_prosecutions`
**Schedule:** Weekly Mon 12:30
**Rate limit:** 2s between requests to resources.hse.gov.uk

## Dependencies

```
requests
beautifulsoup4
python-dotenv
```

## Environment

Requires `.env` file with:

```
SUPABASE_URL=https://cnbsxwtvazfvzmltkuvx.supabase.co
SUPABASE_SERVICE_KEY=<service role key>
```

## Scraper Run Logging

All scrapers write completion records to the `scraper_runs` table with:
- `coroner-pfd-reports` for the Coroner PFD scraper
- `hse-prosecution-register` for the HSE prosecution scraper
