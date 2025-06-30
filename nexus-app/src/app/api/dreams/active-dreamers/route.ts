import { NextResponse } from 'next/server';
import { mockActiveDreamers } from '../../../../lib/data/mockData';

export async function GET() {
  return NextResponse.json(mockActiveDreamers);
} 