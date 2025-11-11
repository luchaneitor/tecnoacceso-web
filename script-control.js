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
        this.agregarEjemplosSiVacio();
        
        // ✅ INICIAR ACTUALIZACIÓN AUTOMÁTICA
        this.iniciarEscuchaAutomatica();
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
        
        // ✅ OCULTAR TODO EL PANEL DERECHO PARA USUARIOS NORMALES
        const panelDerecho = document.getElementById('panelDerecho');
        const registrosPanel = document.getElementById('registrosPanel');
        
        if (this.currentUser.tipo !== 'admin') {
            // Usuario normal - ocultar todo el panel derecho
            if (panelDerecho) {
                panelDerecho.style.display = 'none';
            }
            
            // También ocultar el panel de registros específicamente
            if (registrosPanel) {
                registrosPanel.style.display = 'none';
            }
            
            // Ajustar el layout para que ocupe todo el ancho
            document.querySelector('.control-main').style.gridTemplateColumns = '1fr';
            document.querySelector('.control-main').style.gap = '0';
            
            return; // Salir de la función
        }
        
        // ✅ SOLO ADMIN LLEGA AQUÍ - Mostrar todo el panel derecho
        if (panelDerecho) {
            panelDerecho.style.display = 'block';
        }
        
        if (registrosPanel) {
            registrosPanel.style.display = 'block';
        }
        
        // Restaurar layout normal
        document.querySelector('.control-main').style.gridTemplateColumns = '2fr 1fr';
        document.querySelector('.control-main').style.gap = '30px';
        
        // Cargar datos para admin
        this.cargarActividades();
        
        if (window.alertasSystem) {
            window.alertasSystem.fetchAlertas();
        }
        
        // ✅ CARGAR REGISTROS SOLO PARA ADMIN
        this.cargarRegistros();
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
            // ✅ Registrar inicio de conexión
            await this.registrarLogSistema(
                'Conexión Bluetooth iniciada', 
                'bluetooth', 
                { dispositivo: 'TecnoAcceso ESP32' }
            );
            
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

            // ✅ Registrar conexión exitosa
            await this.registrarLogSistema(
                'Conexión Bluetooth exitosa', 
                'bluetooth', 
                { 
                    dispositivo: this.device.name,
                    id: this.device.id,
                    estado: 'conectado'
                }, 
                'exito'
            );

            this.device.addEventListener('gattserverdisconnected', () => {
                this.handleDisconnection();
            });

        } catch (error) {
            let errorMessage = '';
            let errorDetails = {};
            
            if (error.name === 'NotFoundError') {
                errorMessage = '❌ No se encontró el dispositivo TecnoAcceso';
                this.updateBluetoothStatus('No encontrado', 'error');
                errorDetails = { tipo: 'dispositivo_no_encontrado' };
            } else if (error.name === 'SecurityError') {
                errorMessage = '❌ Error de seguridad. Asegúrate de usar HTTPS';
                this.updateBluetoothStatus('Error seguridad', 'error');
                errorDetails = { tipo: 'error_seguridad' };
            } else if (error.name === 'NetworkError') {
                errorMessage = '❌ Error de red. Verifica la conexión Bluetooth';
                this.updateBluetoothStatus('Error red', 'error');
                errorDetails = { tipo: 'error_red' };
            } else {
                errorMessage = `❌ Error de conexión: ${error.message}`;
                this.updateBluetoothStatus('Error conexión', 'error');
                errorDetails = { 
                    tipo: 'error_general', 
                    mensaje: error.message,
                    nombre: error.name
                };
            }
            
            addLog(errorMessage, 'error');
            
            // ✅ Registrar error en logs del sistema
            await this.registrarLogSistema(
                'Error en conexión Bluetooth', 
                'bluetooth', 
                errorDetails, 
                'fallo'
            );
        }
    }

    async sendBluetoothCommand(command) {
        if (!this.isConnected || !this.server) {
            addLog('❌ No conectado a Bluetooth. Conecta primero el dispositivo.', 'error');
            return false;
        }

        try {
            // Enviar comando al ESP32
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
        
        // ✅ Registrar desconexión en logs
        this.registrarLogSistema(
            'Desconexión Bluetooth', 
            'bluetooth', 
            { motivo: 'desconexion_remota' }, 
            'advertencia'
        );
    }

    disconnectBluetooth() {
        if (this.device && this.device.gatt.connected) {
            this.device.gatt.disconnect();
        }
        this.handleDisconnection();
        
        // ✅ Registrar desconexión manual
        this.registrarLogSistema(
            'Desconexión Bluetooth manual', 
            'bluetooth', 
            { tipo: 'desconexion_manual' }, 
            'exito'
        );
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

    // ✅ NUEVO: REGISTRAR EN LOGS DEL SISTEMA
    async registrarLogSistema(accion, tipo = 'sistema', detalles = null, estado = 'exito') {
        try {
            const userData = JSON.parse(localStorage.getItem('tecnoacceso_user'));
            
            console.log('📋 REGISTRO SISTEMA:', { accion, tipo, estado, detalles });
            
            // Guardar en base de datos
            const response = await fetch('registros.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    accion: accion,
                    tipo: tipo,
                    detalles: detalles ? JSON.stringify(detalles) : null,
                    usuario_id: userData?.id || null,
                    estado: estado
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                console.error('Error guardando registro:', result.error);
            }
            
        } catch (error) {
            console.error('Error registrando log:', error);
        }
    }

    // ✅ REGISTRAR ACTIVIDADES EN BD Y LOCALSTORAGE
    async registrarActividad(accion, comando = '') {
        try {
            const userData = JSON.parse(localStorage.getItem('tecnoacceso_user'));
            
            console.log('📝 ACTIVIDAD REGISTRADA:', {
                usuario: userData.nombre,
                dependencia: userData.dependencia,
                accion: accion,
                comando: comando
            });
            
            // ✅ 1. GUARDAR EN LOCALSTORAGE (como respaldo)
            this.guardarActividadLocal({
                usuario: userData.nombre,
                dependencia: userData.dependencia,
                accion: accion,
                comando: comando,
                fecha: new Date().toLocaleString()
            });

            // ✅ 2. GUARDAR EN BASE DE DATOS MYSQL
            const response = await fetch('actividades.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    usuario_id: userData.id,
                    dependencia: userData.dependencia,
                    accion: accion,
                    comando: comando
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                console.error('Error guardando actividad en BD:', result.error);
            }
            
            // ✅ SOLO notificar si hay un admin conectado
            if (userData.tipo === 'admin') {
                this.actualizarActividadesParaTodos();
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('Error registrando actividad:', error);
            return { success: false };
        }
    }

    guardarActividadLocal(actividad) {
        // Guardar en localStorage como respaldo
        let actividades = JSON.parse(localStorage.getItem('tecnoacceso_actividades') || '[]');
        actividades.unshift(actividad); // Agregar al inicio
        
        // Mantener solo las últimas 50 actividades
        if (actividades.length > 50) {
            actividades = actividades.slice(0, 50);
        }
        
        localStorage.setItem('tecnoacceso_actividades', JSON.stringify(actividades));
        
        // Actualizar la vista si es admin
        if (this.currentUser && this.currentUser.tipo === 'admin') {
            this.mostrarActividades(actividades);
        }
    }

    actualizarActividadesParaTodos() {
        // Si este usuario es admin, actualizar inmediatamente
        const userData = JSON.parse(localStorage.getItem('tecnoacceso_user'));
        if (userData && userData.tipo === 'admin') {
            this.cargarActividades();
        }
        
        // Notificar a otras pestañas
        localStorage.setItem('tecnoacceso_actividades_actualizadas', new Date().getTime().toString());
    }

    getUserId(username) {
        const userIds = {
            'admin': 11,
            'juan': 12,
            'maria': 13,
            'luis': 14,
            'daniela': 15
        };
        return userIds[username] || null;
    }

    // ✅ CARGAR Y MOSTRAR ACTIVIDADES
    async cargarActividades() {
        try {
            console.log('Cargando actividades...');
            
            // Cargar desde localStorage
            const actividadesLocales = JSON.parse(localStorage.getItem('tecnoacceso_actividades') || '[]');
            
            if (actividadesLocales.length > 0) {
                console.log('Actividades cargadas desde localStorage:', actividadesLocales.length);
                this.mostrarActividades(actividadesLocales);
                return;
            }
            
            // Si no hay datos locales, mostrar mensaje
            this.mostrarActividades([]);
            
        } catch (error) {
            console.error('Error cargando actividades:', error);
            document.getElementById('actividadesContainer').innerHTML = 
                '<div class="no-alertas">Error cargando actividades</div>';
        }
    }

    mostrarActividades(actividades) {
        const container = document.getElementById('actividadesContainer');
        const countElement = document.getElementById('actividadesCount');
        
        if (!container) return;

        // Actualizar contador
        countElement.textContent = `${actividades.length} actividades`;
        
        // ✅ ACTUALIZAR TIMESTAMP
        this.actualizarTimestamp();
        
        if (actividades.length === 0) {
            container.innerHTML = '<div class="no-alertas">No hay actividades registradas</div>';
            return;
        }

        container.innerHTML = actividades.map(act => `
            <div class="alerta-item info">
                <div class="alerta-content">
                    <div class="alerta-mensaje">${act.accion || 'Actividad sin descripción'}</div>
                    <div class="alerta-meta">
                        <span class="alerta-usuario">${act.usuario || 'Sistema'}</span>
                        <span class="alerta-tiempo">${act.fecha}</span>
                        <span class="alerta-dependencia">${act.dependencia || 'N/A'}</span>
                    </div>
                </div>
            </div>
        `).join('');
    }

    // ✅ CARGAR REGISTROS DEL SISTEMA
    async cargarRegistros() {
        try {
            const response = await fetch('registros.php');
            const registros = await response.json();
            
            this.mostrarRegistros(registros);
            
        } catch (error) {
            console.error('Error cargando registros:', error);
            const container = document.getElementById('registrosContainer');
            if (container) {
                container.innerHTML = '<div class="no-alertas">Error cargando registros</div>';
            }
        }
    }

    mostrarRegistros(registros) {
        const container = document.getElementById('registrosContainer');
        const countElement = document.getElementById('registrosCount');
        
        if (!container) return;

        countElement.textContent = `${registros.length} registros`;
        
        if (registros.length === 0) {
            container.innerHTML = '<div class="no-alertas">No hay registros del sistema</div>';
            return;
        }

        container.innerHTML = registros.map(reg => `
            <div class="alerta-item ${reg.tipo}">
                <div class="alerta-content">
                    <div class="alerta-mensaje">
                        <strong>${reg.tipo.toUpperCase()}:</strong> ${reg.accion}
                        ${reg.estado !== 'exito' ? ` <span style="color: ${reg.estado === 'fallo' ? 'red' : 'orange'}">[${reg.estado.toUpperCase()}]</span>` : ''}
                    </div>
                    <div class="alerta-meta">
                        ${reg.usuario_nombre ? `<span class="alerta-usuario">${reg.usuario_nombre}</span>` : ''}
                        <span class="alerta-tiempo">${new Date(reg.fecha).toLocaleString()}</span>
                    </div>
                    ${reg.detalles ? `<div class="alerta-detalles" style="font-size: 0.8rem; color: #666; margin-top: 5px;">${reg.detalles}</div>` : ''}
                </div>
            </div>
        `).join('');
    }

    actualizarTimestamp() {
        const ahora = new Date();
        const timestamp = `Última actualización: ${ahora.toLocaleTimeString()}`;
        const elemento = document.getElementById('ultimaActualizacion');
        if (elemento) {
            elemento.textContent = timestamp;
        }
    }

    // ✅ ACTUALIZACIÓN AUTOMÁTICA
    iniciarEscuchaAutomatica() {
        // Escuchar cambios en localStorage (para múltiples pestañas)
        window.addEventListener('storage', (event) => {
            if (event.key === 'tecnoacceso_ultima_actualizacion' && this.currentUser.tipo === 'admin') {
                console.log('🔄 Actualizando alertas por cambio externo');
                if (window.alertasSystem) {
                    window.alertasSystem.fetchAlertas();
                }
            }
            
            if (event.key === 'tecnoacceso_actividades_actualizadas' && this.currentUser.tipo === 'admin') {
                console.log('🔄 Actualizando actividades por cambio externo');
                this.cargarActividades();
            }
        });

        // Actualizar automáticamente cada 3 segundos (solo para admin)
        if (this.currentUser.tipo === 'admin') {
            setInterval(() => {
                this.cargarActividades();
                this.cargarRegistros();
                if (window.alertasSystem) {
                    window.alertasSystem.fetchAlertas();
                }
            }, 3000); // 3000 ms = 3 segundos
        }
    }

    // ✅ DATOS DE EJEMPLO
    agregarEjemplosSiVacio() {
        const actividades = JSON.parse(localStorage.getItem('tecnoacceso_actividades') || '[]');
        const alertas = JSON.parse(localStorage.getItem('tecnoacceso_alertas') || '[]');
        
        if (actividades.length === 0) {
            const ejemplos = [
                {
                    usuario: "Juan Pérez",
                    dependencia: "itsa",
                    accion: "Elevador subió al piso 2",
                    comando: "A",
                    fecha: new Date().toLocaleString()
                },
                {
                    usuario: "María López", 
                    dependencia: "otra",
                    accion: "Plataforma bajó completamente",
                    comando: "E",
                    fecha: new Date().toLocaleString()
                }
            ];
            localStorage.setItem('tecnoacceso_actividades', JSON.stringify(ejemplos));
        }
        
        if (alertas.length === 0 && this.currentUser.tipo === 'admin') {
            const ejemplosAlertas = [
                {
                    mensaje: "Sistema iniciado correctamente",
                    tipo: "info",
                    prioridad: "baja",
                    usuario_nombre: "Sistema",
                    fecha: new Date().toLocaleString()
                }
            ];
            localStorage.setItem('tecnoacceso_alertas', JSON.stringify(ejemplosAlertas));
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

// ✅ SISTEMA DE ALERTAS MEJORADO
class AlertasSystem {
    constructor() {
        this.alertas = [];
        this.intervalId = null;
        this.currentUser = null;
    }

    init() {
        this.loadCurrentUser();
        this.startPolling();
    }

    loadCurrentUser() {
        const userData = localStorage.getItem('tecnoacceso_user');
        if (userData) {
            this.currentUser = JSON.parse(userData);
        }
    }

    startPolling() {
        // Verificar alertas cada 3 segundos
        this.intervalId = setInterval(() => {
            this.fetchAlertas();
        }, 3000);
        
        // Primera carga inmediata
        this.fetchAlertas();
    }

    stopPolling() {
        if (this.intervalId) {
            clearInterval(this.intervalId);
        }
    }

    async fetchAlertas() {
        try {
            console.log('Buscando alertas...');
            
            // Cargar desde localStorage
            const alertasLocales = JSON.parse(localStorage.getItem('tecnoacceso_alertas') || '[]');
            
            console.log('Alertas cargadas desde localStorage:', alertasLocales.length);
            this.processNewAlertas(alertasLocales);
            this.updateAlertasUI(alertasLocales);
            
        } catch (error) {
            console.error('Error fetching alertas:', error);
        }
    }

    processNewAlertas(newAlertas) {
        // Verificar si hay alertas nuevas
        const nuevas = newAlertas.filter(newAlerta => 
            !this.alertas.some(oldAlerta => oldAlerta.fecha === newAlerta.fecha)
        );

        // Mostrar notificación para alertas nuevas
        nuevas.forEach(alerta => {
            if (alerta.tipo === 'emergencia') {
                this.showEmergencyNotification(alerta);
            }
        });

        this.alertas = newAlertas;
    }

    showEmergencyNotification(alerta) {
        // Mostrar notificación del sistema
        if (Notification.permission === 'granted') {
            new Notification('🚨 EMERGENCIA - TECNOACCESO', {
                body: alerta.mensaje,
                icon: '/logo.png',
                requireInteraction: true
            });
        }
        
        // Efecto visual de emergencia
        document.body.style.animation = 'emergencyFlash 0.5s 3';
        setTimeout(() => {
            document.body.style.animation = '';
        }, 1500);
    }

    updateAlertasUI(alertas) {
        const container = document.getElementById('alertasContainer');
        const countElement = document.getElementById('alertasCount');
        
        if (!container) return;

        // Actualizar contador
        const emergencias = alertas.filter(a => a.tipo === 'emergencia').length;
        const total = alertas.length;
        
        countElement.textContent = `${total} alerta${total !== 1 ? 's' : ''} (${emergencias} emergencia${emergencias !== 1 ? 's' : ''})`;

        // Actualizar lista
        if (alertas.length === 0) {
            container.innerHTML = '<div class="no-alertas">No hay alertas nuevas</div>';
            return;
        }

        container.innerHTML = alertas.map(alerta => `
            <div class="alerta-item ${alerta.tipo}">
                <div class="alerta-content">
                    <div class="alerta-mensaje">${alerta.mensaje}</div>
                    <div class="alerta-meta">
                        ${alerta.usuario_nombre ? 
                          `<span class="alerta-usuario">${alerta.usuario_nombre}</span>` : ''}
                        <span class="alerta-tiempo">${this.formatTime(alerta.fecha)}</span>
                    </div>
                </div>
                <div class="alerta-actions">
                    <button class="btn-alerta btn-marcar-leida" onclick="marcarAlertaLeida('${alerta.fecha}')">
                        <i class="fas fa-check"></i> OK
                    </button>
                </div>
            </div>
        `).join('');
    }

    formatTime(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return dateString; // Si no es una fecha válida, devolver el string original
            }
            const now = new Date();
            const diffMs = now - date;
            const diffMins = Math.floor(diffMs / 60000);
            
            if (diffMins < 1) return 'Ahora mismo';
            if (diffMins < 60) return `Hace ${diffMins} min`;
            
            const diffHours = Math.floor(diffMins / 60);
            if (diffHours < 24) return `Hace ${diffHours} h`;
            
            return date.toLocaleDateString();
        } catch (error) {
            return dateString;
        }
    }

    async crearAlerta(mensaje, tipo = 'info', prioridad = 'media') {
        try {
            const userData = JSON.parse(localStorage.getItem('tecnoacceso_user'));
            
            console.log('🚨 ALERTA CREADA:', {
                mensaje: mensaje,
                tipo: tipo,
                prioridad: prioridad,
                usuario: userData?.nombre
            });
            
            // ✅ 1. GUARDAR EN LOCALSTORAGE
            this.guardarAlertaLocal({
                mensaje: mensaje,
                tipo: tipo,
                prioridad: prioridad,
                usuario_nombre: userData?.nombre,
                fecha: new Date().toLocaleString()
            });

            // ✅ 2. GUARDAR EN BASE DE DATOS MYSQL
            const response = await fetch('alertas.php', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    mensaje: mensaje,
                    tipo: tipo,
                    prioridad: prioridad,
                    usuario_id: userData?.id || null
                })
            });

            const result = await response.json();
            
            if (!result.success) {
                console.error('Error guardando alerta en BD:', result.error);
            }

            // ✅ ACTUALIZAR AUTOMÁTICAMENTE para todos los admins
            this.actualizarAlertasParaTodos();
            
            return { success: true };
            
        } catch (error) {
            console.error('Error creando alerta:', error);
            return { success: false, error: error.message };
        }
    }

    guardarAlertaLocal(alerta) {
        // Guardar en localStorage
        let alertas = JSON.parse(localStorage.getItem('tecnoacceso_alertas') || '[]');
        alertas.unshift(alerta);
        
        // Mantener solo las últimas 20 alertas
        if (alertas.length > 20) {
            alertas = alertas.slice(0, 20);
        }
        
        localStorage.setItem('tecnoacceso_alertas', JSON.stringify(alertas));
        
        // Actualizar la vista
        this.updateAlertasUI(alertas);
    }

    actualizarAlertasParaTodos() {
        // Si este usuario es admin, actualizar inmediatamente
        const userData = JSON.parse(localStorage.getItem('tecnoacceso_user'));
        if (userData && userData.tipo === 'admin') {
            this.fetchAlertas();
        }
        
        // También podrías usar localStorage para notificar a otras pestañas
        localStorage.setItem('tecnoacceso_ultima_actualizacion', new Date().getTime().toString());
    }
}

// ✅ FUNCIONES GLOBALES MEJORADAS
async function sendCommand(command) {
    const commandDesc = getCommandDescription(command);
    addLog(`Comando: ${commandDesc}`, 'info');
    
    // Registrar actividad en BD
    if (window.controlPanel) {
        const userData = JSON.parse(localStorage.getItem('tecnoacceso_user'));
        const accion = `${userData.nombre} ejecutó: ${commandDesc}`;
        await window.controlPanel.registrarActividad(accion, command);
        
        // Registrar en logs del sistema
        await window.controlPanel.registrarLogSistema(
            `Comando ejecutado: ${commandDesc}`,
            'movimiento',
            { comando: command, descripcion: commandDesc },
            'exito'
        );
        
        // ✅ FORZAR ACTUALIZACIÓN INMEDIATA si es admin
        if (userData.tipo === 'admin') {
            window.controlPanel.cargarActividades();
            window.controlPanel.cargarRegistros();
        }
    }
    
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

async function sendEmergency() {
    addLog('🚨 BOTÓN DE EMERGENCIA ACTIVADO', 'error');
    
    // Registrar actividad de emergencia
    if (window.controlPanel) {
        const userData = JSON.parse(localStorage.getItem('tecnoacceso_user'));
        const accion = `🚨 EMERGENCIA ACTIVADA por ${userData.nombre}`;
        await window.controlPanel.registrarActividad(accion, 'EMERGENCY');
        
        // Registrar emergencia en logs
        await window.controlPanel.registrarLogSistema(
            'BOTÓN DE EMERGENCIA ACTIVADO',
            'sistema',
            { tipo: 'emergencia', accion: 'detencion_total' },
            'advertencia'
        );
        
        // ✅ FORZAR ACTUALIZACIÓN INMEDIATA si es admin
        if (userData.tipo === 'admin') {
            window.controlPanel.cargarActividades();
            window.controlPanel.cargarRegistros();
        }
    }
    
    // Crear alerta de emergencia
    if (window.alertasSystem) {
        await window.alertasSystem.crearAlerta(
            `🚨 EMERGENCIA ACTIVADA por ${JSON.parse(localStorage.getItem('tecnoacceso_user')).nombre}`,
            'emergencia',
            'alta'
        );
    }
    
    // Enviar comando de detener al ESP32
    if (window.controlPanel && window.controlPanel.isConnected) {
        window.controlPanel.sendBluetoothCommand('C');
    }
    
    setTimeout(() => {
        addLog('✅ Sistema de emergencia activado. Todos los motores detenidos.', 'success');
        updateElevatorStatus('emergency');
    }, 500);
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

// ✅ FUNCIONES PARA ALERTAS
async function marcarAlertaLeida(fechaAlerta) {
    try {
        let alertas = JSON.parse(localStorage.getItem('tecnoacceso_alertas') || '[]');
        alertas = alertas.filter(alerta => alerta.fecha !== fechaAlerta);
        localStorage.setItem('tecnoacceso_alertas', JSON.stringify(alertas));
        
        // Recargar alertas
        if (window.alertasSystem) {
            window.alertasSystem.fetchAlertas();
        }
    } catch (error) {
        console.error('Error marcando alerta como leída:', error);
    }
}

async function marcarTodasLeidas() {
    localStorage.setItem('tecnoacceso_alertas', JSON.stringify([]));
    if (window.alertasSystem) {
        window.alertasSystem.fetchAlertas();
    }
}

// ✅ FUNCIÓN PARA RECARGAR ACTIVIDADES
async function recargarActividades() {
    if (window.controlPanel && window.controlPanel.currentUser.tipo === 'admin') {
        await window.controlPanel.cargarActividades();
        addLog('✅ Actividades actualizadas', 'success');
    }
}

// ✅ FUNCIÓN PARA CARGAR REGISTROS
async function cargarRegistros() {
    if (window.controlPanel && window.controlPanel.currentUser.tipo === 'admin') {
        await window.controlPanel.cargarRegistros();
        addLog('✅ Registros actualizados', 'success');
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

// ✅ INICIALIZACIÓN MEJORADA
document.addEventListener('DOMContentLoaded', () => {
    window.controlPanel = new ControlPanel();
    addLog('Sesión iniciada correctamente', 'success');
    
    // Inicializar sistema de alertas
    window.alertasSystem = new AlertasSystem();
    window.alertasSystem.init();
    
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
    
    // Solicitar permisos para notificaciones
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
});

// Detener polling cuando la página se cierre
window.addEventListener('beforeunload', () => {
    if (window.alertasSystem) {
        window.alertasSystem.stopPolling();
    }
});