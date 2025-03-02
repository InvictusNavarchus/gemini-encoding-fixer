# Gemini Encoding Fixer

## Description

The Gemini Encoding Fixer is a userscript designed to enhance the readability of chats on [Gemini](https://gemini.google.com/app/). It addresses common encoding issues by:

-   Converting `<sub>[char]</sub>` sequences into their corresponding subscript characters.
-   Decoding UTF-8 hex sequences (e.g., `<0xE2><0x82><0x99>`) into readable characters, including special handling for combining marks like the macron.

## Features

-   **Subscript Conversion:** Automatically converts subscript notations into actual subscript characters, improving the display of mathematical or chemical formulas.
-   **UTF-8 Hex Decoding:** Decodes UTF-8 hex sequences, resolving encoding glitches and displaying the intended characters.
-   **Combining Mark Handling:** Intelligently handles combining marks to ensure proper rendering of diacritics and accents.
-   **Dynamic Content Support:** Uses a MutationObserver to automatically process new content added to the page, ensuring that encoding fixes are applied to dynamically loaded chat messages.
-   **Debug Mode:** Includes a debug mode with console logging for troubleshooting and development.
-   **On-demand Text Processing:** Exposes a function to process text strings directly, useful for debugging or custom integrations.

## Installation

1.  Install a userscript manager such as [Tampermonkey](https://www.tampermonkey.net/) for your browser.
2.  Copy the code from [index.js](index.js).
3.  Create a new userscript in Tampermonkey and paste the code.
4.  The script will automatically run on pages matching the `@match` rule: `https://gemini.google.com/app/*`.

## Usage

Once installed, the script runs automatically on Gemini chats. It fixes encoding issues in real-time, so no manual intervention is required.

### Debug Mode

To enable debug mode:

1.  Open the browser's developer console.
2.  Type `window._geminiEncodingFixer.toggleDebug()` and press Enter.
3.  Debug messages will now be logged to the console.
4.  To disable debug mode, repeat the process.

### Manual Text Processing

To process a text string manually:

1.  Open the browser's developer console.
2.  Type `window._geminiEncodingFixer.replaceInText("your text here")` and press Enter.
3.  The processed text will be returned.

## Contributing

Contributions are welcome! Please feel free to submit pull requests or open issues for bug fixes, new features, or improvements to the documentation.

## License

This project is open source and available under the MIT License.
