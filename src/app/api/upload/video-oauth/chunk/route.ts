/**
 * API Route Proxy para subida OAuth a Google Drive en chunks
 * Redirige las peticiones al backend externo en Render
 */

import { NextRequest, NextResponse } from 'next/server';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'https://avitec360-backend.onrender.com';

// Forzar runtime Node para permitir streaming del body
export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutos

export async function POST(request: NextRequest) {
  console.log('🔄 [Proxy OAuth CHUNK] Redirigiendo chunk al backend...');
  console.log('🔗 [Proxy OAuth CHUNK] Backend URL:', BACKEND_URL);

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 300000);

    // Reenviar el body en streaming junto con los headers de control
    const backendResponse = await fetch(`${BACKEND_URL}/api/upload/video-oauth-chunk`, {
      method: 'POST',
      body: request.body,
      headers: {
        // Tipo binario para chunks
        'Content-Type': request.headers.get('content-type') || 'application/octet-stream',
        // Metadatos de chunk
        'x-upload-id': request.headers.get('x-upload-id') || '',
        'x-chunk-index': request.headers.get('x-chunk-index') || '',
        'x-chunk-total': request.headers.get('x-chunk-total') || '',
        'x-chunk-size': request.headers.get('x-chunk-size') || '',
        'x-file-name': request.headers.get('x-file-name') || '',
        'x-file-size': request.headers.get('x-file-size') || '',
        'x-file-mime': request.headers.get('x-file-mime') || '',
      },
      signal: controller.signal,
      // @ts-expect-error duplex no está tipado en fetch de TS
      duplex: 'half',
    });

    clearTimeout(timeoutId);

    const contentType = backendResponse.headers.get('content-type') || '';
    let data: any;
    if (contentType.includes('application/json')) {
      data = await backendResponse.json();
    } else {
      const text = await backendResponse.text();
      data = { success: backendResponse.ok, message: text };
    }

    return NextResponse.json(data, { status: backendResponse.status });
  } catch (error) {
    console.error('❌ [Proxy OAuth CHUNK] Error en proxy:', error);
    const isAbort = error instanceof Error && error.name === 'AbortError';
    return NextResponse.json({
      success: false,
      error: isAbort ? 'Timeout en subida de chunk' : (error as Error)?.message || 'Error en proxy de chunks',
    }, { status: isAbort ? 408 : 500 });
  }
}
