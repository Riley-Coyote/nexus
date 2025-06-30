import { NextResponse } from 'next/server';
import { mockLogbookState } from '../../../../lib/data/mockData';

export async function GET() {
  return NextResponse.json(mockLogbookState);
} 