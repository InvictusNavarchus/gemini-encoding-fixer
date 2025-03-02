// ==UserScript==
// @name         Fix Gemini Encoding
// @namespace    http://tampermonkey.net/
// @version      1.3.1
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
        
        // Special case handling for common UTF-8 sequences
        if (hexValues.length === 3) {
            // Handle the macron case: E2 81 AF -> U+0304 COMBINING MACRON
            if (hexValues[0] === 0xE2 && hexValues[1] === 0x81 && hexValues[2] === 0xAF) {
                log(`Detected macron overbar: "${match}" -> "̄"`);
                return '\u0304'; // COMBINING MACRON (U+0304)
            }
            
            // Handle other common 3-byte UTF-8 sequences here as needed
        }
        
        // Convert hex array to UTF-8 character
        try {
            // Create a buffer from the hex values and decode as UTF-8
            const bytes = new Uint8Array(hexValues);
            const decoder = new TextDecoder('utf-8');
            const result = decoder.decode(bytes);
            
            // Check if result is a combining mark that needs special handling
            if (result && result.length === 1) {
                const cp = result.codePointAt(0);
                
                // Map known problematic code points to correct combining marks
                // This is a fallback in case automatic detection fails
                const combiningMarkMap = {
                    0x20EF: '\u0304', // COMBINING RIGHT ARROW BELOW -> COMBINING MACRON
                    // Add more mappings as needed
                };
                
                if (combiningMarkMap[cp]) {
                    log(`Remapped combining mark from ${result} (U+${cp.toString(16).padStart(4, '0')}) to ${combiningMarkMap[cp]}`);
                    return combiningMarkMap[cp];
                }
            }
            
            log(`Decoded "${match}" to "${result}" (${Array.from(result).map(c => 'U+' + c.codePointAt(0).toString(16).padStart(4, '0')).join(', ')})`);
            return result;
        } catch (error) {
            log(`Error decoding "${match}": ${error.message}`);
            return match; // Return the original match if decoding fails
        }
    }
    
    // Helper function to check if a character is a combining mark
    function isCombiningMark(char) {
        if (!char || char.length === 0) return false;
        
        const code = char.codePointAt(0);
        
        // Specific check for COMBINING MACRON (U+0304)
        if (code === 0x0304) return true;
        
        // Unicode ranges for combining marks - expanded to include more ranges
        return (
            (code >= 0x0300 && code <= 0x036F) || // Combining Diacritical Marks
            (code >= 0x1AB0 && code <= 0x1AFF) || // Combining Diacritical Marks Extended
            (code >= 0x1DC0 && code <= 0x1DFF) || // Combining Diacritical Marks Supplement
            (code >= 0x20D0 && code <= 0x20FF) || // Combining Diacritical Marks for Symbols
            (code >= 0xFE20 && code <= 0xFE2F)    // Combining Half Marks
        );
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
            // Special handling for known patterns first
            // The macron over x is a common case in mathematical notation
            newText = newText.replace(/<0xE2><0x81><0xAF>x/g, "x\u0304"); // x with macron
            newText = newText.replace(/<0xE2><0x81><0xAF>y/g, "y\u0304"); // y with macron
            
            // General case processing
            const processedChunks = [];
            const decodedMatches = [];
            
            // Decode all hex sequences
            let match;
            while ((match = hexRegex.exec(newText)) !== null) {
                const decoded = decodeUtf8HexSequence(match[0]);
                decodedMatches.push({
                    startIndex: match.index,
                    endIndex: match.index + match[0].length,
                    originalText: match[0],
                    decodedText: decoded,
                    isCombining: isCombiningMark(decoded)
                });
            }
            
            // Process the text with awareness of combining marks
            if (decodedMatches.length > 0) {
                let lastIndex = 0;
                for (let i = 0; i < decodedMatches.length; i++) {
                    const current = decodedMatches[i];
                    
                    // Add text before this match
                    processedChunks.push(newText.substring(lastIndex, current.startIndex));
                    
                    // Handle combining marks
                    if (current.isCombining) {
                        // If there's a character after the combining mark
                        if (current.endIndex < newText.length && /\S/.test(newText[current.endIndex])) {
                            const baseChar = newText[current.endIndex];
                            processedChunks.push(baseChar + current.decodedText);
                            lastIndex = current.endIndex + 1;
                        }
                        // If there's a character before the combining mark (fallback)
                        else if (lastIndex > 0 && /\S/.test(processedChunks[processedChunks.length - 1].slice(-1))) {
                            // Append to the previous chunk's last character
                            const prevChunk = processedChunks.pop();
                            processedChunks.push(prevChunk + current.decodedText);
                            lastIndex = current.endIndex;
                        }
                        // No obvious character to combine with
                        else {
                            processedChunks.push(current.decodedText);
                            lastIndex = current.endIndex;
                        }
                    } else {
                        // Regular non-combining character
                        processedChunks.push(current.decodedText);
                        lastIndex = current.endIndex;
                    }
                }
                
                // Add any remaining text
                if (lastIndex < newText.length) {
                    processedChunks.push(newText.substring(lastIndex));
                }
                
                // Join all the chunks and normalize
                newText = processedChunks.join('');
            }
            
            // Apply Unicode normalization - try NFC first, and if that doesn't work well, try NFD
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
                
                // First handle subscripts
                let result = text.replace(subRegex, convertToSubscript);
                
                // Special case handling for common patterns
                result = result.replace(/<0xE2><0x81><0xAF>x/g, "x\u0304"); // x with macron
                result = result.replace(/<0xE2><0x81><0xAF>y/g, "y\u0304"); // y with macron
                
                // Then handle general hex sequences
                const hexRegex = /(?:<0x[0-9A-F]{2}>)+/gi;
                const processedChunks = [];
                const decodedMatches = [];
                
                // Decode all hex sequences
                let match;
                while ((match = hexRegex.exec(result)) !== null) {
                    const decoded = decodeUtf8HexSequence(match[0]);
                    decodedMatches.push({
                        startIndex: match.index,
                        endIndex: match.index + match[0].length,
                        originalText: match[0],
                        decodedText: decoded,
                        isCombining: isCombiningMark(decoded)
                    });
                }
                
                // Process with combining mark awareness
                if (decodedMatches.length > 0) {
                    let lastIndex = 0;
                    for (let i = 0; i < decodedMatches.length; i++) {
                        const current = decodedMatches[i];
                        
                        // Add text before this match
                        processedChunks.push(result.substring(lastIndex, current.startIndex));
                        
                        // Handle combining marks with improved logic
                        if (current.isCombining) {
                            if (current.endIndex < result.length && /\S/.test(result[current.endIndex])) {
                                const baseChar = result[current.endIndex];
                                processedChunks.push(baseChar + current.decodedText);
                                lastIndex = current.endIndex + 1;
                            }
                            else if (lastIndex > 0 && processedChunks.length > 0 && /\S/.test(processedChunks[processedChunks.length - 1].slice(-1))) {
                                const prevChunk = processedChunks.pop();
                                processedChunks.push(prevChunk + current.decodedText);
                                lastIndex = current.endIndex;
                            }
                            else {
                                processedChunks.push(current.decodedText);
                                lastIndex = current.endIndex;
                            }
                        } else {
                            processedChunks.push(current.decodedText);
                            lastIndex = current.endIndex;
                        }
                    }
                    
                    // Add any remaining text
                    if (lastIndex < result.length) {
                        processedChunks.push(result.substring(lastIndex));
                    }
                    
                    result = processedChunks.join('').normalize('NFC');
                }
                
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