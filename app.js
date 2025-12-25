// ============================================
// SUPABASE CONFIGURATION
// ============================================
// Supabase project credentials
// Get these from: https://app.supabase.com -> Your Project -> Settings -> API
const SUPABASE_URL = 'https://mgwbvuwqhqjpoabuafbx.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1nd2J2dXdxaHFqcG9hYnVhZmJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2Mjg0MjgsImV4cCI6MjA4MjIwNDQyOH0.XSyFzYvnmiHyN4Vl7nflw4LSr-rTjABXbVl-WNsh5K4';

// Initialize Supabase client
// This creates a client that we'll use to interact with our database
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ============================================
// GLOBAL STATE
// ============================================
let editingMemberId = null; // Track which member we're editing (null = adding new)

// ============================================
// DOM ELEMENTS
// ============================================
const memberForm = document.getElementById('member-form');
const membersTableBody = document.getElementById('members-tbody');
const messageDiv = document.getElementById('message');
const loadingDiv = document.getElementById('loading');
const formTitle = document.getElementById('form-title');
const submitBtn = document.getElementById('submit-btn');
const cancelBtn = document.getElementById('cancel-btn');

// Form input fields
const formFields = {
    full_name: document.getElementById('full_name'),
    age: document.getElementById('age'),
    gender: document.getElementById('gender'),
    phone_number: document.getElementById('phone_number'),
    email: document.getElementById('email'),
    membership_type: document.getElementById('membership_type'),
    membership_start_date: document.getElementById('membership_start_date'),
    membership_end_date: document.getElementById('membership_end_date'),
    training_level: document.getElementById('training_level'),
    status: document.getElementById('status')
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Show success or error message to user
 * @param {string} text - Message text
 * @param {string} type - 'success' or 'error'
 */
function showMessage(text, type = 'success') {
    messageDiv.textContent = text;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';

    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

/**
 * Format date for display (YYYY-MM-DD -> DD/MM/YYYY)
 * @param {string} dateString - Date string from database
 * @returns {string} Formatted date or '-' if empty
 */
function formatDate(dateString) {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} text - Text to escape
 * @returns {string} Escaped text
 */
function escapeHtml(text) {
    if (!text) return '';
    const map = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
    };
    return text.toString().replace(/[&<>"']/g, m => map[m]);
}

/**
 * Reset form to empty state
 */
function resetForm() {
    memberForm.reset();
    editingMemberId = null;
    formTitle.textContent = 'Add New Member';
    submitBtn.textContent = 'Add Member';
    cancelBtn.style.display = 'none';
}

/**
 * Populate form with member data for editing
 * @param {Object} member - Member object from database
 */
function populateForm(member) {
    formFields.full_name.value = member.full_name || '';
    formFields.age.value = member.age || '';
    formFields.gender.value = member.gender || '';
    formFields.phone_number.value = member.phone_number || '';
    formFields.email.value = member.email || '';
    formFields.membership_type.value = member.membership_type || '';
    formFields.membership_start_date.value = member.membership_start_date || '';
    formFields.membership_end_date.value = member.membership_end_date || '';
    formFields.training_level.value = member.training_level || '';
    formFields.status.value = member.status || 'Active';

    // Update UI for edit mode
    editingMemberId = member.id;
    formTitle.textContent = 'Edit Member';
    submitBtn.textContent = 'Update Member';
    cancelBtn.style.display = 'inline-block';

    // Scroll to form
    document.querySelector('.form-section').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ============================================
// CRUD OPERATIONS - CREATE
// ============================================

/**
 * CREATE: Add a new member to the database
 * @param {Object} memberData - Member data object
 */
async function createMember(memberData) {
    try {
        // Use Supabase .insert() method to add a new row
        // .insert() accepts an array of objects (even though we're only adding one)
        const { data, error } = await supabase
            .from('member')  // Table name in Supabase
            .insert([memberData])  // Insert data as array
            .select();  // Return the inserted data

        if (error) {
            throw error;
        }

        showMessage('Member added successfully!', 'success');
        resetForm();
        await fetchMembers(); // Refresh the table
        return data[0];

    } catch (error) {
        console.error('Error creating member:', error);
        showMessage(`Error adding member: ${error.message}`, 'error');
        throw error;
    }
}

// ============================================
// CRUD OPERATIONS - READ
// ============================================

/**
 * READ: Fetch all members from the database
 */
async function fetchMembers() {
    try {
        loadingDiv.style.display = 'block';

        // Use Supabase .select() to get all rows
        // .order() sorts by created_at in descending order (newest first)
        const { data, error } = await supabase
            .from('member')  // Table name
            .select('*')  // Select all columns
            .order('created_at', { ascending: false });  // Order by creation date

        if (error) {
            throw error;
        }

        displayMembers(data || []);
        loadingDiv.style.display = 'none';

    } catch (error) {
        console.error('Error fetching members:', error);
        showMessage(`Error loading members: ${error.message}`, 'error');
        loadingDiv.style.display = 'none';
        membersTableBody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-state">
                    <p>Error loading members. Please check your Supabase connection.</p>
                </td>
            </tr>
        `;
    }
}

/**
 * Display members in the table
 * @param {Array} members - Array of member objects
 */
function displayMembers(members) {
    if (members.length === 0) {
        membersTableBody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-state">
                    <p>No members found. Add your first member to get started!</p>
                </td>
            </tr>
        `;
        return;
    }

    // Create table rows for each member
    membersTableBody.innerHTML = members.map(member => `
        <tr>
            <td>${escapeHtml(member.full_name)}</td>
            <td>${member.age || '-'}</td>
            <td>${escapeHtml(member.gender || '-')}</td>
            <td>${escapeHtml(member.phone_number || '-')}</td>
            <td>${escapeHtml(member.email)}</td>
            <td>${escapeHtml(member.membership_type || '-')}</td>
            <td>${escapeHtml(member.training_level || '-')}</td>
            <td>
                <span class="status-badge ${(member.status || 'Active').toLowerCase()}">
                    ${escapeHtml(member.status || 'Active')}
                </span>
            </td>
            <td>${formatDate(member.membership_start_date)}</td>
            <td>${formatDate(member.membership_end_date)}</td>
            <td class="action-buttons">
                <button class="btn btn-edit" onclick="handleEdit('${member.id}')">
                    Edit
                </button>
                <button class="btn btn-delete" onclick="handleDelete('${member.id}', '${escapeHtml(member.full_name)}')">
                    Delete
                </button>
            </td>
        </tr>
    `).join('');
}

// ============================================
// CRUD OPERATIONS - UPDATE
// ============================================

/**
 * UPDATE: Update an existing member in the database
 * @param {string} id - Member ID (UUID)
 * @param {Object} memberData - Updated member data
 */
async function updateMember(id, memberData) {
    try {
        // Use Supabase .update() to modify existing row
        // .eq() filters by ID (id = memberId)
        // .select() returns the updated data
        const { data, error } = await supabase
            .from('member')  // Table name
            .update(memberData)  // Update with new data
            .eq('id', id)  // Where id equals the member's id
            .select();  // Return updated row

        if (error) {
            throw error;
        }

        showMessage('Member updated successfully!', 'success');
        resetForm();
        await fetchMembers(); // Refresh the table
        return data[0];

    } catch (error) {
        console.error('Error updating member:', error);
        showMessage(`Error updating member: ${error.message}`, 'error');
        throw error;
    }
}

// ============================================
// CRUD OPERATIONS - DELETE
// ============================================

/**
 * DELETE: Remove a member from the database
 * @param {string} id - Member ID (UUID)
 * @param {string} name - Member name (for confirmation message)
 */
async function deleteMember(id, name) {
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete ${name}? This action cannot be undone.`)) {
        return;
    }

    try {
        // Use Supabase .delete() to remove a row
        // .eq() filters by ID
        const { error } = await supabase
            .from('member')  // Table name
            .delete()  // Delete operation
            .eq('id', id);  // Where id equals the member's id

        if (error) {
            throw error;
        }

        showMessage(`${name} has been deleted successfully.`, 'success');
        await fetchMembers(); // Refresh the table

    } catch (error) {
        console.error('Error deleting member:', error);
        showMessage(`Error deleting member: ${error.message}`, 'error');
    }
}

// ============================================
// EVENT HANDLERS
// ============================================

/**
 * Handle form submission (both Add and Update)
 */
memberForm.addEventListener('submit', async (e) => {
    e.preventDefault(); // Prevent page refresh

    // Gather form data
    const memberData = {
        full_name: formFields.full_name.value.trim(),
        age: formFields.age.value ? parseInt(formFields.age.value) : null,
        gender: formFields.gender.value || null,
        phone_number: formFields.phone_number.value.trim() || null,
        email: formFields.email.value.trim(),
        membership_type: formFields.membership_type.value || null,
        membership_start_date: formFields.membership_start_date.value || null,
        membership_end_date: formFields.membership_end_date.value || null,
        training_level: formFields.training_level.value || null,
        status: formFields.status.value || 'Active'
    };

    try {
        if (editingMemberId) {
            // UPDATE: If we're editing, update the existing member
            await updateMember(editingMemberId, memberData);
        } else {
            // CREATE: If we're not editing, create a new member
            await createMember(memberData);
        }
    } catch (error) {
        // Error is already handled in createMember/updateMember
        console.error('Form submission error:', error);
    }
});

/**
 * Handle cancel button click (exit edit mode)
 */
cancelBtn.addEventListener('click', () => {
    resetForm();
    showMessage('Edit cancelled.', 'success');
});

/**
 * Handle edit button click
 * @param {string} id - Member ID to edit
 */
async function handleEdit(id) {
    try {
        // First, fetch the member data
        const { data, error } = await supabase
            .from('member')
            .select('*')
            .eq('id', id)
            .single();  // .single() returns one row instead of an array

        if (error) {
            throw error;
        }

        if (data) {
            populateForm(data);
        }

    } catch (error) {
        console.error('Error fetching member for edit:', error);
        showMessage(`Error loading member: ${error.message}`, 'error');
    }
}

/**
 * Handle delete button click
 * @param {string} id - Member ID to delete
 * @param {string} name - Member name for confirmation
 */
function handleDelete(id, name) {
    deleteMember(id, name);
}

// ============================================
// INITIALIZATION
// ============================================

// Load members when page loads
document.addEventListener('DOMContentLoaded', () => {
    // Check if Supabase credentials are configured
    if (SUPABASE_URL === 'YOUR_SUPABASE_PROJECT_URL' || SUPABASE_ANON_KEY === 'YOUR_SUPABASE_ANON_KEY') {
        showMessage('⚠️ Please configure your Supabase credentials in app.js before using the app.', 'error');
    } else {
        fetchMembers();
    }
});
