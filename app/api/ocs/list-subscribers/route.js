
import { NextResponse } from "next/server";
const API_URL = "https://ocs-api.esimvault.cloud/v1?token=HgljQn4Uhe6Ny07qTzYqPLjJ";

export async function POST(req) {
  try {
    const { accountId } = await req.json();
    const body = { listSubscriber: { accountId: Number(accountId) || 3771 } };
    const r = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      cache: "no-store"
    });
    const text = await r.text();
    let json; try { json = JSON.parse(text); } catch { json = { raw: text }; }
    return NextResponse.json(json);
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
