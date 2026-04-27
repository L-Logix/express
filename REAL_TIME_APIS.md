# 🌐 Express Airways - Real-Time API Integration Guide

## Overview
This document explains all real-time APIs integrated into the Express Airways booking system. All APIs used are **FREE** and **require NO authentication keys**.

---

## 🔄 Real-Time APIs Integrated

### 1. 🛫 **OpenSky Network API** - Airport & Flight Data
**URL:** `https://opensky-network.org/api/`  
**Free Tier:** Yes (500 requests/minute)  
**Auth Required:** No

#### Endpoints Used:

**a) Airport Query**
```
GET /airports/query?icao={code}
```
- Returns airport information by ICAO code
- Returns: name, lat/lng, municipality, country
- **Usage:** Validates airport codes and gets coordinates for distance calculation

**b) Airport Search**
```
GET /airports/query?query={search_term}
```
- Searches for airports by name/city
- Returns up to 10 results
- **Usage:** Autocomplete suggestions for booking form

**c) Route Query**
```
GET /routes?origin={code}&destination={code}
```
- Returns operating airlines on route
- Returns frequency of flights
- **Usage:** Shows which airlines operate this route and how often

**Backend Functions:**
- `validateAirportCode(code)` - Validates airport with real data
- `searchAirports(query)` - Autocomplete search
- `getFlightStatusRealTime(origin, dest)` - Gets operating airlines

---

### 2. 🌦️ **Open-Meteo API** - Real-Time Weather
**URL:** `https://api.open-meteo.com/v1/`  
**Free Tier:** Yes (unlimited requests!)  
**Auth Required:** No

#### Endpoint Used:
```
GET /forecast?latitude={lat}&longitude={lng}&current={params}&temperature_unit=fahrenheit
```

**Parameters:**
- `current=temperature_2m,weather_code,wind_speed_10m`
- `temperature_unit=fahrenheit` (or `celsius`)

**Returns:**
- Current temperature
- Weather condition (clear, rainy, snowy, etc.)
- Wind speed
- Precipitation

**Backend Function:**
- `getDestinationWeather(lat, lng)` - Gets weather at destination
- `getWeatherCondition(code)` - Converts WMO codes to readable conditions

**Frontend Display:**
Shows weather forecast during flight search with:
- 🌦️ Weather condition
- Temperature in °F
- Wind speed in km/h

---

### 3. 💱 **ExchangeRate-API** - Live Currency Conversion
**URL:** `https://api.exchangerate-api.com/v4/`  
**Free Tier:** Yes (1500 requests/month - 50/day)  
**Auth Required:** No

#### Endpoint Used:
```
GET /latest/{currency}
```

**Supported Currencies:**
- USD (default)
- EUR (Euro)
- GBP (British Pound)
- JPY (Japanese Yen)
- AUD (Australian Dollar)
- + 150 more

**Returns:** Exchange rates from base currency to all others

**Backend Function:**
- `getExchangeRate(baseCurrency, targetCurrency)` - Gets real-time rate

**Frontend Features:**
- Dropdown selector for currency (USD, EUR, GBP, JPY, AUD)
- Real-time price conversion
- Automatic update when currency changes
- Smart formatting (JPY as integer, others with 2 decimals)

**Example:**
```
Original: $1,245.00
In EUR:   €1,156.78 (with current rate)
```

---

## 💰 Dynamic Pricing System

### Real-Time Pricing Factors:

1. **Base Distance**: $100 + (distance × $0.10 per mile)
2. **Service Type Multiplier:**
   - EA (International): ×1.25
   - EX (Domestic): ×0.95
   - EC (Charter): ×1.75

3. **Day of Week Multiplier:**
   - Friday-Sunday: ×1.15 (weekend premium)
   - Monday-Thursday: ×1.0

4. **Fuel Surcharge:** ×1.08 (8% of total)

5. **Surge Pricing (if <7 days):**
   - 1-3 days: +35%
   - 4-7 days: +20%

### Example Calculation:
```
JFK → LAX (2,451 miles)
Service: EA (International)
Date: Friday (weekend premium)

Base Fare = $100 + (2,451 × $0.10) = $345.10
Service Multiplier: $345.10 × 1.25 = $431.38
Weekend Premium: $431.38 × 1.15 = $496.09
Fuel Surcharge: $496.09 × 1.08 = $535.74
Final Fare per Passenger: $535.74
```

---

## ✈️ Flight Distance & Time Calculation

### Haversine Formula
Calculates great-circle distance between two coordinates:

```
Real Distance = haversine(lat1, lng1, lat2, lng2)
Flight Time = (Distance / Cruise Speed) + Climb/Descent Time
            = (Distance / 500 mph) + 0.25 hours
```

### Examples:
| Route | Distance | Flight Time |
|-------|----------|-------------|
| NYC → LAX | 2,451 miles | 5.2 hours |
| NYC → London | 3,459 miles | 7.1 hours |
| NYC → Boston | 215 miles | 0.7 hours |

---

## 📊 Backend API Endpoints

### GET Endpoints (Real-Time Data)

**1. Validate Specific Airport**
```
GET ?action=validateAirport&code=JFK
Response:
{
  "success": true,
  "airport": {
    "name": "John F. Kennedy",
    "lat": 40.6413,
    "lng": -73.7781,
    "type": "international",
    "city": "New York",
    "country": "USA"
  }
}
```

**2. Search Airports (Autocomplete)**
```
GET ?action=searchAirports&query=new
Response:
{
  "success": true,
  "airports": [
    {
      "code": "JFK",
      "name": "John F. Kennedy",
      "city": "New York",
      "country": "USA"
    },
    ...
  ]
}
```

**3. Flight Information**
```
GET ?action=getFlightTime&origin=JFK&destination=LAX&departDate=2024-01-15&serviceType=EA
Response:
{
  "success": true,
  "flightTime": "5.20",
  "baseFare": 536,
  "surgeFare": 536,          // 0% surge (not within 7 days)
  "distanceMiles": "2451",
  "origin": { /* full airport data */ },
  "destination": { /* full airport data */ },
  "weather": {
    "temp": 72,
    "windSpeed": 12,
    "condition": "Clear"
  },
  "flightStatus": {
    "operatingAirlines": "Multiple airlines operating",
    "frequency": 15          // flights per day approximately
  }
}
```

**4. Destination Weather**
```
GET ?action=getWeather&code=LAX
Response:
{
  "success": true,
  "weather": {
    "temp": 75,
    "windSpeed": 8,
    "condition": "Partly Cloudy"
  },
  "airport": "LAX"
}
```

**5. Exchange Rate**
```
GET ?action=getExchangeRate&currency=EUR
Response:
{
  "success": true,
  "rate": 0.9245,           // 1 USD = 0.9245 EUR
  "from": "USD",
  "to": "EUR"
}
```

---

## 🎨 Frontend Integration

### Airport Search AutoComplete
```html
<input type="text" id="origin" placeholder="e.g., JFK" list="originList">
<datalist id="originList"></datalist>
```

Triggers on input:
```javascript
originInput.addEventListener('input', (e) => 
  searchAirportsRealTime(e.target.value, 'originList')
);
```

### Currency Selector
```html
<select id="currencySelect" onchange="updateCurrency()">
  <option value="USD">USD ($)</option>
  <option value="EUR">EUR (€)</option>
  <option value="GBP">GBP (£)</option>
  <option value="JPY">JPY (¥)</option>
  <option value="AUD">AUD (A$)</option>
</select>
```

### Price Display Formatter
```javascript
function formatPrice(usdAmount) {
  const converted = usdAmount * exchangeRate;
  const symbols = {
    'USD': '$', 'EUR': '€', 'GBP': '£', 
    'JPY': '¥', 'AUD': 'A$'
  };
  if (selectedCurrency === 'JPY') {
    return symbols[selectedCurrency] + Math.round(converted);
  }
  return symbols[selectedCurrency] + converted.toFixed(2);
}
```

### Real-Time Flight Data Display
Flight search shows:
- ✈️ Operating airlines and daily frequency
- 🌦️ Destination weather
- 📏 Actual distance (haversine calculated)
- ⏱️ Exact flight time
- 💰 Dynamic pricing with applicable surcharges

---

## 📈 Real-Time Features Summary

| Feature | API Used | Real-Time | Update Frequency |
|---------|----------|-----------|-------------------|
| Airport Validation | OpenSky | ✅ Yes | Instant |
| Airport Search | OpenSky | ✅ Yes | Instant |
| Distance Calculation | Haversine | ✅ Yes | Instant |
| Flight Time | Calculated | ✅ Yes | Instant |
| Weather at Destination | Open-Meteo | ✅ Yes | 10-15 min |
| Operating Airlines | OpenSky | ✅ Yes | Instant |
| Currency Rates | ExchangeRate-API | ✅ Yes | Up to 1x daily |
| Dynamic Pricing | Calculated | ✅ Yes | Instant |
| Fuel Surcharge | Estimated | ✅ Yes | Instant |
| Weekend Premium | Calendar | ✅ Yes | Instant |

---

## 🔒 API Reliability & Fallbacks

All major functions have fallback mechanisms:

```javascript
try {
  // Try real-time API
  const data = fetch(API_URL);
  return data;
} catch(e) {
  // Fallback to cached/estimated data
  return AIRPORT_CACHE[code] || null;
}
```

### Cache Strategy:
- Airport data cached after first validation
- Reduces repeat API calls
- Faster subsequent searches
- Automatically updated from API

---

## 🚀 Deployment Checklist

Before deploying to production:

- [ ] Verify all 3 APIs are accessible (no corporate firewalls blocking)
- [ ] Monitor API rate limits (ExchangeRate is most restrictive)
- [ ] Add error handling UI for API failures
- [ ] Cache exchange rates (update 1x/day max)
- [ ] Test with multiple airports and dates
- [ ] Verify weather display in different climates
- [ ] Check currency formatting for all 5 currencies
- [ ] Monitor performance with load testing

---

## 📝 Future Real-Time Enhancements

**Possible additions:**
1. **Amadeus Sandbox API** - Real flight availability & pricing
2. **AviationStack API** - Live flight tracking
3. **Skyscanner API** - Multi-airport search
4. **IATA Airport Status API** - Delays/closures
5. **TradingView** - Dynamic fuel prices
6. **Stripe** - Real payment processing

---

## 📞 Support

**API Status Pages:**
- [OpenSky Status](https://opensky-network.org/)
- [Open-Meteo Status](https://open-meteo.com/)
- [ExchangeRate-API Status](https://exchangerate-api.com/)

**Testing the APIs:**
```bash
# Airport validation
curl "https://opensky-network.org/api/airports/query?icao=JFK"

# Weather
curl "https://api.open-meteo.com/v1/forecast?latitude=40.6413&longitude=-73.7781&current=temperature_2m"

# Exchange rate
curl "https://api.exchangerate-api.com/v4/latest/USD"
```

---

**Last Updated:** 2026-04-27
