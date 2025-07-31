#!/bin/bash

# Script de prueba para el proyecto PhotoBooth 360

echo "🎬 PhotoBooth 360 - Script de Prueba"
echo "======================================"

# Verificar estructura del proyecto
echo "📁 Verificando estructura del proyecto..."

# Archivos principales
echo "✅ Verificando archivos principales:"
echo "  - package.json: $(test -f package.json && echo "✅" || echo "❌")"
echo "  - src/utils/VideoProcessor.ts: $(test -f src/utils/VideoProcessor.ts && echo "✅" || echo "❌")"
echo "  - src/components/VideoPreview.tsx: $(test -f src/components/VideoPreview.tsx && echo "✅" || echo "❌")"

# Archivos de recursos
echo ""
echo "🎵 Verificando archivos de música:"
echo "  - public/music/beggin.mp3: $(test -f public/music/beggin.mp3 && echo "✅" || echo "❌")"
echo "  - public/music/master_puppets.mp3: $(test -f public/music/master_puppets.mp3 && echo "✅" || echo "❌")"
echo "  - public/music/night_dancer.mp3: $(test -f public/music/night_dancer.mp3 && echo "✅" || echo "❌")"

echo ""
echo "🖼️ Verificando marcos:"
echo "  - public/frames/classic-thumb.svg: $(test -f public/frames/classic-thumb.svg && echo "✅" || echo "❌")"
echo "  - public/frames/modern-thumb.svg: $(test -f public/frames/modern-thumb.svg && echo "✅" || echo "❌")"
echo "  - public/frames/elegant-thumb.svg: $(test -f public/frames/elegant-thumb.svg && echo "✅" || echo "❌")"
echo "  - public/frames/fun-thumb.svg: $(test -f public/frames/fun-thumb.svg && echo "✅" || echo "❌")"

echo ""
echo "🔧 Verificando dependencias..."
npm list @ffmpeg/ffmpeg @ffmpeg/util

echo ""
echo "🚀 Iniciando servidor de desarrollo..."
echo "Una vez que el servidor esté ejecutándose:"
echo "  1. Abre http://localhost:3000"
echo "  2. Prueba el flujo completo:"
echo "     - Selecciona música, marco y texto"
echo "     - Graba un video de 20 segundos"
echo "     - Verifica que se apliquen los efectos"
echo "     - Descarga el video final"
echo ""
echo "🐛 Si hay errores, revisa la consola del navegador para logs detallados"
echo ""

# Iniciar el servidor
npm run dev
