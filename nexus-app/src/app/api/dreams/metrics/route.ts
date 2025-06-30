import { NextResponse } from 'next/server';
import { mockDreamStateMetrics } from '../../../../lib/data/mockData';

export async function GET() {
  return NextResponse.json(mockDreamStateMetrics);
} 