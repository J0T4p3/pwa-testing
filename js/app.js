/**
 * Todo PWA - Main Application Controller
 * Coordinates storage, UI, and PWA functionality
 */

class TodoApp {
    constructor() {
        this.storage = new TodoStorage();
        this.ui = new TodoUI(this.storage);
        this.installPrompt = null;
        
        this.init();
    }

    /**
     * Initialize the application
     */
    init() {
        console.log('Todo PWA: Initializing application...');
        
        // Register service worker
        this.registerServiceWorker();
        
        // Setup PWA install functionality
        this.setupPWAInstall();
        
        // Setup keyboard shortcuts
        this.setupKeyboardShortcuts();
        
        // Setup URL parameters handling
        this.handleURLParameters();
        
        // Setup periodic cleanup
        this.setupPeriodicCleanup();
        
        // Initial render
        this.ui.render();
        
        console.log('Todo PWA: Application initialized successfully');
    }

    /**
     * Register service worker for offline functionality
     */
    async registerServiceWorker() {
        if ('serviceWorker' in navigator) {
            try {
                console.log('Todo PWA: Registering service worker...');
                
                const registration = await navigator.serviceWorker.register('/sw.js', {
                    scope: '/'
                });

                console.log('Todo PWA: Service Worker registered successfully', registration.scope);

                // Handle service worker updates
                registration.addEventListener('updatefound', () => {
                    const newWorker = registration.installing;
                    
                    newWorker.addEventListener('statechange', () => {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            this.showUpdateAvailable();
                        }
                    });
                });

                // Listen for controlling service worker change
                navigator.serviceWorker.addEventListener('controllerchange', () => {
                    window.location.reload();
                });

            } catch (error) {
                console.error('Todo PWA: Service Worker registration failed:', error);
            }
        } else {
            console.log('Todo PWA: Service Worker not supported');
        }
    }

    /**
     * Setup PWA installation functionality
     */
    setupPWAInstall() {
        const installPrompt = document.getElementById('installPrompt');
        const installBtn = document.getElementById('installBtn');
        const closeInstall = document.getElementById('closeInstall');

        // Listen for the beforeinstallprompt event
        window.addEventListener('beforeinstallprompt', (event) => {
            console.log('Todo PWA: Install prompt available');
            
            // Prevent the default prompt
            event.preventDefault();
            
            // Store the event for later use
            this.installPrompt = event;
            
            // Show our custom install prompt
            installPrompt.classList.add('show');
        });

        // Handle install button click
        installBtn.addEventListener('click', async () => {
            if (this.installPrompt) {
                try {
                    // Show the install prompt
                    this.installPrompt.prompt();
                    
                    // Wait for the user's choice
                    const { outcome } = await this.installPrompt.userChoice;
                    
                    console.log('Todo PWA: Install prompt outcome:', outcome);
                    
                    if (outcome === 'accepted') {
                        console.log('Todo PWA: User accepted the install');
                    }
                    
                    // Clear the prompt
                    this.installPrompt = null;
                    installPrompt.classList.remove('show');
                    
                } catch (error) {
                    console.error('Todo PWA: Install prompt error:', error);
                }
            }
        });

        // Handle close button click
        closeInstall.addEventListener('click', () => {
            installPrompt.classList.remove('show');
            // Remember user dismissed the prompt
            localStorage.setItem('todo-pwa-install-dismissed', 'true');
        });

        // Check if user previously dismissed the prompt
        if (localStorage.getItem('todo-pwa-install-dismissed') === 'true') {
            installPrompt.style.display = 'none';
        }

        // Listen for successful installation
        window.addEventListener('appinstalled', () => {
            console.log('Todo PWA: App installed successfully');
            installPrompt.classList.remove('show');
            
            // Track installation (could send to analytics)
            this.trackEvent('pwa_installed');
        });
    }

    /**
     * Setup keyboard shortcuts for better UX
     */
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + Enter to add todo
            if ((event.ctrlKey || event.metaKey) && event.key === 'Enter') {
                event.preventDefault();
                this.ui.submitForm();
            }
            
            // Escape to clear form
            if (event.key === 'Escape') {
                this.ui.clearForm();
            }
            
            // Ctrl/Cmd + A to focus on add todo input
            if ((event.ctrlKey || event.metaKey) && event.key === 'a' && !event.target.matches('input, textarea')) {
                event.preventDefault();
                this.ui.focusAddInput();
            }
        });
    }

    /**
     * Handle URL parameters for deep linking
     */
    handleURLParameters() {
        const urlParams = new URLSearchParams(window.location.search);
        
        // Handle action parameter
        const action = urlParams.get('action');
        if (action === 'add') {
            this.ui.focusAddInput();
        }
        
        // Handle filter parameter
        const filter = urlParams.get('filter');
        if (filter) {
            this.ui.setFilter(filter);
        }
        
        // Clean URL after handling parameters
        if (urlParams.toString()) {
            const cleanUrl = window.location.pathname;
            window.history.replaceState({}, document.title, cleanUrl);
        }
    }

    /**
     * Setup periodic cleanup of old completed todos
     */
    setupPeriodicCleanup() {
        // Run cleanup weekly (7 days)
        const lastCleanup = localStorage.getItem('todo-pwa-last-cleanup');
        const now = Date.now();
        const weekInMs = 7 * 24 * 60 * 60 * 1000;
        
        if (!lastCleanup || now - parseInt(lastCleanup) > weekInMs) {
            this.cleanupOldTodos();
            localStorage.setItem('todo-pwa-last-cleanup', now.toString());
        }
    }

    /**
     * Clean up completed todos older than 30 days
     */
    cleanupOldTodos() {
        try {
            const todos = this.storage.getTodos();
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            
            const todosToKeep = todos.filter(todo => {
                if (!todo.completed) return true;
                
                const completedDate = new Date(todo.completedAt || todo.createdAt).getTime();
                return completedDate > thirtyDaysAgo;
            });
            
            if (todosToKeep.length < todos.length) {
                this.storage.saveTodos(todosToKeep);
                console.log(`Todo PWA: Cleaned up ${todos.length - todosToKeep.length} old completed todos`);
                this.ui.render();
            }
            
        } catch (error) {
            console.error('Todo PWA: Cleanup failed:', error);
        }
    }

    /**
     * Show update available notification
     */
    showUpdateAvailable() {
        const updateBar = document.createElement('div');
        updateBar.className = 'update-notification';
        updateBar.innerHTML = `
            <div class="update-content">
                <span>🔄 New version available!</span>
                <button class="btn-small update-btn">Update Now</button>
                <button class="btn-small close-btn">Later</button>
            </div>
        `;
        
        updateBar.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            background: #4F46E5;
            color: white;
            padding: 12px;
            text-align: center;
            z-index: 1000;
            animation: slideInFromTop 0.3s ease-out;
        `;
        
        document.body.prepend(updateBar);
        
        // Handle update button
        updateBar.querySelector('.update-btn').addEventListener('click', () => {
            if (navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
            }
        });
        
        // Handle close button
        updateBar.querySelector('.close-btn').addEventListener('click', () => {
            updateBar.remove();
        });
    }

    /**
     * Track events for analytics (placeholder)
     */
    trackEvent(eventName, eventData = {}) {
        console.log('Todo PWA: Event tracked:', eventName, eventData);
        
        // Here you could integrate with analytics services like:
        // - Google Analytics
        // - Mixpanel
        // - Custom analytics endpoint
        
        // Example structure:
        // gtag('event', eventName, eventData);
    }

    /**
     * Export todos data
     */
    exportTodos() {
        try {
            const todos = this.storage.getTodos();
            const dataStr = JSON.stringify(todos, null, 2);
            const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
            
            const exportFileDefaultName = `todos-${new Date().toISOString().split('T')[0]}.json`;
            
            const linkElement = document.createElement('a');
            linkElement.setAttribute('href', dataUri);
            linkElement.setAttribute('download', exportFileDefaultName);
            linkElement.click();
            
            this.trackEvent('todos_exported', { count: todos.length });
            
        } catch (error) {
            console.error('Todo PWA: Export failed:', error);
            alert('Failed to export todos. Please try again.');
        }
    }

    /**
     * Import todos data
     */
    importTodos(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (event) => {
                try {
                    const importedTodos = JSON.parse(event.target.result);
                    
                    if (!Array.isArray(importedTodos)) {
                        throw new Error('Invalid file format');
                    }
                    
                    // Validate todo structure
                    const validTodos = importedTodos.filter(todo => 
                        todo && 
                        typeof todo.title === 'string' && 
                        typeof todo.completed === 'boolean'
                    );
                    
                    if (validTodos.length === 0) {
                        throw new Error('No valid todos found in file');
                    }
                    
                    // Merge with existing todos
                    const existingTodos = this.storage.getTodos();
                    const mergedTodos = [...validTodos, ...existingTodos];
                    
                    this.storage.saveTodos(mergedTodos);
                    this.ui.render();
                    
                    this.trackEvent('todos_imported', { count: validTodos.length });
                    resolve(validTodos.length);
                    
                } catch (error) {
                    reject(error);
                }
            };
            
            reader.onerror = () => reject(new Error('File read error'));
            reader.readAsText(file);
        });
    }

    /**
     * Get app statistics
     */
    getStats() {
        const todos = this.storage.getTodos();
        const now = new Date();
        
        return {
            total: todos.length,
            completed: todos.filter(t => t.completed).length,
            pending: todos.filter(t => !t.completed).length,
            overdue: todos.filter(t => {
                if (t.completed || !t.dueDate) return false;
                return new Date(t.dueDate) < now;
            }).length,
            dueToday: todos.filter(t => {
                if (t.completed || !t.dueDate) return false;
                const dueDate = new Date(t.dueDate);
                return dueDate.toDateString() === now.toDateString();
            }).length,
            createdThisWeek: todos.filter(t => {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                return new Date(t.createdAt) > weekAgo;
            }).length
        };
    }

    /**
     * Handle application errors
     */
    handleError(error, context = 'Unknown') {
        console.error(`Todo PWA Error [${context}]:`, error);
        
        // Track error for debugging
        this.trackEvent('app_error', {
            context,
            error: error.message,
            stack: error.stack
        });
        
        // Show user-friendly error message
        this.ui.showNotification('Something went wrong. Please try again.', 'error');
    }
}

// Global error handling
window.addEventListener('error', (event) => {
    if (window.todoApp) {
        window.todoApp.handleError(event.error, 'Global Error');
    }
});

window.addEventListener('unhandledrejection', (event) => {
    if (window.todoApp) {
        window.todoApp.handleError(event.reason, 'Unhandled Promise');
    }
});

// Initialize the application when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('Todo PWA: DOM loaded, starting application...');
    window.todoApp = new TodoApp();
});

// Handle page visibility changes for potential sync
document.addEventListener('visibilitychange', () => {
    if (!document.hidden && window.todoApp) {
        // Refresh data when page becomes visible
        window.todoApp.ui.render();
    }
});

// Export for testing purposes
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TodoApp;
}
