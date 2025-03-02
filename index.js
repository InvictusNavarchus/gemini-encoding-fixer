// ==UserScript==
// @name         Fix Gemini Encoding
// @namespace    http://tampermonkey.net/
// @version      1.2
// @description  Replaces literal text "<sub>[char]</sub>" with actual subscript characters and decodes UTF-8 hex sequences
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
        log(`Converting subscript: "${content}"`);

        let result = '';
        for (let i = 0; i < content.length; i++) {
            const char = content[i];
            result += subscriptMap[char] || char;
        }

        log(`Converted "${match}" to "${result}"`);
        return result;
    }
    
    // Function to decode UTF-8 hex sequences like <0xE2><0x82><0x99>
    function decodeUtf8HexSequence(match) {
        log(`Decoding UTF-8 hex: "${match}"`);
        
        // Extract all hex values
        const hexValues = match.match(/<0x([0-9A-F]{2})>/gi).map(hex => 
            parseInt(hex.substring(3, 5), 16)
        );
        
        // Convert hex array to UTF-8 character
        try {
            // Create a buffer from the hex values and decode as UTF-8
            const bytes = new Uint8Array(hexValues);
            const decoder = new TextDecoder('utf-8');
            const result = decoder.decode(bytes);
            
            log(`Decoded "${match}" to "${result}"`);
            return result;
        } catch (error) {
            log(`Error decoding "${match}": ${error.message}`);
            return match; // Return the original match if decoding fails
        }
    }

    // Function to replace the literal <sub>[char]</sub> text and UTF-8 hex sequences in a text node
    function replaceInTextNode(textNode) {
        if (!textNode || !textNode.nodeValue) return;

        const text = textNode.nodeValue;
        if (!text.includes('<sub>') && !text.includes('<0x')) return;

        log(`Processing text node: "${text.substring(0, 50)}${text.length > 50 ? '...' : ''}"`);

        // Regex to match <sub>x</sub> as literal text
        const subRegex = /<sub>([^<]+)<\/sub>/g;
        
        // Regex to match UTF-8 hex sequences like <0xE2><0x82><0x99>
        // This looks for consecutive hex byte patterns
        const hexRegex = /(?:<0x[0-9A-F]{2}>)+/gi;

        // First replace subscript notation
        let newText = text;
        if (text.includes('<sub>')) {
            newText = text.replace(subRegex, (match, content) => {
                return convertToSubscript(match, content);
            });
        }
        
        // Then replace UTF-8 hex sequences, being careful with combining marks
        if (text.includes('<0x')) {
            // We first need to do a complete scan to handle combining characters properly
            // This approach processes the entire text at once to maintain character relationships
            const processedChunks = [];
            let lastIndex = 0;
            let match;
            
            while ((match = hexRegex.exec(newText)) !== null) {
                // Add text before the match
                processedChunks.push(newText.substring(lastIndex, match.index));
                
                // Add the decoded hex sequence
                const decoded = decodeUtf8HexSequence(match[0]);
                processedChunks.push(decoded);
                
                lastIndex = match.index + match[0].length;
            }
            
            // Add any remaining text
            if (lastIndex < newText.length) {
                processedChunks.push(newText.substring(lastIndex));
            }
            
            // Join all the chunks
            newText = processedChunks.join('');
            
            // Now normalize the string to ensure combining characters are properly applied
            // This is essential for characters like <0xE2><0x81><0xAF> (macron)
            newText = newText.normalize('NFC');
        }

        // Only update if changes were made
        if (newText !== text) {
            log(`Replacing with: "${newText.substring(0, 50)}${newText.length > 50 ? '...' : ''}"`);
            textNode.nodeValue = newText;
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
        window._geminiEncodingFixer = {
            processDocument: processDocument,
            replaceInText: (text) => {
                const subRegex = /<sub>([^<]+)<\/sub>/g;
                const hexRegex = /(?:<0x[0-9A-F]{2}>)+/gi;
                
                // First handle subscripts
                let result = text.replace(subRegex, convertToSubscript);
                
                // Then handle hex sequences
                const processedChunks = [];
                let lastIndex = 0;
                let match;
                
                while ((match = hexRegex.exec(result)) !== null) {
                    processedChunks.push(result.substring(lastIndex, match.index));
                    processedChunks.push(decodeUtf8HexSequence(match[0]));
                    lastIndex = match.index + match[0].length;
                }
                
                if (lastIndex < result.length) {
                    processedChunks.push(result.substring(lastIndex));
                }
                
                result = processedChunks.join('').normalize('NFC');
                return result;
            },
            toggleDebug: () => {
                window._geminiEncodingFixer.debug = !window._geminiEncodingFixer.debug;
                // This assignment does nothing due to closure, but we keep it for API consistency
                DEBUG = window._geminiEncodingFixer.debug;
                log(`Debug mode ${window._geminiEncodingFixer.debug ? 'enabled' : 'disabled'}`);
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