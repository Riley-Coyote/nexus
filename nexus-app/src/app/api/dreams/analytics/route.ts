import { NextResponse } from 'next/server';
import { mockDreamAnalytics } from '../../../../lib/data/mockData';

export async function GET() {
  return NextResponse.json(mockDreamAnalytics);
} 