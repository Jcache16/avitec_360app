/**
 * API Route para verificar estado de subida resumable
 * Proxy al backend que valida la subida completada en Drive
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://avitec360-backend.onrender.com';

export async function POST(request: NextRequest) {
  console.log('🔍 [Verify Upload] Verificando estado de subida...');
  
  try {
    const body = await request.json();
    
    const response = await fetch(`${BACKEND_URL}/api/upload/verify-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ [Verify Upload] Verificación exitosa');
      return NextResponse.json(data, { status: 200 });
    } else {
      console.error('❌ [Verify Upload] Error del backend:', data);
      return NextResponse.json(data, { status: response.status });
    }
    
  } catch (error) {
    console.error('❌ [Verify Upload] Error en proxy:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor proxy',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
