/**
 * API Route Proxy para subida OAuth a Google Drive
 * Redirige las peticiones al backend externo en Render
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://avitec360-backend.onrender.com';

export async function POST(request: NextRequest) {
  console.log('🔄 [Proxy OAuth] Redirigiendo petición al backend...');
  
  try {
    // Obtener el FormData del request original
    const formData = await request.formData();
    
    console.log('📦 [Proxy OAuth] FormData obtenido, redirigiendo a:', `${BACKEND_URL}/api/upload/video-oauth`);
    
    // Configurar timeout extendido para subidas grandes
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minutos timeout
    
    // Hacer la petición al backend real
    const backendResponse = await fetch(`${BACKEND_URL}/api/upload/video-oauth`, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
      // No establecer Content-Type aquí, fetch lo hará automáticamente para FormData
    });
    
    clearTimeout(timeoutId);
    
    console.log(`📡 [Proxy OAuth] Respuesta del backend: ${backendResponse.status} ${backendResponse.statusText}`);
    
    // Obtener la respuesta del backend
    const responseData = await backendResponse.json();
    
    if (backendResponse.ok) {
      console.log('✅ [Proxy OAuth] Subida exitosa');
      return NextResponse.json(responseData, { status: 200 });
    } else {
      console.error('❌ [Proxy OAuth] Error del backend:', responseData);
      return NextResponse.json(responseData, { status: backendResponse.status });
    }
    
  } catch (error) {
    console.error('❌ [Proxy OAuth] Error en proxy:', error);
    
    let errorMessage = 'Error interno del servidor proxy';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Timeout: La subida tardó más de 5 minutos';
        statusCode = 408;
      } else if (error.message.includes('fetch')) {
        errorMessage = 'Error de conexión con el backend. Verifique que el servidor esté disponible.';
        statusCode = 503;
      } else {
        errorMessage = error.message;
      }
    }
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      details: process.env.NODE_ENV === 'development' ? error : undefined
    }, { status: statusCode });
  }
}

export async function GET() {
  // Endpoint de prueba
  return NextResponse.json({
    success: true,
    message: 'Proxy OAuth funcionando',
    backendUrl: BACKEND_URL,
    timestamp: new Date().toISOString()
  });
}
