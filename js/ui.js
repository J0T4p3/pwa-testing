/**
 * Todo PWA - UI Management
 * Handles all user interface interactions and DOM manipulation
 */

class TodoUI {
    constructor(storage) {
        this.storage = storage;
        this.currentFilter = 'all';
        this.searchQuery = '';
        
        // DOM element references
        this.elements = {
            todosList: document.getElementById('todosList'),
            todoForm: document.getElementById('todoForm'),
            titleInput: document.getElementById('todoTitle'),
            dueDateInput: document.getElementById('todoDueDate'),
            totalTodos: document.getElementById('totalTodos'),
            completedTodos: document.getElementById('completedTodos'),
            pendingTodos: document.getElementById('pendingTodos')
        };
        
        // Initialize UI
        this.init();
    }

    /**
     * Initialize UI components and event listeners
     */
    init() {
        console.log('Todo PWA: Initializing UI...');
        
        // Bind form events
        this.bindFormEvents();
        
        // Setup filter controls
        this.setupFilterControls();
        
        // Setup search functionality
        this.setupSearchFunctionality();
        
        // Setup keyboard navigation
        this.setupKeyboardNavigation();
        
        // Listen for storage changes (cross-tab sync)
        this.setupStorageSync();
        
        // Setup notification system
        this.setupNotifications();
        
        // Initial render
        this.render();
        
        console.log('Todo PWA: UI initialized successfully');
    }

    /**
     * Bind form events
     */
    bindFormEvents() {
        this.elements.todoForm.addEventListener('submit', (event) => {
            event.preventDefault();
            this.addTodo();
        });

        // Auto-resize text inputs
        this.elements.titleInput.addEventListener('input', this.autoResize.bind(this));
        
        // Clear form on escape
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                this.clearForm();
            }
        });
    }

    /**
     * Setup filter controls
     */
    setupFilterControls() {
        // Create filter buttons
        const filterContainer = document.createElement('div');
        filterContainer.className = 'filter-controls';
        filterContainer.innerHTML = `
            <button class="filter-btn active" data-filter="all">All</button>
            <button class="filter-btn" data-filter="pending">Pending</button>
            <button class="filter-btn" data-filter="completed">Completed</button>
            <button class="filter-btn" data-filter="overdue">Overdue</button>
        `;

        // Add filter styles
        const filterStyles = `
            .filter-controls {
                display: flex;
                gap: 8px;
                margin-bottom: 20px;
                flex-wrap: wrap;
            }
            .filter-btn {
                padding: 8px 16px;
                border: 2px solid #e5e7eb;
                background: white;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 500;
                cursor: pointer;
                transition: all 0.2s ease;
                color: #6b7280;
            }
            .filter-btn:hover {
                border-color: #4F46E5;
                color: #4F46E5;
            }
            .filter-btn.active {
                background: #4F46E5;
                border-color: #4F46E5;
                color: white;
            }
        `;

        // Add styles to head if not already present
        if (!document.getElementById('filter-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'filter-styles';
            styleSheet.textContent = filterStyles;
            document.head.appendChild(styleSheet);
        }

        // Insert before todos container
        const todosContainer = document.querySelector('.todos-container');
        todosContainer.parentNode.insertBefore(filterContainer, todosContainer);

        // Bind filter events
        filterContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('filter-btn')) {
                this.setFilter(event.target.dataset.filter);
            }
        });
    }

    /**
     * Setup search functionality
     */
    setupSearchFunctionality() {
        const searchContainer = document.createElement('div');
        searchContainer.className = 'search-container';
        searchContainer.innerHTML = `
            <input type="text" id="searchInput" placeholder="Search todos..." class="search-input">
            <button type="button" id="clearSearch" class="clear-search" style="display: none;">&times;</button>
        `;

        // Add search styles
        const searchStyles = `
            .search-container {
                position: relative;
                margin-bottom: 20px;
            }
            .search-input {
                width: 100%;
                padding: 12px 40px 12px 15px;
                border: 2px solid #e5e7eb;
                border-radius: 10px;
                font-size: 14px;
                transition: all 0.3s ease;
                background: rgba(255, 255, 255, 0.9);
            }
            .search-input:focus {
                outline: none;
                border-color: #4F46E5;
                box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.1);
            }
            .clear-search {
                position: absolute;
                right: 10px;
                top: 50%;
                transform: translateY(-50%);
                background: none;
                border: none;
                font-size: 20px;
                cursor: pointer;
                color: #6b7280;
                padding: 5px;
            }
            .clear-search:hover {
                color: #ef4444;
            }
        `;

        // Add styles to head if not already present
        if (!document.getElementById('search-styles')) {
            const styleSheet = document.createElement('style');
            styleSheet.id = 'search-styles';
            styleSheet.textContent = searchStyles;
            document.head.appendChild(styleSheet);
        }

        // Insert before filter controls
        const filterControls = document.querySelector('.filter-controls');
        filterControls.parentNode.insertBefore(searchContainer, filterControls);

        // Bind search events
        const searchInput = document.getElementById('searchInput');
        const clearButton = document.getElementById('clearSearch');

        searchInput.addEventListener('input', (event) => {
            this.searchQuery = event.target.value;
            this.render();
            
            clearButton.style.display = this.searchQuery ? 'block' : 'none';
        });

        clearButton.addEventListener('click', () => {
            searchInput.value = '';
            this.searchQuery = '';
            this.render();
            clearButton.style.display = 'none';
            searchInput.focus();
        });
    }

    /**
     * Setup keyboard navigation
     */
    setupKeyboardNavigation() {
        document.addEventListener('keydown', (event) => {
            // Don't interfere when typing in inputs
            if (event.target.matches('input, textarea')) return;

            switch (event.key) {
                case '/':
                    event.preventDefault();
                    document.getElementById('searchInput').focus();
                    break;
                case 'n':
                    if (event.ctrlKey || event.metaKey) {
                        event.preventDefault();
                        this.focusAddInput();
                    }
                    break;
            }
        });
    }

    /**
     * Setup cross-tab storage synchronization
     */
    setupStorageSync() {
        window.addEventListener('todo-storage-change', (event) => {
            console.log('Todo PWA: Storage change detected:', event.detail.type);
            this.render();
        });

        // Also listen for localStorage changes from other tabs
        window.addEventListener('storage', (event) => {
            if (event.key === this.storage.storageKey) {
                console.log('Todo PWA: External storage change detected');
                this.render();
            }
        });
    }

    /**
     * Setup notification system
     */
    setupNotifications() {
        // Create notification container
        const notificationContainer = document.createElement('div');
        notificationContainer.id = 'notificationContainer';
        notificationContainer.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            z-index: 10000;
            max-width: 300px;
        `;
        document.body.appendChild(notificationContainer);
    }

    /**
     * Add a new todo
     */
    addTodo() {
        const title = this.elements.titleInput.value.trim();
        const dueDate = this.elements.dueDateInput.value || null;

        if (!title) {
            this.showNotification('Please enter a todo title', 'error');
            this.elements.titleInput.focus();
            return;
        }

        const newTodo = this.storage.addTodo({ title, dueDate });
        
        if (newTodo) {
            this.clearForm();
            this.render();
            this.showNotification('Todo added successfully!', 'success');
            
            // Focus back to input for quick adding
            setTimeout(() => {
                this.elements.titleInput.focus();
            }, 100);
        } else {
            this.showNotification('Failed to add todo. Please try again.', 'error');
        }
    }

    /**
     * Toggle todo completion status
     */
    toggleTodo(id) {
        const todo = this.storage.getTodo(id);
        if (!todo) return;

        const updated = this.storage.updateTodo(id, { 
            completed: !todo.completed 
        });

        if (updated) {
            this.render();
            const message = updated.completed ? 'Todo completed!' : 'Todo reopened!';
            this.showNotification(message, 'success');
        }
    }

    /**
     * Delete a todo
     */
    deleteTodo(id) {
        const todo = this.storage.getTodo(id);
        if (!todo) return;

        // Show confirmation dialog
        if (!this.showConfirmDialog(`Delete "${todo.title}"?`, 'This action cannot be undone.')) {
            return;
        }

        if (this.storage.deleteTodo(id)) {
            this.render();
            this.showNotification('Todo deleted successfully', 'success');
        } else {
            this.showNotification('Failed to delete todo', 'error');
        }
    }

    /**
     * Set current filter
     */
    setFilter(filter) {
        this.currentFilter = filter;
        
        // Update active filter button
        document.querySelectorAll('.filter-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.filter === filter);
        });
        
        this.render();
    }

    /**
     * Clear the form
     */
    clearForm() {
        this.elements.titleInput.value = '';
        this.elements.dueDateInput.value = '';
        this.elements.titleInput.focus();
    }

    /**
     * Focus on add input
     */
    focusAddInput() {
        this.elements.titleInput.focus();
    }

    /**
     * Submit form programmatically
     */
    submitForm() {
        if (this.elements.titleInput.value.trim()) {
            this.addTodo();
        }
    }

    /**
     * Auto-resize text inputs
     */
    autoResize(event) {
        const input = event.target;
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 150) + 'px';
    }

    /**
     * Format date for display
     */
    formatDate(dateString) {
        if (!dateString) return null;

        const date = new Date(dateString);
        const now = new Date();
        const diffTime = date - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays < 0) {
            return { 
                text: `Overdue by ${Math.abs(diffDays)} day${Math.abs(diffDays) !== 1 ? 's' : ''}`, 
                class: 'overdue' 
            };
        }
        if (diffDays === 0) return { text: 'Due today', class: 'due-today' };
        if (diffDays === 1) return { text: 'Due tomorrow', class: 'due-soon' };
        if (diffDays <= 7) return { text: `Due in ${diffDays} days`, class: 'due-soon' };
        
        return { 
            text: date.toLocaleDateString(), 
            class: '' 
        };
    }

    /**
     * Get filtered and sorted todos
     */
    getFilteredTodos() {
        let todos = this.storage.getTodos();

        // Apply search filter
        if (this.searchQuery) {
            todos = this.storage.searchTodos(this.searchQuery);
        }

        // Apply status filter
        if (this.currentFilter !== 'all') {
            todos = this.storage.filterTodos(todos, this.currentFilter);
        }

        return todos;
    }

    /**
     * Update statistics display
     */
    updateStats() {
        const allTodos = this.storage.getTodos();
        const completed = allTodos.filter(t => t.completed).length;
        const total = allTodos.length;
        const pending = total - completed;

        this.elements.totalTodos.textContent = total;
        this.elements.completedTodos.textContent = completed;
        this.elements.pendingTodos.textContent = pending;

        // Add animation to numbers
        [this.elements.totalTodos, this.elements.completedTodos, this.elements.pendingTodos]
            .forEach(el => {
                el.style.transform = 'scale(1.1)';
                setTimeout(() => {
                    el.style.transform = 'scale(1)';
                }, 150);
            });
    }

    /**
     * Render todos list
     */
    renderTodos(todos) {
        if (todos.length === 0) {
            this.elements.todosList.innerHTML = this.getEmptyStateHTML();
            return;
        }

        const todosHTML = todos.map(todo => {
            const dateInfo = this.formatDate(todo.dueDate);
            const isOverdue = dateInfo && dateInfo.class === 'overdue';
            
            return `
                <div class="todo-item ${todo.completed ? 'completed' : ''}" data-id="${todo.id}">
                    <input 
                        type="checkbox" 
                        class="todo-checkbox" 
                        ${todo.completed ? 'checked' : ''} 
                        onchange="this.closest('.todo-item').classList.toggle('updating', true); window.todoUI.toggleTodo('${todo.id}')"
                    >
                    <div class="todo-content">
                        <div class="todo-title ${todo.completed ? 'completed' : ''}">
                            ${this.escapeHtml(todo.title)}
                        </div>
                        ${dateInfo ? `
                            <div class="todo-date ${dateInfo.class}">
                                ${dateInfo.text}
                            </div>
                        ` : ''}
                        ${todo.description ? `
                            <div class="todo-description">
                                ${this.escapeHtml(todo.description)}
                            </div>
                        ` : ''}
                    </div>
                    <div class="todo-actions">
                        <button 
                            class="btn-small btn-delete" 
                            onclick="window.todoUI.deleteTodo('${todo.id}')"
                            title="Delete todo"
                        >
                            Delete
                        </button>
                    </div>
                </div>
            `;
        }).join('');

        this.elements.todosList.innerHTML = todosHTML;

        // Add entrance animations
        requestAnimationFrame(() => {
            document.querySelectorAll('.todo-item').forEach((item, index) => {
                item.style.opacity = '0';
                item.style.transform = 'translateY(20px)';
                
                setTimeout(() => {
                    item.style.transition = 'all 0.3s ease';
                    item.style.opacity = '1';
                    item.style.transform = 'translateY(0)';
                }, index * 50);
            });
        });
    }

    /**
     * Get empty state HTML
     */
    getEmptyStateHTML() {
        const emptyMessages = {
            all: {
                icon: '📝',
                title: 'No todos yet',
                message: 'Add your first todo above to get started!'
            },
            pending: {
                icon: '✨',
                title: 'All caught up!',
                message: 'No pending todos. Great job!'
            },
            completed: {
                icon: '🎉',
                title: 'No completed todos',
                message: 'Complete some todos to see them here.'
            },
            overdue: {
                icon: '⏰',
                title: 'No overdue todos',
                message: 'You\'re staying on top of things!'
            }
        };

        const config = emptyMessages[this.currentFilter] || emptyMessages.all;
        
        if (this.searchQuery) {
            return `
                <div class="empty-state">
                    <div style="font-size: 3rem; margin-bottom: 20px;">🔍</div>
                    <h3>No results found</h3>
                    <p>No todos match "${this.escapeHtml(this.searchQuery)}"</p>
                    <button class="btn-small" onclick="document.getElementById('clearSearch').click()" style="margin-top: 15px;">
                        Clear search
                    </button>
                </div>
            `;
        }

        return `
            <div class="empty-state">
                <div style="font-size: 3rem; margin-bottom: 20px;">${config.icon}</div>
                <h3>${config.title}</h3>
                <p>${config.message}</p>
            </div>
        `;
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <span>${this.escapeHtml(message)}</span>
                <button class="notification-close">&times;</button>
            </div>
        `;

        // Add notification styles
        notification.style.cssText = `
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#4F46E5'};
            color: white;
            padding: 12px 16px;
            border-radius: 8px;
            margin-bottom: 10px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
            animation: slideInFromRight 0.3s ease-out;
            display: flex;
            align-items: center;
            justify-content: space-between;
        `;

        // Add animation keyframes
        if (!document.getElementById('notification-styles')) {
            const style = document.createElement('style');
            style.id = 'notification-styles';
            style.textContent = `
                @keyframes slideInFromRight {
                    from { transform: translateX(100%); opacity: 0; }
                    to { transform: translateX(0); opacity: 1; }
                }
                .notification-close {
                    background: none;
                    border: none;
                    color: inherit;
                    font-size: 18px;
                    cursor: pointer;
                    margin-left: 10px;
                }
            `;
            document.head.appendChild(style);
        }

        const container = document.getElementById('notificationContainer');
        container.appendChild(notification);

        // Auto remove
        const removeNotification = () => {
            notification.style.animation = 'slideInFromRight 0.3s ease-out reverse';
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.parentNode.removeChild(notification);
                }
            }, 300);
        };

        // Close button
        notification.querySelector('.notification-close').addEventListener('click', removeNotification);

        // Auto remove after duration
        if (duration > 0) {
            setTimeout(removeNotification, duration);
        }
    }

    /**
     * Show confirmation dialog
     */
    showConfirmDialog(title, message) {
        return confirm(`${title}\n\n${message}`);
    }

    /**
     * Escape HTML to prevent XSS
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Main render method
     */
    render() {
        try {
            // Update statistics
            this.updateStats();

            // Get filtered todos
            const todos = this.getFilteredTodos();

            // Render todos list
            this.renderTodos(todos);

            // Update document title with pending count
            const pendingCount = this.storage.getTodos().filter(t => !t.completed).length;
            document.title = pendingCount > 0 ? `(${pendingCount}) Todo PWA` : 'Todo PWA';

        } catch (error) {
            console.error('Todo PWA: Render error:', error);
            this.showNotification('Something went wrong while updating the display', 'error');
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TodoUI = TodoUI;
    
    // Make UI globally accessible for inline event handlers
    window.addEventListener('DOMContentLoaded', () => {
        // Will be set by app.js when TodoUI is instantiated
    });
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TodoUI;
}
