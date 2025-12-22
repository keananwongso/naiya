export interface Deadline {
    id: string;
    title: string;
    course?: string;
    dueDate: string; // YYYY-MM-DD
    importance?: 'low' | 'medium' | 'high';
    completed: boolean;
    createdAt?: string;
    updatedAt?: string;
}

const DEADLINES_STORAGE_KEY = "naiya_deadlines";

/**
 * Load all deadlines from localStorage (no auth required for demo)
 */
export async function loadDeadlines(): Promise<Deadline[]> {
    try {
        if (typeof window === "undefined") return [];

        const stored = localStorage.getItem(DEADLINES_STORAGE_KEY);
        if (!stored) {
            console.log("No deadlines found in localStorage, returning empty array");
            return [];
        }

        console.log("Deadlines loaded from localStorage successfully");
        return JSON.parse(stored) as Deadline[];
    } catch (error) {
        console.error('Failed to load deadlines:', error);
        return [];
    }
}

/**
 * Save deadlines to localStorage (no auth required for demo)
 */
export async function saveDeadlines(deadlines: Deadline[]): Promise<void> {
    try {
        if (typeof window === "undefined") return;

        localStorage.setItem(DEADLINES_STORAGE_KEY, JSON.stringify(deadlines));
        console.log(`Saved ${deadlines.length} deadlines to localStorage`);
    } catch (error) {
        console.error('Failed to save deadlines:', error);
        throw error;
    }
}

/**
 * Toggle a deadline's completed status
 */
export async function toggleDeadlineComplete(id: string, completed: boolean): Promise<void> {
    try {
        const deadlines = await loadDeadlines();
        const updated = deadlines.map(d =>
            d.id === id ? { ...d, completed, updatedAt: new Date().toISOString() } : d
        );
        await saveDeadlines(updated);
    } catch (error) {
        console.error('Failed to toggle deadline:', error);
        throw error;
    }
}

/**
 * Add a new deadline
 */
export async function addDeadline(deadline: Omit<Deadline, 'id' | 'createdAt' | 'updatedAt'>): Promise<Deadline> {
    try {
        const newDeadline: Deadline = {
            id: crypto.randomUUID(),
            title: deadline.title,
            course: deadline.course,
            dueDate: deadline.dueDate,
            importance: deadline.importance,
            completed: deadline.completed,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        const deadlines = await loadDeadlines();
        await saveDeadlines([...deadlines, newDeadline]);

        return newDeadline;
    } catch (error) {
        console.error('Failed to add deadline:', error);
        throw error;
    }
}

/**
 * Delete a deadline
 */
export async function deleteDeadline(id: string): Promise<void> {
    try {
        const deadlines = await loadDeadlines();
        const filtered = deadlines.filter(d => d.id !== id);
        await saveDeadlines(filtered);
    } catch (error) {
        console.error('Failed to delete deadline:', error);
        throw error;
    }
}
