#!/bin/bash

# Script para iniciar la aplicación en Producción
# Evaluación: TI3053 - Arquitectura MultiCloud
# Usa PM2 para gestión de procesos y reinicio automático

set -e

echo "╔════════════════════════════════════════════╗"
echo "║  🚀 INICIANDO APLICACIÓN EN PRODUCCIÓN    ║"
echo "╚════════════════════════════════════════════╝"

# 1. Verificar que estemos en el directorio correcto
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json no encontrado"
    exit 1
fi

# 2. Verificar que PM2 esté instalado
if ! command -v pm2 &> /dev/null; then
    echo "❌ PM2 no instalado. Ejecuta: npm install -g pm2"
    exit 1
fi

# 3. Detener instancias previas
echo "🛑 Deteniendo instancias previas..."
pm2 stop all || true
pm2 delete all || true

# 4. Instalar/Actualizar dependencias
echo "📦 Verificando dependencias..."
npm install --production

# 5. Iniciar aplicación con PM2
echo "✅ Iniciando aplicación con PM2..."
pm2 start server.js --name "multicloud-app" --instances max --exec-mode cluster

# 6. Guardar configuración de PM2
pm2 save
pm2 startup

# 7. Mostrar logs
echo ""
echo "📋 Últimos logs:"
pm2 logs multicloud-app --lines 20 --nostream

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  ✅ APLICACIÓN EN EJECUCIÓN                ║"
echo "╠════════════════════════════════════════════╣"
echo "║  Estado: $(pm2 status multicloud-app 2>&1 | grep -oP 'online|stopped')      ║"
echo "║  URL: http://34.229.84.50:3000            ║"
echo "║                                            ║"
echo "║  Comandos útiles:                          ║"
echo "║  pm2 logs multicloud-app (ver logs)        ║"
echo "║  pm2 stop multicloud-app (detener)         ║"
echo "║  pm2 restart multicloud-app (reiniciar)    ║"
echo "╚════════════════════════════════════════════╝"
