@echo off
REM 📁 SCRIPT DE PREPARACIÓN DE ASSETS PARA WINDOWS
REM Copia automáticamente los archivos necesarios desde el frontend

echo 🎵 Copiando archivos de música...
if not exist "assets\music" mkdir "assets\music"

if exist "..\public\music\beggin.mp3" (
    copy "..\public\music\beggin.mp3" "assets\music\" >nul 2>&1 && echo ✅ beggin.mp3 || echo ❌ Error copiando beggin.mp3
) else (
    echo ❌ beggin.mp3 no encontrado
)

if exist "..\public\music\master_puppets.mp3" (
    copy "..\public\music\master_puppets.mp3" "assets\music\" >nul 2>&1 && echo ✅ master_puppets.mp3 || echo ❌ Error copiando master_puppets.mp3
) else (
    echo ❌ master_puppets.mp3 no encontrado
)

if exist "..\public\music\night_dancer.mp3" (
    copy "..\public\music\night_dancer.mp3" "assets\music\" >nul 2>&1 && echo ✅ night_dancer.mp3 || echo ❌ Error copiando night_dancer.mp3
) else (
    echo ❌ night_dancer.mp3 no encontrado
)

echo.
echo 🔤 Copiando archivos de fuentes...
if not exist "assets\fonts" mkdir "assets\fonts"

if exist "..\public\fonts\Montserrat-Regular.ttf" (
    copy "..\public\fonts\Montserrat-Regular.ttf" "assets\fonts\" >nul 2>&1 && echo ✅ Montserrat-Regular.ttf || echo ❌ Error copiando Montserrat-Regular.ttf
) else (
    echo ❌ Montserrat-Regular.ttf no encontrado
)

if exist "..\public\fonts\PlayfairDisplay-Regular.ttf" (
    copy "..\public\fonts\PlayfairDisplay-Regular.ttf" "assets\fonts\" >nul 2>&1 && echo ✅ PlayfairDisplay-Regular.ttf || echo ❌ Error copiando PlayfairDisplay-Regular.ttf
) else (
    echo ❌ PlayfairDisplay-Regular.ttf no encontrado
)

if exist "..\public\fonts\Chewy-Regular.ttf" (
    copy "..\public\fonts\Chewy-Regular.ttf" "assets\fonts\" >nul 2>&1 && echo ✅ Chewy-Regular.ttf || echo ❌ Error copiando Chewy-Regular.ttf
) else (
    echo ❌ Chewy-Regular.ttf no encontrado
)

echo.
echo 📊 Verificando archivos copiados...
echo 🎵 Música:
if exist "assets\music\*.*" (
    dir /b "assets\music"
) else (
    echo    Directorio vacío
)

echo 🔤 Fuentes:
if exist "assets\fonts\*.*" (
    dir /b "assets\fonts"  
) else (
    echo    Directorio vacío
)

echo.
echo ✅ Script completado. Revisa los archivos antes del deploy.
pause
