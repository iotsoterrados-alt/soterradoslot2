/**
 * =========================================================================
 * SIMULADOR DE HARDWARE IOT | VERSIÓN 12 DE ABRIL
 * =========================================================================
 * Este script de Node.js funciona como los "Microcontroladores ESP32 o 
 * Arduino" falsos. Es vital para las pruebas sin conexión o para comprobar 
 * que el sistema escala adecuadamente en producción.
 */

const http = require('http');
const https = require('https');

const BASE_URL = process.env.API_BASE || 'http://127.0.0.1:8787';
const requestLib = BASE_URL.startsWith('https') ? https : http;

const API_URL = `${BASE_URL}/api/readings`;
const CONTAINERS_URL = `${BASE_URL}/api/containers`;

// 🛡️ CAPA DE SEGURIDAD 2 (CONTRASEÑA HARDWARE)
// Para demostrar la defensa del Backend, este Simulador envía la clave en sus cabeceras HTTP.
const IOT_SECRET = "Soterrados_IoT_Secret_Key_2026";

let activeBins = []; // Arreglo en memoria para llevar el control de los sensores

// ---------------------------------------------------------
// FUNCIÓN PRINCIPAL DE EMISIÓN DE DATOS (Finge ser 1 Arduino)
// ---------------------------------------------------------
function sendData(bin) {
    let isEmptying = false;
    
    // INICIALIZACIÓN: Si el contenedor acaba de prenderse, le da valores de basura al azar.
    if (bin.sec1 === undefined) {
        bin.sec1 = Math.random() * 30;
        bin.sec2 = Math.random() * 30;
        bin.sec3 = Math.random() * 30;
    }

    let avgFill = (bin.sec1 + bin.sec2 + bin.sec3) / 3;

    // ---------------------------------------------------------
    // ALGORITMO SIMULADOR (Matemática probabilística)
    // ---------------------------------------------------------
    // Si el contenedor está colapsando de basura (>90%), hay un 70% de chance 
    // de que un "Camión Virtual" pase y lo vacíe de un golpe.
    if (avgFill > 90 && Math.random() > 0.7) {
        bin.sec1 = Math.floor(Math.random() * 10); 
        bin.sec2 = Math.floor(Math.random() * 10);
        bin.sec3 = Math.floor(Math.random() * 10);
        isEmptying = true; 
    } else {
        // En un día normal, los ciudadanos botan diferentes tamaños de bolsas de basura
        // en diferentes aberturas (secciones 1, 2 o 3).
        bin.sec1 += Math.random() * 8; 
        bin.sec2 += Math.random() * 8; 
        bin.sec3 += Math.random() * 8; 
        
        // Un contenedor físico no puede llenarse más allá del 100%. Imponemos este límite.
        if (bin.sec1 > 100) bin.sec1 = 100; 
        if (bin.sec2 > 100) bin.sec2 = 100; 
        if (bin.sec3 > 100) bin.sec3 = 100;
    }

    // Se empaqueta la información (Igual a como un Arduino usaría la librería ArduinoJSON)
    const payload = JSON.stringify({
        containerId: bin.id,
        sec1: bin.sec1,
        sec2: bin.sec2,
        sec3: bin.sec3
    });

    // ---------------------------------------------------------
    // COMUNICACIÓN HTTP HACIA LA NUBE
    // ---------------------------------------------------------
    const options = {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': Buffer.byteLength(payload),
            // Autorización del hardware (Si se comenta esta línea, el servidor devolverá ERROR 401)
            'X-IoT-Secret': IOT_SECRET
        }
    };

    const req = requestLib.request(API_URL, options, (res) => {
        // Log en consola para evaluar el comportamiento del servidor Cloudflare
        if(res.statusCode === 401) {
            console.error(`⛔ Bloqueado: El hardware no tiene la clave correcta.`);
            return;
        }
        if(isEmptying) console.log(`♻️  [VACIADO] ${bin.name} vaciado exitosamente en la nube!`);
        else console.log(`📡 [NUBE] ${bin.name} | S1:${Math.round(bin.sec1)}% S2:${Math.round(bin.sec2)}% S3:${Math.round(bin.sec3)}%`);
    });

    req.on('error', (e) => console.error(`❌ Error de conexión: ${e.message}`));
    req.write(payload);
    req.end();
}

console.log("🚀 Iniciando simulador IoT seguro...");

// GET /api/containers: Antes de mandar basura falsa, le pedimos a Cloudflare 
// una lista de qué contenedores oficiales existen actualmente en la Base de Datos (D1)
requestLib.get(CONTAINERS_URL, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const containers = JSON.parse(data);
            if (containers.length > 0) {
                let allBins = containers.map(c => ({ id: c.id, name: c.name }));
                
                // Toma toda la lista y extrae solo 3 contenedores aleatorios (Desconecta los demás).
                allBins = allBins.sort(() => 0.5 - Math.random());
                activeBins = allBins.slice(0, 3);
                console.log(`✅ ${containers.length} contenedores en BD. Simulando 3 activos para pruebas de Offline...`);
            } else {
                console.log("⚠️ La base de datos D1 está vacía.");
                activeBins = []; 
            }
            
            // INICIO DEL BUCLE MAESTRO: Ejecuta la función asíncrona sendData() cada 1,500 ms para mostrar cambios más rápido.
            setInterval(() => {
                if (activeBins.length === 0) return; 
                const randomActiveBin = activeBins[Math.floor(Math.random() * activeBins.length)];
                sendData(randomActiveBin);
            }, 1500);
            
        } catch (e) { console.error("Error leyendo contenedores:", e.message); }
    });
}).on('error', (e) => { console.error("❌ No se pudo conectar a Cloudflare. Revisa la URL."); });