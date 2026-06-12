const oracledb = require('oracledb');
require('dotenv').config();

// ACTIVAR MODO THIN (LIGERO): Elimina la necesidad de instalar librerías Instant Client o libaio en AWS
// Al no llamar a initOracleClient, node-oracledb opera nativamente por red.
let oracleConnected = true; 
console.log("✓ Conexión configurada en Modo Thin Corporativo (Nativo de Red).");

// Función para ejecutar consultas en la base de datos
async function queryDatabase(sql, binds = []) {
    if (!oracleConnected) {
        throw new Error("Oracle no disponible");
    }
    
    let connection;
    try {
        connection = await oracledb.getConnection({
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            connectString: process.env.DB_CONNECTION_STRING
        });

        const result = await connection.execute(sql, binds, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        return result;
    } catch (err) {
        console.error("Error en la consulta SQL:", err);
        throw err;
    } finally {
        if (connection) {
            try {
                await connection.close();
            } catch (err) {
                console.error("Error al cerrar la conexión:", err);
            }
        }
    }
}

module.exports = { queryDatabase };