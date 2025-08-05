#!/bin/bash

# 📁 SCRIPT DE PREPARACIÓN DE ASSETS
# Copia automáticamente los archivos necesarios desde el frontend

echo "🎵 Copiando archivos de música..."
mkdir -p assets/music
cp ../public/music/beggin.mp3 assets/music/ 2>/dev/null && echo "✅ beggin.mp3" || echo "❌ beggin.mp3 no encontrado"
cp ../public/music/master_puppets.mp3 assets/music/ 2>/dev/null && echo "✅ master_puppets.mp3" || echo "❌ master_puppets.mp3 no encontrado"  
cp ../public/music/night_dancer.mp3 assets/music/ 2>/dev/null && echo "✅ night_dancer.mp3" || echo "❌ night_dancer.mp3 no encontrado"

echo ""
echo "🔤 Copiando archivos de fuentes..."
mkdir -p assets/fonts
cp ../public/fonts/Montserrat-Regular.ttf assets/fonts/ 2>/dev/null && echo "✅ Montserrat-Regular.ttf" || echo "❌ Montserrat-Regular.ttf no encontrado"
cp ../public/fonts/PlayfairDisplay-Regular.ttf assets/fonts/ 2>/dev/null && echo "✅ PlayfairDisplay-Regular.ttf" || echo "❌ PlayfairDisplay-Regular.ttf no encontrado"
cp ../public/fonts/Chewy-Regular.ttf assets/fonts/ 2>/dev/null && echo "✅ Chewy-Regular.ttf" || echo "❌ Chewy-Regular.ttf no encontrado"

echo ""
echo "📊 Verificando archivos copiados..."
echo "🎵 Música:"
ls -la assets/music/ 2>/dev/null || echo "   Directorio vacío"
echo "🔤 Fuentes:" 
ls -la assets/fonts/ 2>/dev/null || echo "   Directorio vacío"

echo ""
echo "✅ Script completado. Revisa los archivos antes del deploy."
