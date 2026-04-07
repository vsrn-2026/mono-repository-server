import { CacheService } from '../cache/CacheService';

/**
 * Example: Cache-Aside Pattern
 * 
 * This example shows how to use the cache service in a controller/service.
 * The cache automatically falls back to in-memory storage if Redis is unavailable.
 */

interface User {
    id: string;
    name: string;
    email: string;
}

export class UserService {
    /**
     * Get user by ID with caching
     */
    async getUserById(userId: string): Promise<User | null> {
        // Try cache first
        const cached = await CacheService.get<User>('users', userId);
        if (cached) {
            return cached;
        }

        // Fetch from database (example)
        const user = await this.fetchUserFromDatabase(userId);
        
        // Cache for 5 minutes
        if (user) {
            await CacheService.set('users', userId, user, 300);
        }
        
        return user;
    }

    /**
     * Update user and invalidate cache
     */
    async updateUser(userId: string, data: Partial<User>): Promise<User> {
        // Update database (example)
        const user = await this.updateUserInDatabase(userId, data);
        
        // Invalidate cache
        await CacheService.invalidate('users', userId);
        
        return user;
    }

    /**
     * Check if Redis is available
     */
    isRedisHealthy(): boolean {
        return CacheService.isRedisAvailable();
    }

    // Mock database methods
    private async fetchUserFromDatabase(_userId: string): Promise<User | null> {
        // Replace with actual database call
        return null;
    }

    private async updateUserInDatabase(userId: string, data: Partial<User>): Promise<User> {
        // Replace with actual database call
        return { id: userId, name: '', email: '', ...data };
    }
}
