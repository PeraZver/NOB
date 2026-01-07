/**
 * menu.js - This file is part of the NOB web project.
 * 
 * Handles responsive menu toggle functionality for mobile devices.
 * Includes accessibility features (ARIA attributes, keyboard navigation).
 * 
 * Created: 01/2026
 * Authors: Pero & Github Copilot
 */

// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', function() {
    const menuToggle = document.getElementById('menu-toggle');
    const menuWrapper = document.querySelector('.menu-wrapper');
    const menuSection = document.getElementById('menu-section');

    // Function to toggle menu
    function toggleMenu() {
        const isOpen = menuWrapper.classList.contains('active');
        
        if (isOpen) {
            closeMenu();
        } else {
            openMenu();
        }
    }

    // Function to open menu
    function openMenu() {
        menuWrapper.classList.add('active');
        menuToggle.classList.add('active');
        menuToggle.setAttribute('aria-expanded', 'true');
        
        // Focus first menu item for accessibility
        const firstMenuItem = menuSection.querySelector('li, input');
        if (firstMenuItem) {
            firstMenuItem.focus();
        }
    }

    // Function to close menu
    function closeMenu() {
        menuWrapper.classList.remove('active');
        menuToggle.classList.remove('active');
        menuToggle.setAttribute('aria-expanded', 'false');
    }

    // Toggle menu on button click
    if (menuToggle) {
        menuToggle.addEventListener('click', function(e) {
            e.stopPropagation();
            toggleMenu();
        });
    }

    // Close menu when clicking outside
    document.addEventListener('click', function(e) {
        const isClickInsideMenu = menuWrapper.contains(e.target);
        const isClickOnToggle = menuToggle.contains(e.target);
        
        if (!isClickInsideMenu && !isClickOnToggle && menuWrapper.classList.contains('active')) {
            closeMenu();
        }
    });

    // Keyboard navigation
    document.addEventListener('keydown', function(e) {
        // Close menu on Escape key
        if (e.key === 'Escape' && menuWrapper.classList.contains('active')) {
            closeMenu();
            menuToggle.focus();
        }
    });

    // Handle Enter key on menu toggle button
    if (menuToggle) {
        menuToggle.addEventListener('keydown', function(e) {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleMenu();
            }
        });
    }

    // Close menu when a menu item is clicked (on mobile)
    const menuItems = document.querySelectorAll('.menu li');
    menuItems.forEach(item => {
        item.addEventListener('click', function() {
            // Check if we're on mobile by checking if menu toggle is visible
            if (window.getComputedStyle(menuToggle).display !== 'none') {
                // Small delay to allow the action to register before closing
                setTimeout(() => {
                    closeMenu();
                }, 300);
            }
        });
    });

    // Handle window resize - close menu if resizing to desktop
    let resizeTimer;
    window.addEventListener('resize', function() {
        clearTimeout(resizeTimer);
        resizeTimer = setTimeout(function() {
            // If resized to desktop view, close mobile menu
            if (window.innerWidth > 768 && menuWrapper.classList.contains('active')) {
                closeMenu();
            }
        }, 250);
    });
});
