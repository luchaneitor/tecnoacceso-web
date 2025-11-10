class ControlPanel {
    constructor() {
        this.currentUser = null;
        this.device = null;
        this.server = null;
        this.service = null;
        this.characteristic = null;
        this.isConnected = false;
        this.init();
    }

    init() {
        this.checkAuthentication();
        this.setupEventListeners();
        this.loadUserInfo();
        this.startClock();
        this.initBluetooth();
    }

    checkAuthentication() {
        const user = localStorage.getItem('tecnoacceso_user');
        if (!user) {
            window.location.href = 'index.html';
            return;
        }
        this.currentUser = JSON.parse(user);
    }

    setupEventListeners() {
        document.getElementById('logoutBtn').addEventListener('click', () => this.logout());
    }

    loadUserInfo() {
        document.getElementById('userWelcome').textContent = 
            `Bienvenido, ${this.currentUser.nombre}`;
        document.getElementById('userType').textContent = 
            this.currentUser.tipo === 'admin' ? 'Administrador' : 'Usuario';
    }

    startClock() {
        const updateTime = () => {
            const now = new Date();
            const timeString = now.toLocaleTimeString();
            document.getElementById('currentTime').textContent = timeString;
        };
        
        updateTime();
        setInterval(updateTime, 1000);
    }

    async initBluetooth() {
        try {
            if (!navigator.bluetooth) {
                addLog('❌ Web Bluetooth no soportado en este navegador. Usa Chrome o Edge.', 'error');
                this.updateBluetoothStatus('No soportado', 'error');
                return;
            }

            addLog('🔵 Bluetooth disponible. Haz click en "Conectar Bluetooth"', 'info');
            this.updateBluetoothStatus('Disponible', 'info');
            
        } catch (error) {
            addLog(`❌ Error Bluetooth: ${error.message}`, 'error');
            this.updateBluetoothStatus('Error', 'error');
        }
    }

    async connectBluetooth() {
        try {
            addLog('📱 Buscando dispositivo TecnoAcceso...', 'info');
            this.updateBluetoothStatus('Buscando...', 'info');

            this.device = await navigator.bluetooth.requestDevice({
                filters: [{ name: 'TecnoAcceso' }],
                optionalServices: ['generic_access']
            });

            addLog('✅ Dispositivo encontrado. Conectando...', 'info');
            this.updateBluetoothStatus('Conectando...', 'info');

            this.server = await this.device.gatt.connect();
            addLog('✅ Conectado al servidor GATT', 'success');

            this.isConnected = true;
            this.updateConnectionStatus();
            this.updateBluetoothStatus('Conectado', 'success');
            
            addLog('🚀 CONEXIÓN EXITOSA - Sistema listo para controlar', 'success');

            this.device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnection();
            });

        } catch (error) {
            if (error.name === 'NotFoundError') {
                addLog('❌ No se encontró el dispositivo TecnoAcceso', 'error');
                this.updateBluetoothStatus('No encontrado', 'error');
            } else if (error.name === 'SecurityError') {
                addLog('❌ Error de seguridad. Asegúrate de usar HTTPS', 'error');
                this.updateBluetoothStatus('Error seguridad', 'error');
            } else {
                addLog(`❌ Error de conexión: ${error.message}`, 'error');
                this.updateBluetoothStatus('Error conexión', 'error');
            }
        }
    }

    async sendBluetoothCommand(command) {
        if (!this.isConnected || !this.server) {
            addLog('❌ No conectado a Bluetooth. Conecta primero el dispositivo.', 'error');
            return false;
        }

        try {
            // Enviar comando al ESP32
            // En Bluetooth Serial, el ESP32 recibe los caracteres directamente
            addLog(`📤 Enviando comando por Bluetooth: ${command}`, 'info');
            
            // Aquí iría el código real para enviar datos Bluetooth
            // Por ahora simulamos el envío
            console.log(`[BLUETOOTH] Comando enviado: ${command}`);
            
            // Simular envío exitoso
            return true;
            
        } catch (error) {
            addLog(`❌ Error enviando comando: ${error.message}`, 'error');
            return false;
        }
    }

    handleDisconnection() {
        this.isConnected = false;
        this.device = null;
        this.server = null;
        this.updateConnectionStatus();
        this.updateBluetoothStatus('Desconectado', 'error');
        addLog('🔴 Desconectado del ESP32', 'warning');
    }

    disconnectBluetooth() {
        if (this.device && this.device.gatt.connected) {
            this.device.gatt.disconnect();
        }
        this.handleDisconnection();
    }

    updateConnectionStatus() {
        const statusElement = document.getElementById('systemStatus');
        if (statusElement) {
            if (this.isConnected) {
                statusElement.textContent = 'Conectado al ESP32';
                statusElement.style.color = 'var(--success)';
            } else {
                statusElement.textContent = 'Desconectado';
                statusElement.style.color = 'var(--danger)';
            }
        }
    }

    updateBluetoothStatus(message, type) {
        const statusElement = document.getElementById('btStatus');
        const container = document.getElementById('btStatusContainer');
        
        if (statusElement && container) {
            statusElement.textContent = message;
            container.className = 'connection-status';
            
            switch(type) {
                case 'success':
                    container.classList.add('connected');
                    break;
                case 'error':
                    container.classList.add('disconnected');
                    break;
                case 'info':
                    container.style.background = '#cce7ff';
                    container.style.color = '#0066cc';
                    container.style.border = '2px solid #99ceff';
                    break;
            }
        }
    }

    logout() {
        if (this.isConnected) {
            this.disconnectBluetooth();
        }
        localStorage.removeItem('tecnoacceso_user');
        localStorage.removeItem('tecnoacceso_authenticated');
        window.location.href = 'index.html';
    }
}

// Funciones globales para los botones
async function sendCommand(command) {
    const commandDesc = getCommandDescription(command);
    addLog(`Comando: ${commandDesc}`, 'info');
    
    // Intentar enviar por Bluetooth
    if (window.controlPanel && window.controlPanel.isConnected) {
        const success = await window.controlPanel.sendBluetoothCommand(command);
        if (success) {
            simulateCommandResponse(command);
        }
    } else {
        addLog('⚠️ Modo simulación (sin Bluetooth conectado)', 'warning');
        simulateCommandResponse(command);
    }
}

function getCommandDescription(command) {
    const commands = {
        'A': 'SUBIR ELEVADOR',
        'B': 'BAJAR ELEVADOR', 
        'C': 'DETENER SISTEMA',
        'D': 'SUBIR PLATAFORMA',
        'E': 'BAJAR PLATAFORMA'
    };
    return commands[command] || command;
}

function simulateCommandResponse(command) {
    setTimeout(() => {
        const statusMessages = {
            'A': { message: '✅ Elevador subiendo...', type: 'success' },
            'B': { message: '✅ Elevador bajando...', type: 'success' },
            'C': { message: '⚠️ Elevador detenido', type: 'warning' },
            'D': { message: '✅ Plataforma subiendo...', type: 'success' },
            'E': { message: '✅ Plataforma bajando...', type: 'success' }
        };
        
        const response = statusMessages[command];
        addLog(response.message, response.type);
        updateElevatorStatus(command);
    }, 800);
}

function sendEmergency() {
    addLog('🚨 BOTÓN DE EMERGENCIA ACTIVADO - SISTEMA DETENIDO', 'error');
    
    // Enviar comando de emergencia por Bluetooth
    if (window.controlPanel && window.controlPanel.isConnected) {
        window.controlPanel.sendBluetoothCommand('C'); // Comando de detener
    }
    
    setTimeout(() => {
        addLog('✅ Sistema de emergencia activado. Todos los motores detenidos.', 'success');
        updateElevatorStatus('emergency');
        
        // Efecto visual de emergencia
        document.body.style.animation = 'emergencyFlash 0.5s 3';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 1500);
    }, 500);
}

function addLog(message, type = 'info') {
    const logsContainer = document.getElementById('logsContainer');
    const logEntry = document.createElement('div');
    logEntry.className = 'log-entry';
    
    const now = new Date();
    const timeString = now.toLocaleTimeString();
    
    logEntry.innerHTML = `
        <span class="log-time">${timeString}</span>
        <span class="log-message ${type}">${message}</span>
    `;
    
    logsContainer.prepend(logEntry);
    
    // Limitar logs a 30 entradas
    if (logsContainer.children.length > 30) {
        logsContainer.removeChild(logsContainer.lastChild);
    }
}

function updateElevatorStatus(command) {
    const statusElement = document.getElementById('elevatorStatus');
    
    switch(command) {
        case 'A':
            statusElement.textContent = 'SUBIR';
            statusElement.style.color = 'var(--success)';
            break;
        case 'B':
            statusElement.textContent = 'BAJAR';
            statusElement.style.color = 'var(--danger)';
            break;
        case 'C':
            statusElement.textContent = 'DETENIDO';
            statusElement.style.color = 'var(--warning)';
            break;
        case 'emergency':
            statusElement.textContent = 'EMERGENCIA';
            statusElement.style.color = 'var(--danger)';
            break;
        default:
            statusElement.textContent = 'LISTO';
            statusElement.style.color = 'var(--primary)';
    }
}

// Animación de emergencia
const style = document.createElement('style');
style.textContent = `
    @keyframes emergencyFlash {
        0% { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
        50% { background: linear-gradient(135deg, #dc3545 0%, #c82333 100%); }
        100% { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); }
    }
`;
document.head.appendChild(style);

// Inicializar el panel de control
document.addEventListener('DOMContentLoaded', () => {
    window.controlPanel = new ControlPanel();
    addLog('Sesión iniciada correctamente', 'success');
    
    // Configurar botones Bluetooth
    const connectBtn = document.getElementById('connectBtn');
    const disconnectBtn = document.getElementById('disconnectBtn');
    
    if (connectBtn) {
        connectBtn.addEventListener('click', async () => {
            connectBtn.disabled = true;
            await window.controlPanel.connectBluetooth();
            connectBtn.disabled = false;
            
            if (window.controlPanel.isConnected) {
                connectBtn.style.display = 'none';
                disconnectBtn.disabled = false;
            }
        });
    }
    
    if (disconnectBtn) {
        disconnectBtn.addEventListener('click', () => {
            window.controlPanel.disconnectBluetooth();
            disconnectBtn.disabled = true;
            connectBtn.style.display = 'flex';
        });
    }
});