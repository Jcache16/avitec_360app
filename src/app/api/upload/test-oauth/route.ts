/**
 * API Route Proxy para test OAuth de Google Drive
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://avitec360-backend.onrender.com';

export async function GET() {
  console.log('🧪 [Proxy Test OAuth] Probando conexión OAuth...');
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 segundos timeout
    
    const backendResponse = await fetch(`${BACKEND_URL}/api/upload/test-oauth`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);
    
    const responseData = await backendResponse.json();
    
    console.log(`📡 [Proxy Test OAuth] Respuesta: ${backendResponse.status}`);
    
    if (backendResponse.ok) {
      console.log('✅ [Proxy Test OAuth] Test exitoso');
      return NextResponse.json(responseData, { status: 200 });
    } else {
      console.error('❌ [Proxy Test OAuth] Error:', responseData);
      return NextResponse.json(responseData, { status: backendResponse.status });
    }
    
  } catch (error) {
    console.error('❌ [Proxy Test OAuth] Error:', error);
    
    let errorMessage = 'Error probando conexión OAuth';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout probando OAuth';
        statusCode = 408;
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage
    }, { status: statusCode });
  }
}
