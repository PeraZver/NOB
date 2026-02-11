/**
 * menu.js - Mobile menu functionality
 * 
 * Handles hamburger menu toggle for mobile devices only (≤768px)
 * Desktop functionality remains unchanged
 */

// Only run on mobile devices
function isMobile() {
    return window.innerWidth <= 768;
}

// Wait for DOM to be ready
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menu-toggle');
    const menuWrapper = document.querySelector('.menu-wrapper');
    const menuItems = document.querySelectorAll('#main-menu-list li');
    
    if (!menuToggle || !menuWrapper) {
        return; // Exit if elements don't exist
    }

    // Toggle menu on button click
    menuToggle.addEventListener('click', function() {
        if (!isMobile()) return; // Only work on mobile
        
        const isActive = menuWrapper.classList.contains('active');
        
        if (isActive) {
            // Close menu
            menuWrapper.classList.remove('active');
            menuToggle.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
        } else {
            // Open menu
            menuWrapper.classList.add('active');
            menuToggle.classList.add('active');
            menuToggle.setAttribute('aria-expanded', 'true');
            
            // Focus on search box when menu opens
            const searchBox = document.getElementById('search-box');
            if (searchBox) {
                setTimeout(() => searchBox.focus(), 300);
            }
        }
    });

    // Close menu when clicking outside
    document.addEventListener('click', function(event) {
        if (!isMobile()) return; // Only work on mobile
        
        if (menuWrapper.classList.contains('active')) {
            if (!menuWrapper.contains(event.target) && !menuToggle.contains(event.target)) {
                menuWrapper.classList.remove('active');
                menuToggle.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            }
        }
    });

    // Close menu on Escape key
    document.addEventListener('keydown', function(event) {
        if (!isMobile()) return; // Only work on mobile
        
        if (event.key === 'Escape' && menuWrapper.classList.contains('active')) {
            menuWrapper.classList.remove('active');
            menuToggle.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
            menuToggle.focus();
        }
    });

    // Close menu when menu item is clicked (on mobile only)
    const mainMenuItems = document.querySelectorAll('.menu li');
    mainMenuItems.forEach(item => {
        item.addEventListener('click', function() {
            if (!isMobile()) return; // Only work on mobile
            
            // Don't close if clicking calendar button
            if (item.classList.contains('calendar-button')) {
                return;
            }
            
            // Close menu after selection
            setTimeout(() => {
                menuWrapper.classList.remove('active');
                menuToggle.classList.remove('active');
                menuToggle.setAttribute('aria-expanded', 'false');
            }, 100);
        });
    });

    // Handle window resize
    window.addEventListener('resize', function() {
        if (window.innerWidth > 768) {
            // On desktop, ensure menu is not in mobile state
            menuWrapper.classList.remove('active');
            menuToggle.classList.remove('active');
            menuToggle.setAttribute('aria-expanded', 'false');
        }
    });
});
