import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

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

/**
 * Load all deadlines for the current user from Supabase
 */
export async function loadDeadlines(): Promise<Deadline[]> {
    try {
        const { data, error } = await supabase
            .from('deadlines')
            .select('*')
            .order('due_date', { ascending: true });

        if (error) {
            console.error('Error loading deadlines from Supabase:', error);
            throw error;
        }

        // Map database columns to our Deadline interface
        return (data || []).map((row: any) => ({
            id: row.id,
            title: row.title,
            course: row.course,
            dueDate: row.due_date,
            importance: row.importance,
            completed: row.completed || false,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        }));
    } catch (error) {
        console.error('Failed to load deadlines:', error);
        return [];
    }
}

/**
 * Save deadlines to Supabase
 */
export async function saveDeadlines(deadlines: Deadline[]): Promise<void> {
    try {
        // Delete all existing deadlines for this user
        const { error: deleteError } = await supabase
            .from('deadlines')
            .delete()
            .neq('id', '00000000-0000-0000-0000-000000000000'); // Delete all

        if (deleteError) {
            console.error('Error deleting old deadlines:', deleteError);
            throw deleteError;
        }

        // Insert new deadlines
        if (deadlines.length > 0) {
            const rows = deadlines.map(deadline => ({
                id: deadline.id,
                title: deadline.title,
                course: deadline.course,
                due_date: deadline.dueDate,
                importance: deadline.importance,
                completed: deadline.completed,
            }));

            const { error: insertError } = await supabase
                .from('deadlines')
                .insert(rows);

            if (insertError) {
                console.error('Error inserting deadlines:', insertError);
                throw insertError;
            }
        }

        console.log(`Saved ${deadlines.length} deadlines to Supabase`);
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
        const { error } = await supabase
            .from('deadlines')
            .update({ completed, updated_at: new Date().toISOString() })
            .eq('id', id);

        if (error) {
            console.error('Error updating deadline:', error);
            throw error;
        }
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
        const newDeadline = {
            title: deadline.title,
            course: deadline.course,
            due_date: deadline.dueDate,
            importance: deadline.importance,
            completed: deadline.completed,
        };

        const { data, error } = await supabase
            .from('deadlines')
            .insert([newDeadline])
            .select()
            .single();

        if (error) {
            console.error('Error adding deadline:', error);
            throw error;
        }

        return {
            id: data.id,
            title: data.title,
            course: data.course,
            dueDate: data.due_date,
            importance: data.importance,
            completed: data.completed,
            createdAt: data.created_at,
            updatedAt: data.updated_at,
        };
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
        const { error } = await supabase
            .from('deadlines')
            .delete()
            .eq('id', id);

        if (error) {
            console.error('Error deleting deadline:', error);
            throw error;
        }
    } catch (error) {
        console.error('Failed to delete deadline:', error);
        throw error;
    }
}
