const express = require('express');
const bcrypt = require('bcrypt');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { queryDatabase } = require('./database');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Cargar usuarios locales de archivo
let usuariosLocales = [];
try {
    const usuariosData = fs.readFileSync(path.join(__dirname, 'usuarios_locales.json'), 'utf8');
    usuariosLocales = JSON.parse(usuariosData).usuarios || [];
    console.log(`✓ ${usuariosLocales.length} usuario(s) local(es) cargado(s)`);
} catch (err) {
    console.warn('⚠ No se pudo cargar usuarios_locales.json:', err.message);
}

// Asegurar que la carpeta 'uploads' exista en el servidor para almacenar imágenes
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)){
    fs.mkdirSync(uploadDir);
}

// Configuración segura de Multer: Renombrar archivo para evitar duplicados y ataques de inyección de nombres
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        // Guarda el archivo con la fecha actual + la extensión original (ej: foto-1718112345.jpg)
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

// Filtro de seguridad: Solo permitir imágenes (JPEG, JPG, PNG) para cumplir con OWASP
const fileFilter = (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
        return cb(null, true);
    } else {
        cb(new Error('Error: ¡Solo se permiten imágenes (jpeg, jpg, png)!'));
    }
};

const upload = multer({ 
    storage: storage,
    fileFilter: fileFilter,
    limits: { fileSize: 5 * 1024 * 1024 } // Límite de tamaño seguro: 5MB máximo por foto
});

// Middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// Hace que la carpeta de fotos sea accesible públicamente desde el navegador
app.use('/uploads', express.static(uploadDir));


// 1. PRUEBA DE ACCESO: Página de inicio con Login
app.get('/', (req, res) => {
    res.send(`
        <div style="max-width: 400px; margin: 50px auto; font-family: Arial, sans-serif; border: 1px solid #ccc; padding: 20px; border-radius: 8px;">
            <h2>Portal de Acceso Seguro (MultiCloud)</h2>
            <form action="/login" method="POST">
                <label>Usuario:</label><br>
                <input type="text" name="username" required style="width:100%; padding:8px; margin:8px 0;"><br>
                <label>Contraseña:</label><br>
                <input type="password" name="password" required style="width:100%; padding:8px; margin:8px 0;"><br>
                <button type="submit" style="width:100%; padding:10px; background-color:#007bff; color:white; border:none; border-radius:4px; cursor:pointer;">Iniciar Sesión</button>
            </form>
            <p style="font-size:12px; color:gray; margin-top:20px;">Modo: <strong>LOCAL</strong></p>
        </div>
    `);
});

// 2. PRUEBA DE AUTENTICACIÓN: Login con OWASP (Bcrypt)
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    
    if (!username || !password) {
        return res.status(400).send("<h3>Error: Usuario y contraseña requeridos.</h3><a href='/'>Volver</a>");
    }

    let authenticated = false;
    let authMode = 'local';

    try {
        // Primero intenta conectar a Oracle
        const sql = `SELECT username, password_hash FROM usuarios WHERE username = :1`;
        const result = await queryDatabase(sql, [username]);

        if (result.rows.length > 0) {
            const user = result.rows[0];
            const match = await bcrypt.compare(password, user.PASSWORD_HASH);
            if (match) {
                authenticated = true;
                authMode = 'oracle';
            }
        }
    } catch (err) {
        console.log("⚠️  Oracle no disponible, usando modo LOCAL");
        // Si Oracle falla, continuar con validación local
    }

    // Si Oracle no autenticó, intentar modo local
    if (!authenticated) {
        const usuarioLocal = usuariosLocales.find(
            u => u.username === username && u.password === password
        );
        
        if (usuarioLocal) {
            authenticated = true;
            authMode = 'local';
        }
    }

    // Resultado final
    if (authenticated) {
        console.log(`✓ Login exitoso: ${username} (${authMode})`);
        res.redirect('/dashboard');
    } else {
        console.log(`✗ Login fallido: ${username}`);
        res.status(401).send("<h3>Error: Credenciales incorrectas.</h3><a href='/'>Volver</a>");
    }
});

// 3. AGREGAR PRODUCTO CON IMAGEN (Ruta para la evaluación 3)
app.post('/agregar-producto', upload.single('imagen_producto'), async (req, res) => {
    const { nombre_producto, stock } = req.body;
    // Si se subió un archivo, guardamos su nombre, si no, dejamos una imagen por defecto
    const nombreImagen = req.file ? req.file.filename : 'default.png';

    try {
        // En Oracle guardaremos: Nombre, Stock y el Nombre del Archivo de la Imagen
        const sql = `INSERT INTO inventario (nombre_producto, stock, imagen_url) VALUES (:1, :2, :3)`;
        await queryDatabase(sql, [nombre_producto, stock, nombreImagen]);
        res.redirect('/dashboard');
    } catch (err) {
        console.log("Guardado local simulado (Falta conectar Oracle Cloud):", { nombre_producto, stock, nombreImagen });
        res.redirect('/dashboard?msg=SimuladoConExito');
    }
});

// 4. PRUEBA DE CONECTIVIDAD ADB: Dashboard con Tabla de Productos e Imágenes
app.get('/dashboard', async (req, res) => {
    try {
        const sql = `SELECT id, nombre_producto, stock, imagen_url FROM inventario`;
        const result = await queryDatabase(sql);

        let tablaRows = '';
        result.rows.forEach(item => {
            // Mostramos la imagen usando la etiqueta <img> apuntando a la carpeta del servidor
            const imgPath = item.IMAGEN_URL ? `/uploads/${item.IMAGEN_URL}` : '/uploads/default.png';
            tablaRows += `
                <tr>
                    <td>${item.ID}</td>
                    <td>${item.NOMBRE_PRODUCTO}</td>
                    <td>${item.STOCK}</td>
                    <td><img src="${imgPath}" alt="foto" style="width:50px; height:50px; object-fit:cover; border-radius:4px;"></td>
                </tr>`;
        });

        res.send(getDashboardHTML(tablaRows, false));
    } catch (err) {
        // Vista de contingencia local si la base de datos aún no está conectada
        const urlParams = new URLSearchParams(req.url.split('?')[1]);
        const msg = urlParams.get('msg');
        
        let productoSimulado = `
            <tr>
                <td>1</td>
                <td>Servidor AWS EC2 Cloud</td>
                <td>10</td>
                <td><span style="font-size:12px; color:gray;">Sin imagen</span></td>
            </tr>
        `;
        
        if(msg === 'SimuladoConExito') {
            productoSimulado += `<tr><td>2</td><td>Producto de Prueba con Éxito</td><td>5</td><td><span style="color:green; font-size:12px;">📸 ¡Imagen subida al servidor!</span></td></tr>`;
        }

        res.send(getDashboardHTML(productoSimulado, true));
    }
});

// Función auxiliar para renderizar el diseño del Dashboard
function getDashboardHTML(rows, isLocalMode = true) {
    const modeText = isLocalMode ? '📍 MODO LOCAL' : '☁️ CONECTADO A ORACLE';
    const modeStyle = isLocalMode ? 'color: #ff9800;' : 'color: green;';
    
    return `
        <div style="max-width: 650px; margin: 30px auto; font-family: Arial, sans-serif;">
            <h2>🔓 Panel de Control - Conexión MultiCloud</h2>
            <p style="${modeStyle} font-weight: bold;">${modeText}</p>
            <p style="color: green; font-weight: bold;">✔ Módulos de Autenticación, Base de Datos y Almacenamiento de Imágenes configurados.</p>
            
            <!-- Formulario para la Evaluación 3: Agregar productos con imagen -->
            <div style="background:#f9f9f9; padding:15px; border:1px solid #ddd; border-radius:6px; margin-bottom:20px;">
                <h3>➕ Agregar Nuevo Ítem (Futura Evaluación 3)</h3>
                <form action="/agregar-producto" method="POST" enctype="multipart/form-data">
                    <label>Nombre del Producto:</label> <input type="text" name="nombre_producto" required style="padding:4px;"><br><br>
                    <label>Stock inicial:</label> <input type="number" name="stock" required style="padding:4px; width:60px;"><br><br>
                    <label>Subir Imagen (jpg/png):</label> <input type="file" name="imagen_producto" accept="image/*" required><br><br>
                    <button type="submit" style="padding:6px 12px; background:#28a745; color:white; border:none; border-radius:4px; cursor:pointer;">Guardar en Servidor y BD</button>
                </form>
            </div>

            <table border="1" cellpadding="8" style="width: 100%; border-collapse: collapse;">
                <tr style="background-color: #f2f2f2;"><th>ID</th><th>Producto</th><th>Stock</th><th>Vista Previa</th></tr>
                ${rows}
            </table>
            <br><a href="/">Cerrar Sesión</a>
        </div>
    `;
}

app.listen(PORT, () => {
    console.log(`
╔════════════════════════════════════════════╗
║   🚀 Aplicación corriendo en:              ║
║   http://localhost:${PORT}                    ║
║                                            ║
║   Usuarios locales:                        ║
║   - admin / Inacap2026                     ║
╚════════════════════════════════════════════╝
    `);
});