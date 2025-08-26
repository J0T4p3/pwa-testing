/**
 * Todo PWA - Storage Management
 * Handles all data persistence using localStorage with validation and error handling
 */

class TodoStorage {
    constructor() {
        this.storageKey = 'todo-pwa-data';
        this.settingsKey = 'todo-pwa-settings';
        this.version = '1.0.0';
        
        // Initialize storage if needed
        this.initializeStorage();
    }

    /**
     * Initialize storage with default structure
     */
    initializeStorage() {
        try {
            // Check if storage is available
            if (!this.isStorageAvailable()) {
                console.warn('Todo PWA: localStorage not available, using memory storage');
                this.useMemoryFallback();
                return;
            }

            // Initialize todos if not exists
            if (!localStorage.getItem(this.storageKey)) {
                this.saveTodos([]);
            }

            // Initialize settings if not exists
            if (!localStorage.getItem(this.settingsKey)) {
                this.saveSettings(this.getDefaultSettings());
            }

            // Handle version migrations if needed
            this.handleVersionMigration();

        } catch (error) {
            console.error('Todo PWA: Storage initialization failed:', error);
            this.useMemoryFallback();
        }
    }

    /**
     * Check if localStorage is available
     */
    isStorageAvailable() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (error) {
            return false;
        }
    }

    /**
     * Use memory storage as fallback
     */
    useMemoryFallback() {
        this.memoryStorage = {
            todos: [],
            settings: this.getDefaultSettings()
        };
        this.usingMemoryFallback = true;
        console.log('Todo PWA: Using memory storage fallback');
    }

    /**
     * Get default application settings
     */
    getDefaultSettings() {
        return {
            version: this.version,
            theme: 'auto',
            notifications: false,
            autoCleanup: true,
            sortBy: 'createdAt',
            sortOrder: 'desc',
            showCompleted: true,
            compactMode: false
        };
    }

    /**
     * Handle version migrations
     */
    handleVersionMigration() {
        try {
            const settings = this.getSettings();
            const currentVersion = settings.version || '0.0.0';

            if (currentVersion !== this.version) {
                console.log(`Todo PWA: Migrating from version ${currentVersion} to ${this.version}`);
                
                // Perform migrations based on version
                this.performMigrations(currentVersion, this.version);
                
                // Update version
                settings.version = this.version;
                this.saveSettings(settings);
            }
        } catch (error) {
            console.error('Todo PWA: Version migration failed:', error);
        }
    }

    /**
     * Perform data migrations between versions
     */
    performMigrations(fromVersion, toVersion) {
        const todos = this.getTodos();
        let migrated = false;

        // Migration from pre-1.0.0 versions
        if (fromVersion < '1.0.0') {
            todos.forEach(todo => {
                // Add missing fields
                if (!todo.id) {
                    todo.id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
                    migrated = true;
                }
                if (!todo.createdAt) {
                    todo.createdAt = new Date().toISOString();
                    migrated = true;
                }
                if (typeof todo.completed !== 'boolean') {
                    todo.completed = false;
                    migrated = true;
                }
            });
        }

        // Save migrated data
        if (migrated) {
            this.saveTodos(todos);
            console.log('Todo PWA: Data migration completed');
        }
    }

    /**
     * Get all todos with optional filtering and sorting
     */
    getTodos(options = {}) {
        try {
            let todos;
            
            if (this.usingMemoryFallback) {
                todos = [...this.memoryStorage.todos];
            } else {
                const data = localStorage.getItem(this.storageKey);
                todos = data ? JSON.parse(data) : [];
            }

            // Validate todos structure
            todos = this.validateTodos(todos);

            // Apply filters
            if (options.filter) {
                todos = this.filterTodos(todos, options.filter);
            }

            // Apply sorting
            if (options.sort) {
                todos = this.sortTodos(todos, options.sort);
            }

            return todos;

        } catch (error) {
            console.error('Todo PWA: Error loading todos:', error);
            return [];
        }
    }

    /**
     * Validate todos structure and clean invalid entries
     */
    validateTodos(todos) {
        if (!Array.isArray(todos)) {
            console.warn('Todo PWA: Invalid todos data, resetting to empty array');
            return [];
        }

        return todos.filter(todo => {
            // Required fields validation
            if (!todo || typeof todo !== 'object') return false;
            if (!todo.id || typeof todo.id !== 'string') return false;
            if (!todo.title || typeof todo.title !== 'string') return false;
            if (typeof todo.completed !== 'boolean') return false;

            return true;
        }).map(todo => ({
            id: todo.id,
            title: todo.title.trim(),
            completed: Boolean(todo.completed),
            dueDate: todo.dueDate || null,
            createdAt: todo.createdAt || new Date().toISOString(),
            completedAt: todo.completedAt || null,
            priority: todo.priority || 'normal',
            tags: Array.isArray(todo.tags) ? todo.tags : [],
            description: todo.description || ''
        }));
    }

    /**
     * Filter todos based on criteria
     */
    filterTodos(todos, filter) {
        switch (filter) {
            case 'completed':
                return todos.filter(todo => todo.completed);
            case 'pending':
                return todos.filter(todo => !todo.completed);
            case 'overdue':
                const now = new Date();
                return todos.filter(todo => 
                    !todo.completed && 
                    todo.dueDate && 
                    new Date(todo.dueDate) < now
                );
            case 'today':
                const today = new Date().toDateString();
                return todos.filter(todo => 
                    !todo.completed && 
                    todo.dueDate && 
                    new Date(todo.dueDate).toDateString() === today
                );
            default:
                return todos;
        }
    }

    /**
     * Sort todos based on criteria
     */
    sortTodos(todos, sortOptions) {
        const { field = 'createdAt', order = 'desc' } = sortOptions;
        
        return todos.sort((a, b) => {
            let aValue = a[field];
            let bValue = b[field];

            // Handle date fields
            if (field === 'createdAt' || field === 'completedAt' || field === 'dueDate') {
                aValue = aValue ? new Date(aValue) : new Date(0);
                bValue = bValue ? new Date(bValue) : new Date(0);
            }

            // Handle string fields
            if (typeof aValue === 'string' && typeof bValue === 'string') {
                aValue = aValue.toLowerCase();
                bValue = bValue.toLowerCase();
            }

            // Compare values
            let comparison = 0;
            if (aValue < bValue) comparison = -1;
            if (aValue > bValue) comparison = 1;

            return order === 'desc' ? -comparison : comparison;
        });
    }

    /**
     * Save todos to storage
     */
    saveTodos(todos) {
        try {
            // Validate before saving
            const validatedTodos = this.validateTodos(todos);

            if (this.usingMemoryFallback) {
                this.memoryStorage.todos = validatedTodos;
            } else {
                localStorage.setItem(this.storageKey, JSON.stringify(validatedTodos));
            }

            // Trigger storage event for other tabs/windows
            this.triggerStorageEvent('todos_updated', validatedTodos);
            
            return true;

        } catch (error) {
            console.error('Todo PWA: Error saving todos:', error);
            
            // Handle quota exceeded error
            if (error.name === 'QuotaExceededError') {
                this.handleQuotaExceeded();
            }
            
            return false;
        }
    }

    /**
     * Add a new todo
     */
    addTodo(todoData) {
        try {
            const todos = this.getTodos();
            
            const newTodo = {
                id: this.generateId(),
                title: todoData.title.trim(),
                completed: false,
                dueDate: todoData.dueDate || null,
                createdAt: new Date().toISOString(),
                completedAt: null,
                priority: todoData.priority || 'normal',
                tags: todoData.tags || [],
                description: todoData.description || ''
            };

            todos.unshift(newTodo);
            
            if (this.saveTodos(todos)) {
                this.triggerStorageEvent('todo_added', newTodo);
                return newTodo;
            }
            
            return null;

        } catch (error) {
            console.error('Todo PWA: Error adding todo:', error);
            return null;
        }
    }

    /**
     * Update an existing todo
     */
    updateTodo(id, updates) {
        try {
            const todos = this.getTodos();
            const index = todos.findIndex(todo => todo.id === id);
            
            if (index === -1) {
                console.warn('Todo PWA: Todo not found for update:', id);
                return null;
            }

            const oldTodo = { ...todos[index] };
            
            // Apply updates
            todos[index] = {
                ...todos[index],
                ...updates,
                id, // Ensure ID cannot be changed
                updatedAt: new Date().toISOString()
            };

            // Handle completion status change
            if (updates.completed !== undefined) {
                todos[index].completedAt = updates.completed 
                    ? new Date().toISOString() 
                    : null;
            }

            if (this.saveTodos(todos)) {
                this.triggerStorageEvent('todo_updated', { old: oldTodo, new: todos[index] });
                return todos[index];
            }
            
            return null;

        } catch (error) {
            console.error('Todo PWA: Error updating todo:', error);
            return null;
        }
    }

    /**
     * Delete a todo
     */
    deleteTodo(id) {
        try {
            const todos = this.getTodos();
            const index = todos.findIndex(todo => todo.id === id);
            
            if (index === -1) {
                console.warn('Todo PWA: Todo not found for deletion:', id);
                return false;
            }

            const deletedTodo = todos[index];
            todos.splice(index, 1);
            
            if (this.saveTodos(todos)) {
                this.triggerStorageEvent('todo_deleted', deletedTodo);
                return true;
            }
            
            return false;

        } catch (error) {
            console.error('Todo PWA: Error deleting todo:', error);
            return false;
        }
    }

    /**
     * Get a single todo by ID
     */
    getTodo(id) {
        const todos = this.getTodos();
        return todos.find(todo => todo.id === id) || null;
    }

    /**
     * Search todos by text
     */
    searchTodos(query) {
        const todos = this.getTodos();
        const searchTerm = query.toLowerCase().trim();
        
        if (!searchTerm) return todos;

        return todos.filter(todo => 
            todo.title.toLowerCase().includes(searchTerm) ||
            todo.description.toLowerCase().includes(searchTerm) ||
            (todo.tags && todo.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
        );
    }

    /**
     * Get application settings
     */
    getSettings() {
        try {
            if (this.usingMemoryFallback) {
                return { ...this.memoryStorage.settings };
            }

            const data = localStorage.getItem(this.settingsKey);
            const settings = data ? JSON.parse(data) : this.getDefaultSettings();
            
            // Merge with defaults to ensure all settings exist
            return { ...this.getDefaultSettings(), ...settings };

        } catch (error) {
            console.error('Todo PWA: Error loading settings:', error);
            return this.getDefaultSettings();
        }
    }

    /**
     * Save application settings
     */
    saveSettings(settings) {
        try {
            const validatedSettings = { ...this.getDefaultSettings(), ...settings };

            if (this.usingMemoryFallback) {
                this.memoryStorage.settings = validatedSettings;
            } else {
                localStorage.setItem(this.settingsKey, JSON.stringify(validatedSettings));
            }

            this.triggerStorageEvent('settings_updated', validatedSettings);
            return true;

        } catch (error) {
            console.error('Todo PWA: Error saving settings:', error);
            return false;
        }
    }

    /**
     * Get storage statistics
     */
    getStorageStats() {
        try {
            const todos = this.getTodos();
            const settings = this.getSettings();
            
            let storageUsed = 0;
            let storageAvailable = 0;
            
            if (!this.usingMemoryFallback) {
                // Calculate approximate storage usage
                storageUsed = JSON.stringify(todos).length + JSON.stringify(settings).length;
                
                // Estimate available storage (rough approximation)
                if ('storage' in navigator && 'estimate' in navigator.storage) {
                    navigator.storage.estimate().then(estimate => {
                        console.log('Storage quota:', estimate);
                    });
                }
                storageAvailable = 5 * 1024 * 1024; // 5MB rough estimate
            }

            return {
                todosCount: todos.length,
                completedCount: todos.filter(t => t.completed).length,
                storageUsed,
                storageAvailable,
                usingMemoryFallback: this.usingMemoryFallback
            };

        } catch (error) {
            console.error('Todo PWA: Error getting storage stats:', error);
            return null;
        }
    }

    /**
     * Generate unique ID for todos
     */
    generateId() {
        return Date.now().toString() + Math.random().toString(36).substr(2, 9);
    }

    /**
     * Handle quota exceeded error
     */
    handleQuotaExceeded() {
        console.warn('Todo PWA: Storage quota exceeded, attempting cleanup...');
        
        try {
            // Remove old completed todos
            const todos = this.getTodos();
            const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);
            
            const filteredTodos = todos.filter(todo => {
                if (!todo.completed) return true;
                const completedDate = new Date(todo.completedAt || todo.createdAt).getTime();
                return completedDate > thirtyDaysAgo;
            });

            if (filteredTodos.length < todos.length) {
                this.saveTodos(filteredTodos);
                console.log('Todo PWA: Cleaned up old todos to free space');
            }

        } catch (error) {
            console.error('Todo PWA: Quota cleanup failed:', error);
            // Fall back to memory storage
            this.useMemoryFallback();
        }
    }

    /**
     * Trigger custom storage events for cross-tab communication
     */
    triggerStorageEvent(type, data) {
        if (typeof window !== 'undefined' && window.dispatchEvent) {
            window.dispatchEvent(new CustomEvent('todo-storage-change', {
                detail: { type, data, timestamp: Date.now() }
            }));
        }
    }

    /**
     * Clear all data (for testing/reset purposes)
     */
    clearAll() {
        try {
            if (this.usingMemoryFallback) {
                this.memoryStorage.todos = [];
                this.memoryStorage.settings = this.getDefaultSettings();
            } else {
                localStorage.removeItem(this.storageKey);
                localStorage.removeItem(this.settingsKey);
                this.initializeStorage();
            }

            this.triggerStorageEvent('storage_cleared');
            return true;

        } catch (error) {
            console.error('Todo PWA: Error clearing storage:', error);
            return false;
        }
    }
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TodoStorage = TodoStorage;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = TodoStorage;
}
