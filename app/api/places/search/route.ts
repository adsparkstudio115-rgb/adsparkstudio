import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { z } from "zod";

export const runtime = "nodejs";
const inputSchema = z.object({
  niche: z.string().trim().min(2).max(80).default("Photography studios"),
  area: z.string().trim().min(2).max(120).default("Maduravoyal, Chennai"),
  maxResults: z.number().int().min(1).max(20).default(20),
  minReviews: z.number().int().min(0).max(10000).default(1),
});

type Place = {
  id: string;
  displayName?: { text?: string };
  formattedAddress?: string;
  nationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  types?: string[];
  businessStatus?: string;
  googleMapsUri?: string;
};

export async function POST(request: Request) {
  try {
    const parsed = inputSchema.safeParse(await request.json());
    if (!parsed.success) return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });

    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) return NextResponse.json({ ok: false, error: "Google Places is not configured on the server." }, { status: 503 });

    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) return NextResponse.json({ ok: false, error: "Please sign in before searching and saving leads." }, { status: 401 });

    const { niche, area, maxResults, minReviews } = parsed.data;
    const response = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Goog-Api-Key": apiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.nationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,places.types,places.businessStatus,places.googleMapsUri",
      },
      body: JSON.stringify({
        textQuery: `${niche} in ${area}, Tamil Nadu, India`,
        pageSize: maxResults,
        languageCode: "en",
        regionCode: "IN",
      }),
      cache: "no-store",
    });

    const payload = await response.json();
    if (!response.ok) {
      return NextResponse.json({ ok: false, error: payload.error?.message || "Google Places search failed." }, { status: response.status });
    }

    const places: Place[] = Array.isArray(payload.places) ? payload.places : [];
    const enriched = places.map((place) => {
      const hasPhone = Boolean(place.nationalPhoneNumber);
      const hasWebsite = Boolean(place.websiteUri);
      const reviewCount = place.userRatingCount ?? 0;
      const qualified = hasPhone && !hasWebsite && reviewCount >= minReviews;
      const score = Math.min(100,
        (hasPhone ? 25 : 0) +
        (!hasWebsite ? 35 : 0) +
        (reviewCount >= 50 ? 25 : reviewCount >= 10 ? 18 : reviewCount > 0 ? 10 : 0) +
        (place.rating && place.rating >= 4 ? 15 : 0)
      );
      return { place, hasPhone, hasWebsite, reviewCount, qualified, score };
    });

    const rows = enriched.map(({ place, hasPhone, hasWebsite, reviewCount, qualified, score }) => ({
      owner_id: user.id,
      google_place_id: place.id,
      business_name: place.displayName?.text || "Unnamed business",
      phone: place.nationalPhoneNumber || null,
      website_url: place.websiteUri || null,
      business_category: place.types?.[0] || niche,
      business_address: place.formattedAddress || area,
      source: "google_places",
      status: qualified ? "qualified" : "new",
      exclusion_reason: !hasPhone ? "No public phone number found" : hasWebsite ? "Already has a website" : reviewCount < minReviews ? "Below minimum Google review threshold" : null,
      evidence: {
        rating: place.rating ?? null,
        userRatingCount: reviewCount,
        businessStatus: place.businessStatus ?? null,
        googleMapsUri: place.googleMapsUri ?? null,
        websiteFound: hasWebsite,
        phoneFound: hasPhone,
        instagramUrl: null,
        reviewRecency: "not_available_from_text_search",
        researchedAt: new Date().toISOString(),
      },
    }));

    let saved = 0;
    const leadIdByPlaceId = new Map<string, string>();
    if (rows.length) {
      const { data, error } = await supabase.from("leads")
        .upsert(rows, { onConflict: "owner_id,google_place_id" })
        .select("id,google_place_id");
      if (error) return NextResponse.json({ ok: false, error: `Search succeeded, but saving leads failed: ${error.message}` }, { status: 500 });
      saved = data?.length ?? 0;
      for (const item of data ?? []) leadIdByPlaceId.set(item.google_place_id, item.id);
    }

    return NextResponse.json({
      ok: true,
      query: `${niche} in ${area}, Chennai`,
      totalFound: places.length,
      qualifiedCount: enriched.filter((x) => x.qualified).length,
      saved,
      note: "Google Places text search does not reliably provide latest-review dates or Instagram activity. Those require a separate evidence-based research step.",
      results: enriched.map(({ place, hasPhone, hasWebsite, reviewCount, qualified, score }) => ({
        placeId: place.id,
        leadId: leadIdByPlaceId.get(place.id) ?? null,
        name: place.displayName?.text || "Unnamed business",
        address: place.formattedAddress || null,
        phone: place.nationalPhoneNumber || null,
        website: place.websiteUri || null,
        rating: place.rating ?? null,
        reviewCount,
        googleMapsUrl: place.googleMapsUri || null,
        hasPhone,
        hasWebsite,
        qualified,
        score,
      })),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unexpected server error";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
