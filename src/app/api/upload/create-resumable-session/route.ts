/**
 * API Route para crear sesión de subida resumable
 * Proxy al backend que maneja OAuth con Google Drive
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://avitec360-backend.onrender.com';

export async function POST(request: NextRequest) {
  console.log('🔄 [Create Session] Creando sesión resumable...');
  
  try {
    const body = await request.json();
    
    console.log('📊 Datos de sesión:', {
      fileName: body.fileName,
      fileSize: body.fileSize,
      sizeMB: (body.fileSize / (1024 * 1024)).toFixed(2)
    });
    
    const response = await fetch(`${BACKEND_URL}/api/upload/create-resumable-session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    const data = await response.json();
    
    if (response.ok) {
      console.log('✅ [Create Session] Sesión creada exitosamente');
      return NextResponse.json(data, { status: 200 });
    } else {
      console.error('❌ [Create Session] Error del backend:', data);
      return NextResponse.json(data, { status: response.status });
    }
    
  } catch (error) {
    console.error('❌ [Create Session] Error en proxy:', error);
    
    return NextResponse.json({
      success: false,
      error: 'Error interno del servidor proxy',
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: 500 });
  }
}
