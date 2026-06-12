#!/bin/bash

# Script de Setup para Producción en EC2
# Evaluación: TI3053 - Arquitectura MultiCloud
# Este script se ejecuta UNA SOLA VEZ en la EC2

set -e

echo "╔════════════════════════════════════════════╗"
echo "║  🔧 SETUP PRODUCCIÓN - EC2 AWS             ║"
echo "╚════════════════════════════════════════════╝"

# 1. Actualizar sistema
echo "📦 Actualizando sistema..."
sudo apt-get update
sudo apt-get upgrade -y

# 2. Instalar Node.js
echo "📦 Instalando Node.js..."
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# 3. Instalar Git
echo "📦 Instalando Git..."
sudo apt-get install -y git

# 4. Crear usuario para la aplicación
if ! id -u app-user > /dev/null 2>&1; then
    echo "👤 Creando usuario 'app-user'..."
    sudo useradd -m -s /bin/bash app-user
fi

# 5. Clonar repositorio (si está disponible)
echo "📂 Configurando directorio de la aplicación..."
APP_DIR="/home/ubuntu/multicloud-app"
if [ ! -d "$APP_DIR" ]; then
    mkdir -p $APP_DIR
    echo "   Carpeta creada: $APP_DIR"
    echo "   Por favor sube tu código aquí"
fi

# 6. Crear carpeta para wallet
if [ ! -d "$APP_DIR/wallet" ]; then
    mkdir -p $APP_DIR/wallet
    echo "   Carpeta wallet creada en: $APP_DIR/wallet"
    echo "   Por favor coloca los archivos del wallet aquí"
fi

# 7. Instalar PM2 para gestión de procesos
echo "📦 Instalando PM2 (gestor de procesos)..."
sudo npm install -g pm2

# 8. Instalar Oracle Client (Instant Client)
echo "📦 Instalando Oracle Instant Client..."
cd /tmp
wget https://download.oracle.com/otn_software/linux/instantclient/219000/instantclient-basic-linux.x64-21.9.0.0.0dbru.zip || true
if [ -f "instantclient-basic-linux.x64-21.9.0.0.0dbru.zip" ]; then
    unzip -o instantclient-basic-linux.x64-21.9.0.0.0dbru.zip
    sudo mkdir -p /opt/oracle
    sudo mv instantclient_21_9 /opt/oracle/
    echo "export LD_LIBRARY_PATH=/opt/oracle/instantclient_21_9:$LD_LIBRARY_PATH" >> ~/.bashrc
fi

# 9. Configurar firewall (UFW)
echo "🔒 Configurando firewall..."
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw allow 3000/tcp
sudo ufw enable -y

echo ""
echo "╔════════════════════════════════════════════╗"
echo "║  ✅ SETUP COMPLETADO                       ║"
echo "╠════════════════════════════════════════════╣"
echo "║  Próximos pasos:                           ║"
echo "║  1. Sube tu código a: $APP_DIR     ║"
echo "║  2. Coloca wallet en: $APP_DIR/wallet     ║"
echo "║  3. Crea .env con las variables            ║"
echo "║  4. Ejecuta: ./deploy.sh                   ║"
echo "║  5. Inicia con: pm2 start server.js        ║"
echo "╚════════════════════════════════════════════╝"
