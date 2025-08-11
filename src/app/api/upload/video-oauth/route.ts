/**
 * API Route Proxy para subida OAuth a Google Drive
 * Redirige las peticiones al backend externo en Render
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://avitec360-backend.onrender.com';

export async function POST(request: NextRequest) {
  console.log('🔄 [Proxy OAuth] Redirigiendo petición al backend...');
  console.log('🔗 [Proxy OAuth] Backend URL configurada:', BACKEND_URL);
  
  // Verificar que la URL del backend esté configurada
  if (!BACKEND_URL || BACKEND_URL.includes('localhost')) {
    console.warn('⚠️ [Proxy OAuth] URL del backend parece incorrecta:', BACKEND_URL);
  }
  
  try {
    // Obtener el FormData del request original
    const formData = await request.formData();
    
    // Log para debugging
    const video = formData.get('video') as File;
    console.log('📦 [Proxy OAuth] FormData obtenido:', {
      videoName: video?.name,
      videoSize: video?.size,
      videoType: video?.type,
      backendUrl: `${BACKEND_URL}/api/upload/video-oauth`
    });
    
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
    
    // Verificar el tipo de contenido antes de parsear
    const contentType = backendResponse.headers.get('content-type') || '';
    let responseData;
    
    try {
      if (contentType.includes('application/json')) {
        responseData = await backendResponse.json();
      } else {
        // Si no es JSON, obtener como texto para debugging
        const textResponse = await backendResponse.text();
        console.error('❌ [Proxy OAuth] Respuesta no-JSON del backend:', textResponse.substring(0, 500));
        
        responseData = {
          success: false,
          error: `Backend devolvió respuesta inválida (${backendResponse.status}): ${backendResponse.statusText}`,
          details: process.env.NODE_ENV === 'development' ? textResponse.substring(0, 200) : 'Respuesta no-JSON del servidor'
        };
      }
    } catch (parseError) {
      console.error('❌ [Proxy OAuth] Error parseando respuesta:', parseError);
      responseData = {
        success: false,
        error: `Error procesando respuesta del backend (${backendResponse.status})`,
        details: process.env.NODE_ENV === 'development' ? parseError : undefined
      };
    }
    
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
