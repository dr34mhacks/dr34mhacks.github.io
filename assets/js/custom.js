// Custom JavaScript to force Monaco font on code blocks
document.addEventListener('DOMContentLoaded', function() {
  // Create a style element
  const style = document.createElement('style');
  
  // Set the CSS content
  style.textContent = `
    /* Override Bootstrap variables */
    :root {
      --bs-font-monospace: 'Monaco', monospace !important;
    }
    
    /* Force Monaco font for all code elements */
    code, pre, .highlight, .highlight pre, pre.highlight, .language-plaintext {
      font-family: 'Monaco', monospace !important;
    }
    
    /* Ensure code blocks have proper styling */
    .highlight pre {
      font-family: 'Monaco', monospace !important;
    }
  `;
  
  // Append the style element to the head
  document.head.appendChild(style);
  
  // Directly set the font-family on all code elements
  const codeElements = document.querySelectorAll('code, pre, .highlight, .highlight pre');
  codeElements.forEach(element => {
    element.style.fontFamily = "'Monaco', monospace";
  });
});