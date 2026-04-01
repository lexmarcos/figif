import sys

def replace_in_file(fp, replacements):
    try:
        with open(fp, 'r') as f:
            content = f.read()
            
        for k, v in replacements.items():
            content = content.replace(k, v)
            
        with open(fp, 'w') as f:
            f.write(content)
        print(f"Updated {fp}")
    except Exception as e:
        print(f"Error {fp}: {e}")

replacements_css = {
    '--bg-primary: #050505;': '--color-background: #000000;',
    'var(--bg-primary)': 'var(--color-background)',
    
    '--color-neon-lime: #ccff00;': '--color-primary: #CCFF00;\n  --color-secondary: #ffffff;\n  --color-tertiary: #0091ff;',
    '--color-neon-cyan: #00e5ff;': '/* removed cyan */',
    
    'var(--color-neon-lime)': 'var(--color-primary)',
    'var(--color-neon-cyan)': 'var(--color-tertiary)',
    
    '--shadow-bloom-lime': '--shadow-bloom-primary',
    '--shadow-bloom-cyan': '--shadow-bloom-tertiary',
    
    'rgba(0, 229, 255': 'rgba(0, 145, 255',
    '#00e5ff': '#0091ff',
    
    '--text-primary: #ffffff;': '--text-primary: var(--color-secondary);',
    '--text-accent: var(--color-neon-cyan);': '--text-accent: var(--color-tertiary);',
}

replacements_svelte = {
    'var(--color-neon-lime)': 'var(--color-primary)',
    'var(--color-neon-cyan)': 'var(--color-tertiary)',
    'var(--bg-primary)': 'var(--color-background)'
}

replace_in_file('src/app.css', replacements_css)
replace_in_file('src/lib/HomeScreen.svelte', replacements_svelte)
