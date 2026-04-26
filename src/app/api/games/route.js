import { NextResponse } from 'next/server';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const pageSize = searchParams.get('page_size') || '15';
  const search = searchParams.get('search');
  const apiKey = process.env.RAWG_API_KEY;

  if (!apiKey) {
    return NextResponse.json({ error: 'RAWG_API_KEY is not configured.' }, { status: 500 });
  }

  try {
    let rawgUrl = `https://api.rawg.io/api/games?key=${apiKey}&page_size=${pageSize}`;
    if (search) {
      rawgUrl += `&search=${encodeURIComponent(search)}`;
    }

    const res = await fetch(rawgUrl, {
      next: { revalidate: 3600 }
    });

    if (!res.ok) {
        throw new Error('Failed to fetch from RAWG');
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching games:", error);
    return NextResponse.json({ results: [] }, { status: 500 });
  }
}
