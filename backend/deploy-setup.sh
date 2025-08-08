#!/bin/bash
# deploy-setup.sh - Script de configuración para Render

echo "🚀 Configurando AVITEC 360 Backend para producción..."

# Crear directorio config si no existe
mkdir -p config

# Si hay credenciales en variable de entorno, crear el archivo
if [ ! -z "$GOOGLE_DRIVE_CREDENTIALS" ]; then
    echo "🔐 Configurando credenciales de Google Drive..."
    echo "$GOOGLE_DRIVE_CREDENTIALS" > config/google-drive-credentials.json
    echo "✅ Credenciales configuradas"
else
    echo "⚠️ Variable GOOGLE_DRIVE_CREDENTIALS no encontrada"
    echo "ℹ️ Se usará configuración de desarrollo si está disponible"
fi

# Verificar que las dependencias se instalaron correctamente
if npm list googleapis >/dev/null 2>&1; then
    echo "✅ googleapis instalado correctamente"
else
    echo "❌ Error: googleapis no está instalado"
    echo "🔄 Instalando googleapis..."
    npm install googleapis
fi

echo "🎉 Configuración completada"
