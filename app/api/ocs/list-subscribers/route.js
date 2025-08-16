// app/api/ocs/report/route.js

import { NextResponse } from "next/server";

// Replace with your actual API endpoint and token
const API_URL = "https://ocs-api.esimvault.cloud/v1?token=HgljQn4Uhe6Ny07qTzYqPLjJ";

export async function POST(req) {
  try {
    const body = await req.json();

    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });

    const text = await response.text();
    let json;
    try {
      json = JSON.parse(text);
    } catch {
      json = { raw: text };
    }

    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
