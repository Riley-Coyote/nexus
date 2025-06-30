import { NextResponse } from 'next/server';
import { mockActiveAgents } from '../../../../lib/data/mockData';

export async function GET() {
  return NextResponse.json(mockActiveAgents);
} 