import { NextResponse } from 'next/server';
import { mockSystemVitals } from '../../../../lib/data/mockData';

export async function GET() {
  return NextResponse.json(mockSystemVitals);
} 