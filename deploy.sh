#!/bin/bash

# Script de Despliegue Automatizado - MultiCloud App
# Evaluación: TI3053 - Arquitectura MultiCloud
# Autor: Estudiante INACAP
# Fecha: 2026-06-11

set -e  # Exit on error

echo "╔════════════════════════════════════════════╗"
echo "║  🚀 DESPLIEGUE AUTOMATIZADO - MULTICLOUD   ║"
echo "╚════════════════════════════════════════════╝"

# 1. Verificar que estemos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json no encontrado. Ejecutar desde la carpeta de la app."
    exit 1
fi

echo "✓ Directorio verificado"

# 2. Verificar Node.js y npm
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no instalado. Por favor instala Node.js."
    exit 1
fi

NODE_VERSION=$(node -v)
NPM_VERSION=$(npm -v)
echo "✓ Node.js $NODE_VERSION detectado"
echo "✓ npm $NPM_VERSION detectado"

# 3. Limpiar instalaciones previas
if [ -d "node_modules" ]; then
    echo "🧹 Limpiando node_modules previos..."
    rm -rf node_modules
    rm -f package-lock.json
fi

# 4. Instalar dependencias
echo "📦 Instalando dependencias..."
npm install

# 5. Verificar variables de entorno
if [ ! -f ".env" ]; then
    echo "❌ Error: archivo .env no encontrado"
    echo "   Por favor crear .env con las variables de Oracle Cloud"
    exit 1
fi

echo "✓ Archivo .env verificado"

# 6. Verificar que exista la carpeta uploads
if [ ! -d "uploads" ]; then
    echo "📁 Creando carpeta uploads..."
    mkdir -p uploads
fi

# 7. Verificar usuarios locales
if [ ! -f "usuarios_locales.json" ]; then
    echo "⚠️  Creando usuarios_locales.json por defecto..."
    cat > usuarios_locales.json << 'EOF'
{
  "usuarios": [
    {
      "username": "admin",
      "password": "Inacap2026"
    }
  ]
}
EOF
fi

echo "✓ Configuración local verificada"

# 8. Verificar wallet de Oracle (si se requiere conexión a Oracle)
WALLET_PATH=$(grep "DB_WALLET_PATH" .env | cut -d '=' -f 2)
if [ ! -z "$WALLET_PATH" ] && [ -d "$WALLET_PATH" ]; then
    echo "✓ Wallet de Oracle encontrado: $WALLET_PATH"
else
    echo "⚠️  Wallet de Oracle no encontrado en $WALLET_PATH"
    echo "   La app funcionará en modo LOCAL"
fi

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  ✅ DESPLIEGUE COMPLETADO                  ║"
echo "╠════════════════════════════════════════════╣"
echo "║  Para iniciar la aplicación, ejecuta:      ║"
echo "║  npm start                                 ║"
echo "║                                            ║"
echo "║  La aplicación estará disponible en:       ║"
echo "║  http://localhost:3000                     ║"
echo "╚════════════════════════════════════════════╝"
