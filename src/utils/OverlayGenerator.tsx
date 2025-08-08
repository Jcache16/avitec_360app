import { StaticCanvas, Rect, Text, Shadow, FabricImage } from 'fabric';
import { StyleConfig } from "@/utils/VideoProcessor";

/**
 * Verifica que las fuentes de Google Fonts estén cargadas
 */
async function ensureFontsLoaded(): Promise<void> {
  const fontsToCheck = [
    "'Playfair Display'",
    "'Chewy'", 
    "'Montserrat'"
  ];

  for (const font of fontsToCheck) {
    try {
      // Verificar si la fuente está disponible usando document.fonts API
      if ('fonts' in document) {
        await document.fonts.load(`16px ${font}`);
        console.log(`✅ Fuente cargada: ${font}`);
      }
    } catch (error) {
      console.warn(`⚠️ Error verificando fuente ${font}:`, error);
    }
  }
  
  // Esperar un poco más para asegurar la carga
  await new Promise(resolve => setTimeout(resolve, 500));
  console.log('✅ Verificación de fuentes completada');
}

/**
 * Genera un PNG overlay robusto usando fabric.js v6.
 * OPTIMIZADO: Resolución 480x854 para compatibilidad con video procesado
 */
export async function generateOverlayPNG(
  config: StyleConfig,
  width: number = 480,  // CORREGIDO: de 720 a 480
  height: number = 854  // CORREGIDO: de 1280 a 854
): Promise<Blob> {
  return new Promise(async (resolve, reject) => {
    try {
      console.log('🎨 Generando overlay PNG con config:', config);
      
      // ASEGURAR QUE LAS FUENTES ESTÉN CARGADAS ANTES DE GENERAR
      await ensureFontsLoaded();
      
      // Crear un canvas HTML temporal
      const canvasElement = document.createElement('canvas');
      canvasElement.width = width;
      canvasElement.height = height;
      
      // Crea canvas fabric.js SIN backgroundColor (transparente)
      const canvas = new StaticCanvas(canvasElement, { 
        width, 
        height,
        backgroundColor: 'transparent'
      });

      console.log('📐 Canvas creado:', width, 'x', height);

      // --- Marco decorativo ---
      if (config.frame && config.frame !== "none") {
        console.log('🖼️ Agregando marco:', config.frame);
        
        if (config.frame === "custom" && config.frameColor) {
          // Marco personalizado con color
          const color = config.frameColor;
          
          // CORREGIDO: Proporciones ajustadas para 480x854
          const outerRect = new Rect({
            left: 8, top: 8,   // Reducido de 11 a 8
            width: width - 16,  // Reducido de 22 a 16
            height: height - 16,
            rx: 32, ry: 32,    // Reducido de 44 a 32
            stroke: color, 
            strokeWidth: 16,   // Reducido de 22 a 16
            fill: "transparent", 
            selectable: false
          });
          canvas.add(outerRect);

          const innerRect = new Rect({
            left: 24, top: 24,  // Reducido de 34 a 24
            width: width - 48,  // Reducido de 68 a 48
            height: height - 48,
            rx: 12, ry: 12,    // Reducido de 16 a 12
            stroke: color + "80", 
            strokeWidth: 6,    // Reducido de 8 a 6
            fill: "transparent", 
            selectable: false
          });
          canvas.add(innerRect);
          
        } else if (config.frame !== "custom") {
          // Marco PNG predefinido
          try {
            console.log(`📸 Cargando imagen de marco: /frames/${config.frame}.png`);
            
            // Crear elemento de imagen
            const imgElement = document.createElement('img');
            imgElement.crossOrigin = 'anonymous';
            
            await new Promise<void>((resolveImg, rejectImg) => {
              imgElement.onload = () => resolveImg();
              imgElement.onerror = () => rejectImg(new Error(`Error cargando imagen: /frames/${config.frame}.png`));
              imgElement.src = `/frames/${config.frame}.png`;
            });
            
            // Crear objeto fabric image
            const fabricImg = new FabricImage(imgElement, {
              left: 0,
              top: 0,
              scaleX: width / imgElement.width,
              scaleY: height / imgElement.height,
              selectable: false,
              evented: false
            });
            
            canvas.add(fabricImg);
            console.log('✅ Marco PNG agregado exitosamente');
            
          } catch (imgError) {
            console.warn('⚠️ Error cargando marco PNG, continuando sin marco:', imgError);
          }
        }
      }

      // --- Texto personalizado ---
      if (config.text && config.text.trim()) {
        console.log('📝 Agregando texto:', config.text);
        
        // Mapear fuentes usando exactamente los nombres cargados (sin fallbacks genéricos)
        const fontMap: Record<string, string> = {
          playfair: "'Playfair Display'",
          chewy: "'Chewy'", 
          montserrat: "'Montserrat'",
        };
        const fontFamily = fontMap[config.textFont || "montserrat"] || "'Montserrat'";
        
        console.log('🔤 Fuente seleccionada:', fontFamily);
        
        // Crear objeto de texto temporal para medir dimensiones (MISMO fontSize que el texto final)
        const finalFontSize = 24;
        const tempTextObj = new Text(config.text, {
          fontFamily,
          fontSize: finalFontSize,
          fontWeight: "bold",
        });
        
        // Medir el texto real
        const textWidth = tempTextObj.width || 0;
        const textHeight = tempTextObj.height || finalFontSize;
        
        // Calcular dimensiones del fondo con padding proporcional
        const paddingX = Math.max(20, textWidth * 0.1); // 10% del ancho del texto como mínimo
        const paddingY = 12;  // Reducido para mejor proporción con texto más pequeño
        const backgroundWidth = Math.min(textWidth + (paddingX * 2), width - 40); // Máximo ancho menos margen
        const backgroundHeight = textHeight + (paddingY * 2);
        
        // Posición centrada del fondo
        const backgroundX = (width - backgroundWidth) / 2;
        const backgroundY = height - 80 - backgroundHeight / 2;
        
        // Posición centrada del texto (RELATIVA al fondo)
        const textX = width / 2;  // Centrado horizontalmente
        const textY = backgroundY + (backgroundHeight / 2);  // Centrado en el fondo
        
        console.log('📐 Dimensiones calculadas:', { 
          textWidth, 
          textHeight, 
          backgroundWidth, 
          backgroundHeight,
          backgroundY,
          textY
        });
        
        // CORREGIDO: Fondo ajustado al contenido real con opacidad similar al preview
        const textBg = new Rect({
          left: backgroundX,
          top: backgroundY,
          width: backgroundWidth,
          height: backgroundHeight,
          fill: "rgba(0,0,0,0.3)",  // CORREGIDO: 30% como en preview (era 70%)
          selectable: false, 
          rx: 12,
          ry: 12
        });
        canvas.add(textBg);

        const textObj = new Text(config.text, {
          left: textX,
          top: textY,              // CORREGIDO: Centrado en relación al fondo
          fontFamily,             // Usar la fuente específica de Google Fonts
          fontSize: finalFontSize, // CORREGIDO: Usar la misma variable
          fontWeight: "bold",
          fill: config.textColor || "#FFFFFF",
          // REMOVIDO: stroke y strokeWidth para coincidir con preview
          originX: "center",
          originY: "center",
          shadow: new Shadow({
            color: "rgba(0,0,0,0.8)",
            blur: 6,              // Reducido de 8 a 6
            offsetX: 1.5,         // Reducido de 2 a 1.5
            offsetY: 1.5
          }),
          selectable: false
        });
        canvas.add(textObj);
        
        console.log('✅ Texto agregado con fuente:', fontFamily);
      }

      // --- INDICADOR DE MÚSICA REMOVIDO ---
      // El indicador de música ya no se muestra en el overlay para reducir elementos visuales
      // La información de música se maneja solo a nivel de audio en el video final
      if (config.music && config.music !== "none") {
        console.log('🎵 Música seleccionada (sin mostrar en overlay):', config.music);
      }

      console.log('🔄 Renderizando canvas...');
      
      // Renderizar el canvas
      canvas.renderAll();
      
      // Esperar un frame para asegurar que se renderice
      await new Promise(resolve => requestAnimationFrame(resolve));
      
      // Exportar como dataURL
      const dataUrl = canvas.toDataURL({ 
        format: "png", 
        quality: 1,
        multiplier: 1,
        enableRetinaScaling: false
      });
      
      console.log('📤 DataURL generado, tamaño:', dataUrl.length);
      
      // Convertir a blob
      if (!dataUrl || dataUrl === 'data:,') {
        throw new Error('Canvas no generó dataURL válido');
      }
      
      // Usar una promesa separada para fetch
      try {
        const response = await fetch(dataUrl);
        const blob = await response.blob();
        
        if (!blob || blob.size === 0) {
          throw new Error('Blob generado está vacío');
        }
        
        console.log('✅ Overlay PNG generado exitosamente:', blob.size, 'bytes');
        resolve(blob);
        
      } catch (fetchError) {
        console.error('❌ Error convirtiendo dataURL a blob:', fetchError);
        
        // Fallback: convertir manualmente
        try {
          const base64Data = dataUrl.split(',')[1];
          const binaryString = atob(base64Data);
          const bytes = new Uint8Array(binaryString.length);
          
          for (let i = 0; i < binaryString.length; i++) {
            bytes[i] = binaryString.charCodeAt(i);
          }
          
          const fallbackBlob = new Blob([bytes], { type: 'image/png' });
          
          if (fallbackBlob.size > 0) {
            console.log('✅ Overlay PNG generado con fallback:', fallbackBlob.size, 'bytes');
            resolve(fallbackBlob);
          } else {
            throw new Error('Fallback blob también está vacío');
          }
          
        } catch (fallbackError) {
          console.error('❌ Error en fallback:', fallbackError);
          reject(new Error('No se pudo generar el overlay PNG'));
        }
      }
      
    } catch (error) {
      console.error('❌ Error generando overlay:', error);
      reject(error);
    }
  });
}