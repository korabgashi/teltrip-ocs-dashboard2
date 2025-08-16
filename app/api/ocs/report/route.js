// app/api/ocs/report/route.js

import { NextResponse } from "next/server";

// External API URL with your token
const API_URL = "https://ocs-api.esimvault.cloud/v1?token=HgljQn4Uhe6Ny07qTzYqPLjJ";

// Handle POST requests from the dashboard
export async function POST(req) {
  try {
    // Get the body from incoming request
    const body = await req.json();

    // Send the same body to the external OCS API
    const response = await fetch(API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(body),
      cache: "no-store"
    });

    // Read response body
    const text = await response.text();

    // Try parsing JSON, or return raw text
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    return NextResponse.json(json);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
