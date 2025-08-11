/**
 * API Route: Upload video a Google Drive
 * 
 * Esta ruta recibe un video del frontend y lo reenvía al backend
 * junto con los metadatos necesarios para subirlo a Google Drive
 */

import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  console.log('🌐 API Route: upload-drive iniciada');
  
  try {
    // Obtener el FormData del frontend
    const formData = await request.formData();
    const videoFile = formData.get('video') as File;
    
    if (!videoFile) {
      return NextResponse.json(
        { success: false, error: 'No se recibió archivo de video' },
        { status: 400 }
      );
    }
    
    console.log('📁 Video recibido:', {
      name: videoFile.name,
      size: videoFile.size,
      type: videoFile.type
    });
    
    // Obtener la URL del backend desde variables de entorno
    const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:3000';
    const uploadEndpoint = `${backendUrl}/upload-to-drive`;
    
    console.log('🎯 Enviando al backend:', uploadEndpoint);
    
    // Crear el array buffer directamente para envío
    const arrayBuffer = await videoFile.arrayBuffer();
    
    // Crear un objeto con los datos necesarios
    const uploadData = {
      fileName: videoFile.name,
      videoData: Array.from(new Uint8Array(arrayBuffer)), // Convertir a array para JSON
      customDate: new Date().toISOString().split('T')[0] // Fecha actual
    };
    
    // Enviar como JSON al backend
    const backendResponse = await fetch(uploadEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(uploadData)
    });
    
    const result = await backendResponse.json();
    
    if (!backendResponse.ok) {
      console.error('❌ Error del backend:', result);
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Error en el backend',
          technicalError: result.technicalError 
        },
        { status: backendResponse.status }
      );
    }
    
    console.log('✅ Subida exitosa:', result);
    
    return NextResponse.json({
      success: true,
      message: 'Video subido exitosamente a Google Drive',
      data: result.data
    });
    
  } catch (error) {
    console.error('❌ Error en API route upload-drive:', error);
    
    return NextResponse.json(
      { 
        success: false, 
        error: 'Error interno del servidor',
        technicalError: error instanceof Error ? error.message : 'Error desconocido'
      },
      { status: 500 }
    );
  }
}

// Configuración para archivos grandes
export const config = {
  api: {
    bodyParser: {
      sizeLimit: '100mb',
    },
  },
};
