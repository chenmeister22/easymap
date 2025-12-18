// pages/api/google-places.js

const PRICE_ACCEPTED = ["restaurant", "food", "cafe", "bar", "bakery"];

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export default async function handler(req, res) {
  try {
    const {
      lat,
      lng,
      radius = 1000,
      types = "restaurant",
      minprice = 0,
      maxprice = 4,
      limit = 30
    } = req.query;

    const API_KEY = process.env.GOOGLE_PLACES_API_KEY;
    if (!API_KEY) {
      return res.status(500).json({ error: "Missing Google API key" });
    }

    const location = `${lat},${lng}`;
    const placeTypes = types.split(",");

    let allResults = [];

    // Loop over place types (same as your notebook)
    for (const placeType of placeTypes) {
      let url = "https://maps.googleapis.com/maps/api/place/nearbysearch/json";
      let params = {
        location,
        radius,
        type: placeType,
        key: API_KEY
      };

      if (PRICE_ACCEPTED.includes(placeType)) {
        params.minprice = minprice;
        params.maxprice = maxprice;
      }

      let pageCount = 0;

      while (url && allResults.length < 60 && pageCount < 3) {
        const qs = new URLSearchParams(params).toString();
        console.log("Fetching Google Places:", `${url}?${qs}`);
        const response = await fetch(`${url}?${qs}`);
        const data = await response.json();

        if (data.status !== "OK" && data.status !== "ZERO_RESULTS") {
          console.error("Google API error:", data);
          break;
        }

        let filtered;
        if (placeType !== "lodging") {
          filtered = (data.results || []).filter(
            p => !p.types?.includes("lodging")
          );
        } else {
          filtered = data.results || [];
        }

        allResults.push(...filtered);

        const nextPageToken = data.next_page_token;
        if (nextPageToken) {
          await sleep(2000); // REQUIRED by Google
          params = {
            pagetoken: nextPageToken,
            key: API_KEY
          };
          pageCount++;
        } else {
          break;
        }
      }
    }

    // Sort by most reviewed
    const sorted = allResults.sort(
      (a, b) =>
        (b.user_ratings_total || 0) - (a.user_ratings_total || 0)
    );

    const finalResults = sorted.slice(0, Number(limit));

    res.status(200).json({
      count: finalResults.length,
      results: finalResults
    });

  } catch (err) {
    console.error("Google Places handler error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
}
