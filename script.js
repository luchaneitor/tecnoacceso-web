class TecnoAccesoApp {
    constructor() {
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.checkAuthentication();
    }

    setupEventListeners() {
        const loginForm = document.getElementById('loginForm');
        const togglePassword = document.getElementById('togglePassword');

        loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        togglePassword.addEventListener('click', () => this.togglePasswordVisibility());
    }

    async handleLogin(event) {
        event.preventDefault();
        
        const username = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value.trim();
        const dependencia = document.getElementById('dependencia').value;
        const statusElement = document.getElementById('loginStatus');

        // Reset status
        statusElement.className = 'status-message';
        statusElement.textContent = '';

        try {
            const response = await this.authenticateUser(username, password, dependencia);
            
            if (response.status === 'success') {
                this.showSuccess('¡Bienvenido! Redirigiendo...');
                setTimeout(() => {
                    window.location.href = 'control.html';
                }, 1500);
            } else {
                this.showError(response.message);
            }
        } catch (error) {
            this.showError('Error de conexión. Intente nuevamente.');
            console.error('Login error:', error);
        }
    }

    async authenticateUser(username, password, dependencia) {
        // Simulación de autenticación con dependencia
        const users = {
            'admin': { 
                password: 'admin123', 
                nombre: 'Administrador', 
                tipo: 'admin',
                dependencia: null // Admin puede acceder a cualquier dependencia
            },
            'juan': { 
                password: '12345', 
                nombre: 'Juan Pérez', 
                tipo: 'user',
                dependencia: 'itsa'
            },
            'maria': { 
                password: 'abcde', 
                nombre: 'María López', 
                tipo: 'user',
                dependencia: 'otra'
            },
            'luis': { 
                password: 'luis123', 
                nombre: 'Luis Sánchez', 
                tipo: 'user',
                dependencia: 'itsa'
            },
            'daniela': { 
                password: 'daniela123', 
                nombre: 'Daniela Gómez', 
                tipo: 'user',
                dependencia: 'otra'
            }
        };

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (users[username] && users[username].password === password) {
            // Validar dependencia para usuarios normales
            if (users[username].dependencia !== null && users[username].dependencia !== dependencia) {
                return { 
                    status: 'error', 
                    message: 'Dependencia no coincide con el usuario' 
                };
            }
            
            // GUARDAR EN LOCALSTORAGE
            const userData = {
                usuario: username,
                nombre: users[username].nombre,
                tipo: users[username].tipo,
                dependencia: dependencia,
                id: this.getUserId(username)
            };
            localStorage.setItem('tecnoacceso_user', JSON.stringify(userData));
            localStorage.setItem('tecnoacceso_authenticated', 'true');
            
            return { status: 'success', user: userData };
        } else {
            return { status: 'error', message: 'Usuario o contraseña incorrectos' };
        }
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

    togglePasswordVisibility() {
        const passwordInput = document.getElementById('password');
        const toggleIcon = document.getElementById('togglePassword').querySelector('i');

        if (passwordInput.type === 'password') {
            passwordInput.type = 'text';
            toggleIcon.className = 'fas fa-eye-slash';
        } else {
            passwordInput.type = 'password';
            toggleIcon.className = 'fas fa-eye';
        }
    }

    showSuccess(message) {
        const statusElement = document.getElementById('loginStatus');
        statusElement.textContent = message;
        statusElement.className = 'status-message success';
    }

    showError(message) {
        const statusElement = document.getElementById('loginStatus');
        statusElement.textContent = message;
        statusElement.className = 'status-message error';
    }

    checkAuthentication() {
        if (localStorage.getItem('tecnoacceso_authenticated')) {
            window.location.href = 'control.html';
        }
    }
}

// Inicializar la aplicación
document.addEventListener('DOMContentLoaded', () => {
    new TecnoAccesoApp();
});

// Efectos visuales adicionales
document.addEventListener('DOMContentLoaded', function() {
    const animatedElements = document.querySelectorAll('.info-card, .login-card');
    
    animatedElements.forEach((element, index) => {
        element.style.opacity = '0';
        element.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            element.style.transition = 'all 0.6s ease';
            element.style.opacity = '1';
            element.style.transform = 'translateY(0)';
        }, index * 200);
    });
});