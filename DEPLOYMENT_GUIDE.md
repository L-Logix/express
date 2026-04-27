# 🚀 Express Airways - Deployment Guide

## Quick Start

### Step 1: Deploy Google Apps Script

1. Open your Google Sheet (the one referenced in `code.gs.txt`)
2. **Extensions → Apps Script**
3. Delete any existing code
4. Paste the entire code from `code.gs.txt`
5. **File → Save** (Name it "Express Airways Backend")
6. **Deploy as Web App:**
   - Click **Deploy** button (▼ next to Save)
   - Select **New deployment**
   - Type: **Web app**
   - Execute as: Your email
   - Who has access: **Anyone**
   - Click **Deploy**
7. Copy the deployment URL (will look like):
   ```
   https://script.google.com/macros/d/XXXXX/usercontent
   ```

### Step 2: Update Frontend

1. Open `index.html`
2. Find this line (around line 1450):
   ```javascript
   const SHEET_API = "https://script.google.com/macros/d/YOUR_DEPLOYMENT_ID/usercontent";
   ```
3. Replace with your actual deployment URL from Step 1
4. Save

### Step 3: Set Up Google Sheets

Create these sheets in your Google Sheet (tab names MUST be exact):

#### **Config**
| Column A | Column B |
|----------|----------|
| Hero_Image | https://wallpapercave.com/wp/wp4615633.jpg |
| Main_Headline | Reliable. Sovereign. Global. |
| Sub_Header | Express Airways - Your Journey Starts Here |

#### **Sections**
| Title | Description | Image | Link |
|-------|-------------|-------|------|
| Premium Comfort | ... | image_url | https://... |
| Global Network | ... | image_url | https://... |

#### **Users**
| FullName | Email | Password | Role | Miles | Status | JoinDate |
|----------|-------|----------|------|-------|--------|----------|
| John Doe | john@example.com | pass123 | Customer | 1000 | 1 | 1/1/2024 |

#### **Bookings**
Pre-populated by system. Columns:
`BookingRef, Email, Status, Origin, Destination, DepartDate, FlightTimes, ServiceType, Passengers, TotalPrice, PaymentMethod, PaxName, PaxDOB, PaxGender, PaxPassport, PaxPhone, PaxCabin`

#### **Events**
| Date | Title | Description | Link | Image |
|------|-------|-------------|------|-------|
| 2/15/2024 | New Route Launch | ... | url | image_url |

#### **Documents**
| Title | Link | Confidential | Image |
|-------|------|--------------|-------|
| Safety Guide | url | FALSE | image_url |
| Executive Report | url | TRUE | image_url |

#### **Ancillaries**
| Type | Description | Price |
|------|-------------|-------|
| Extra Baggage | +1 Checked Bag | 35 |
| Seat Upgrade | Premium Seat | 50 |
| Meal Package | Premium Meal Service | 20 |

#### **Seats**
Auto-populated. Columns: `BookingRef, SeatNumber, Status, PaxName`

#### **AncillaryBookings**
Auto-populated. Columns: `BookingRef, Type, Price`

#### **DocRequests**
Auto-populated. Columns: `ReqID, Email, DocTitle, Status, Date`

#### **Referrals**
Auto-populated. Columns: `RefID, ReferrerEmail, ReferreeEmail, Status, Date`

#### **Reviews**
Auto-populated. Columns: `ReviewID, BookingRef, Email, Rating, Comment, Date`

#### **Contact**
Auto-populated. Columns: `ContactID, Name, Email, Message, Date`

### Step 4: Serve the HTML

Choose one option:

#### **Option A: GitHub Pages (Free)**
1. Create repo with `index.html`
2. Settings → Pages → Deploy from main
3. Gets: `https://username.github.io/express-airways/`

#### **Option B: Netlify (Free)**
1. Create account at netlify.com
2. Drag & drop `index.html`
3. Auto-deployed with HTTPS

#### **Option C: Google Sites (Free)**
1. Create Google Site
2. Embed custom HTML
3. Include the `index.html` content

#### **Option D: Local Testing**
1. Install Python 3
2. Run: `python -m http.server 8000`
3. Open: `http://localhost:8000/`;

---

## 🧪 Testing Checklist

### Booking Flow
- [ ] Search with valid airport codes (JFK, LAX, LHR, CDG, NRT, SYD, ORD, DFW, MIA, BOS, SFO, SEA, DEN, ATL)
- [ ] Verify distance calculation (haversine)
- [ ] Check flight times are realistic
- [ ] Confirm surge pricing for flights <7 days
- [ ] Test weekend premium (Fri-Sun)
- [ ] Verify all prices display in selected currency
- [ ] Test passenger form for 1-4 passengers
- [ ] Seat selection defaults to first available
- [ ] Test ancillaries selection
- [ ] Verify terms/privacy checkboxes required

### Real-Time Features
- [ ] Airport search autocomplete working
- [ ] Weather display shows at destination
- [ ] Operating airlines show frequency
- [ ] Exchange rates update correctly
- [ ] Currency conversions are accurate

### Authentication
- [ ] Signup with email validation
- [ ] Login with correct credentials
- [ ] Logout clears session
- [ ] Admin users see admin button

### Dashboard
- [ ] Bookings display correctly
- [ ] Events show upcoming trips
- [ ] Documents file requests work
- [ ] Account settings save changes
- [ ] Loyalty tier displays correctly
- [ ] Miles meter shows percentage
- [ ] Referral link copies to clipboard

### Admin Panel
- [ ] Only admins can access
- [ ] Stats show real counts
- [ ] User management table displays
- [ ] Booking history shows routes
- [ ] Document requests list appears

### eTicket
- [ ] View eTicket from dashboard
- [ ] Print eTicket formats correctly
- [ ] Barcode displays booking ref
- [ ] Passenger info is accurate

---

## 🔍 Troubleshooting

### "The deployment URL is invalid"
- Verify URL is correct from Apps Script deployment
- Check it ends with `/usercontent`
- Test with `curl` command

### APIs not responding
Test each API:
```bash
curl "https://opensky-network.org/api/airports/query?icao=JFK"
curl "https://api.open-meteo.com/v1/forecast?latitude=40&longitude=0&current=temperature_2m"
curl "https://api.exchangerate-api.com/v4/latest/USD"
```

### Prices showing as "$NaN"
- Check `lastFlightData` is populated
- Verify `exchangeRate` variable is set
- Check console for JavaScript errors

### Surge pricing not showing
- Verify date is within 7 days
- Check `applySurgePricing()` function
- Test with dates 1-7 days from today

### Airports not validating
- Try with known codes: JFK, LAX, LHR
- Check OpenSky API status
- Clear browser cache
- Verify network requests in DevTools

---

## 📊 Performance Optimization

### Cache Recommendations
- Airport data: Cache indefinitely (rarely changes)
- Weather: Cache 10-15 minutes
- Exchange rates: Cache 24 hours
- Flight prices: Never cache (real-time)

### Rate Limiting
- OpenSky: 500 req/min
- Open-Meteo: Unlimited
- ExchangeRate: 50/day (free tier)

### Suggested CDN
- Images: Cloudflare
- Static files: Netlify
- API responses: None needed (already fast)

---

## 🔐 Security Notes

### Before Production
- [ ] Update password rules (min 8 chars, special chars)
- [ ] Implement HTTPS only
- [ ] Add CORS headers to Apps Script
- [ ] Hash passwords in transit
- [ ] Validate all inputs server-side
- [ ] Implement rate limiting on forms
- [ ] Add reCAPTCHA to signup

### Sensitive Data
- Never log passwords
- Use `secure` flag for cookies
- Encrypt payment method
- Validate booking emails match user email

---

## 📈 Scaling Up

### When you get 1000+ users:
1. **Move to Cloud Firestore** instead of Google Sheets
2. **Use Stripe or Square** for payments
3. **Add real flight data** via Amadeus API
4. **Implement Redis** for caching
5. **Use CDN** for static assets
6. **Monitor with Sentry** for errors

---

## 📞 Need Help?

**Test the deployment:**
```
1. Open the Google Sheet
2. Extensions → Apps Script
3. Click Run (play icon)
4. Check Execution log for errors
5. If error: check Sheet names match exactly
```

**Common errors:**
- `Could not find tab named: Config` → Sheet name spelling
- `UrlFetchApp.fetch failed` → API firewall block
- `JSON parse error` → API returned HTML error page

---

## 🎉 Congratulations!

Your Express Airways booking system is live with:
- ✅ Real airport validation
- ✅ Real-time weather
- ✅ Live currency  conversion
- ✅ Dynamic pricing
- ✅ Full booking flow
- ✅ Admin dashboard
- ✅ Loyalty program
- ✅ Multi-currency support

**Next step:** Add real payment processing with Stripe!

---

**Last Updated:** 2026-04-27
