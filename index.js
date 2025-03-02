// ==UserScript==
// @name         Fix Gemini Encoding
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Replaces literal text "<sub>[char]</sub>" with actual subscript characters
// @author       invictus
// @match        https://gemini.google.com/app/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(function() {
    'use strict';

    // Debug mode - set to true for console logging
    const DEBUG = true;

    function log(message, data) {
        if (!DEBUG) return;
        if (data !== undefined) {
            console.log(`[Subscript Replacer] ${message}`, data);
        } else {
            console.log(`[Subscript Replacer] ${message}`);
        }
    }

    // Mapping of regular characters to their subscript equivalents
    const subscriptMap = {
        '0': '₀',
        '1': '₁',
        '2': '₂',
        '3': '₃',
        '4': '₄',
        '5': '₅',
        '6': '₆',
        '7': '₇',
        '8': '₈',
        '9': '₉',
        '+': '₊',
        '-': '₋',
        '=': '₌',
        '(': '₍',
        ')': '₎',
        'a': 'ₐ',
        'e': 'ₑ',
        'h': 'ₕ',
        'i': 'ᵢ',
        'j': 'ⱼ',
        'k': 'ₖ',
        'l': 'ₗ',
        'm': 'ₘ',
        'n': 'ₙ',
        'o': 'ₒ',
        'p': 'ₚ',
        'r': 'ᵣ',
        's': 'ₛ',
        't': 'ₜ',
        'u': 'ᵤ',
        'v': 'ᵥ',
        'x': 'ₓ'
    };

    log("Script initialized");

    // Function to convert the matched content to subscript
    function convertToSubscript(match, content) {
        log(`Converting: "${content}"`);

        let result = '';
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            result += subscriptMap[char] || char;
        }

        log(`Converted "${match}" to "${result}"`);
        return result;
    }

    // Function to replace the literal <sub>[char]</sub> text in a text node
    function replaceInTextNode(textNode) {
        if (!textNode || !textNode.nodeValue) return;

        const text = textNode.nodeValue;
        if (!text.includes('<sub>')) return;

        log(`Processing text node: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

        // Regex to match <sub>x</sub> as literal text
        const regex = /<sub>([^<]+)<\/sub>/g;

        // If we find matches, replace them
        if (regex.test(text)) {
            // Reset regex (since we used test)
            regex.lastIndex = 0;

            // Replace all occurrences
            const newText = text.replace(regex, (match, content) => {
                return convertToSubscript(match, content);
            });

            // Only update if changes were made
            if (newText !== text) {
                log(`Replacing with: "${newText.substring(0, 50)}${newText.length > 50 ? '...' : ''}"`);
                textNode.nodeValue = newText;
            }
        }
    }

    // Recursive function to walk through all text nodes
    function walkTextNodes(node) {
        if (!node) return;

        // Process this node if it's a text node
        if (node.nodeType === Node.TEXT_NODE) {
            replaceInTextNode(node);
            return;
        }

        // Skip script and style tags
        if (node.nodeName === 'SCRIPT' || node.nodeName === 'STYLE') {
            return;
        }

        // Recurse for child nodes
        const children = node.childNodes;
        for (let i = 0; i < children.length; i++) {
            walkTextNodes(children[i]);
        }
    }

    // Main function to process the document
    function processDocument() {
        log("Starting document processing");
        walkTextNodes(document.body);
        log("Document processing complete");
    }

    // Run when the document is fully loaded
    function onDocumentReady() {
        log("Document ready");

        // Initial processing
        processDocument();

        // Set up a MutationObserver to handle dynamically added content
        const observer = new MutationObserver(mutations => {
            log(`Observed ${mutations.length} mutations`);

            mutations.forEach(mutation => {
                if (mutation.type === 'childList') {
                    mutation.addedNodes.forEach(node => {
                        walkTextNodes(node);
                    });
                } else if (mutation.type === 'characterData') {
                    // Handle changes to text nodes directly
                    replaceInTextNode(mutation.target);
                }
            });
        });

        // Start observing
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
        });

        log("MutationObserver set up");

        // Add debug object to window
        window._subscriptReplacer = {
            processDocument: processDocument,
            replaceInText: (text) => {
                return text.replace(/<sub>([^<]+)<\/sub>/g, convertToSubscript);
            },
            toggleDebug: () => {
                window._subscriptReplacer.debug = !window._subscriptReplacer.debug;
                // This assignment does nothing due to closure, but we keep it for API consistency
                DEBUG = window._subscriptReplacer.debug;
                log(`Debug mode ${window._subscriptReplacer.debug ? 'enabled' : 'disabled'}`);
            },
            debug: DEBUG
        };
    }

    // Wait for document to be ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', onDocumentReady);
    } else {
        onDocumentReady();
    }

    log("Script load complete");
})();