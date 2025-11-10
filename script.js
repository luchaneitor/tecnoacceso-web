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
        const statusElement = document.getElementById('loginStatus');

        // Reset status
        statusElement.className = 'status-message';
        statusElement.textContent = '';

        try {
            const response = await this.authenticateUser(username, password);
            
            if (response.status === 'success') {
                this.showSuccess('¡Bienvenido! Redirigiendo...');
                setTimeout(() => {
                    window.location.href = 'control.html';
                }, 1500);
            } else {
                this.showError('Usuario o contraseña incorrectos');
            }
        } catch (error) {
            this.showError('Error de conexión. Intente nuevamente.');
            console.error('Login error:', error);
        }
    }

    async authenticateUser(username, password) {
        // Simulación de autenticación
        const users = {
            'admin': { password: 'admin123', nombre: 'Administrador', tipo: 'admin' },
            'juan': { password: '12345', nombre: 'Juan Pérez', tipo: 'user' },
            'maria': { password: 'abcde', nombre: 'María López', tipo: 'user' },
            'luis': { password: 'luis123', nombre: 'Luis Sánchez', tipo: 'user' },
            'daniela': { password: 'daniela123', nombre: 'Daniela Gómez', tipo: 'user' }
        };

        await new Promise(resolve => setTimeout(resolve, 1000));

        if (users[username] && users[username].password === password) {
            // GUARDAR EN LOCALSTORAGE
            const userData = {
                usuario: username,
                nombre: users[username].nombre,
                tipo: users[username].tipo
            };
            localStorage.setItem('tecnoacceso_user', JSON.stringify(userData));
            localStorage.setItem('tecnoacceso_authenticated', 'true');
            
            return { status: 'success', user: userData };
        } else {
            return { status: 'error', message: 'Credenciales inválidas' };
        }
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