import { NextResponse } from 'next/server';
import { mockNetworkStatus } from '../../../../lib/data/mockData';

export async function GET() {
  return NextResponse.json(mockNetworkStatus);
} 