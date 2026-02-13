/**
 * menuHandlers.js - This file is part of the NOB web project.
 * 
 * Handles menu interactions including submenu toggles and the About modal.
 * 
 * Created: 02/2026
 * Authors: Pero & Github Copilot
 */

// Track if modal escape listener has been added
let modalEscapeListenerAdded = false;

/**
 * Initialize menu handlers for submenus and modals
 */
export function initializeMenuHandlers() {
    // Formations submenu toggle
    const formationsButton = document.getElementById('toggleFormations');
    const formationsSubmenu = document.getElementById('formationsSubmenu');
    
    if (formationsButton && formationsSubmenu) {
        formationsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSubmenu(formationsSubmenu, formationsButton);
            // Close other submenus
            const campaignsSubmenu = document.getElementById('campaignsSubmenu');
            if (campaignsSubmenu) {
                campaignsSubmenu.classList.remove('active');
                document.getElementById('toggleCampaigns')?.classList.remove('active');
            }
        });
    }
    
    // Campaigns submenu toggle
    const campaignsButton = document.getElementById('toggleCampaigns');
    const campaignsSubmenu = document.getElementById('campaignsSubmenu');
    
    if (campaignsButton && campaignsSubmenu) {
        campaignsButton.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleSubmenu(campaignsSubmenu, campaignsButton);
            // Close other submenus
            const formationsSubmenu = document.getElementById('formationsSubmenu');
            if (formationsSubmenu) {
                formationsSubmenu.classList.remove('active');
                document.getElementById('toggleFormations')?.classList.remove('active');
            }
        });
    }
    
    // About button
    const aboutButton = document.getElementById('toggleAbout');
    if (aboutButton) {
        aboutButton.addEventListener('click', () => {
            showAboutModal();
        });
    }
    
    // Close submenus when clicking outside
    document.addEventListener('click', (e) => {
        const menuSection = document.querySelector('.menu-section');
        if (menuSection && !menuSection.contains(e.target)) {
            closeAllSubmenus();
        }
    });
    
    // Add global Escape key listener for About modal (only once)
    if (!modalEscapeListenerAdded) {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                const modal = document.getElementById('aboutModal');
                if (modal && modal.style.display === 'flex') {
                    modal.style.display = 'none';
                }
            }
        });
        modalEscapeListenerAdded = true;
    }
}

/**
 * Toggle submenu visibility
 */
function toggleSubmenu(submenu, button) {
    const isActive = submenu.classList.contains('active');
    
    if (isActive) {
        submenu.classList.remove('active');
        button.classList.remove('active');
    } else {
        submenu.classList.add('active');
        button.classList.add('active');
    }
}

/**
 * Close all submenus
 */
function closeAllSubmenus() {
    const submenus = document.querySelectorAll('.submenu');
    submenus.forEach(submenu => submenu.classList.remove('active'));
    
    const menuButtons = document.querySelectorAll('.menu-button');
    menuButtons.forEach(button => button.classList.remove('active'));
}

/**
 * Show the About modal with content from about.md
 */
function showAboutModal() {
    // Create modal if it doesn't exist
    let modal = document.getElementById('aboutModal');
    if (!modal) {
        modal = createAboutModal();
        document.body.appendChild(modal);
    }
    
    // Fetch and display content
    fetch('assets/about.md')
        .then(response => response.text())
        .then(markdown => {
            const modalContent = modal.querySelector('.about-modal-content');
            if (modalContent && typeof marked !== 'undefined') {
                modalContent.innerHTML = marked.parse(markdown);
            }
            modal.style.display = 'flex';
        })
        .catch(error => {
            console.error('Error loading about content:', error);
            const modalContent = modal.querySelector('.about-modal-content');
            if (modalContent) {
                modalContent.innerHTML = '<h2>About NOB Map Project</h2><p>Error loading content.</p>';
            }
            modal.style.display = 'flex';
        });
}

/**
 * Create the About modal structure
 */
function createAboutModal() {
    const modal = document.createElement('div');
    modal.id = 'aboutModal';
    modal.className = 'about-modal';
    
    modal.innerHTML = `
        <div class="about-modal-dialog">
            <div class="about-modal-header">
                <h2>About NOB Map Project</h2>
                <button class="about-modal-close" aria-label="Close">&times;</button>
            </div>
            <div class="about-modal-body">
                <div class="about-modal-content">
                    Loading...
                </div>
            </div>
        </div>
    `;
    
    // Close button handler
    const closeButton = modal.querySelector('.about-modal-close');
    if (closeButton) {
        closeButton.addEventListener('click', () => {
            modal.style.display = 'none';
        });
    }
    
    // Close on outside click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    });
    
    return modal;
}

/**
 * Export function to close submenus (for mobile menu integration)
 */
export function closeSubmenus() {
    closeAllSubmenus();
}
