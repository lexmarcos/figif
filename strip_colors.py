import re
import os

with open("src/app.css", "r") as f:
    css = f.read()

# 1. Remove pink, purple, orange declarations
css = re.sub(r'--color-neon-pink: .*?;\n\s*', '', css)
css = re.sub(r'--color-neon-purple: .*?;\n\s*', '', css)
css = re.sub(r'--color-neon-orange: .*?;\n\s*', '', css)

# 1.1 Remove bloom declarations
css = re.sub(r'--shadow-bloom-pink: .*?;\n\s*', '', css)
css = re.sub(r'--shadow-bloom-orange: .*?;\n\s*', '', css)

# 2. Add shadow-bloom-secondary and tertiary in place if missing
if '--shadow-bloom-secondary' not in css:
    css = css.replace('--shadow-bloom-tertiary:', '--shadow-bloom-secondary: 0 0 24px rgba(255, 255, 255, 0.35);\n  --shadow-bloom-tertiary:')

# 3. Replace usages of pink
# In .btn-danger
css = css.replace('var(--color-neon-pink)', 'var(--color-secondary)')
css = css.replace('var(--shadow-bloom-pink)', 'var(--shadow-bloom-secondary)')

# In .video-preview__remove-btn specifically (hover/active hex colors)
css = css.replace('#ff3377', '#f2f2f2') # hover
css = css.replace('rgba(255, 0, 85, 0.4)', 'rgba(255, 255, 255, 0.4)')
css = css.replace('#cc0044', '#d9d9d9') # active

# For crop handles specifically, using secondary is fine too (white borders)
# Actually, white is a good high-contrast color for handles. We'll leave it as secondary since we mapped var(--color-neon-pink) to secondary above.
# The hardcoded rgba for handles:
css = css.replace('rgba(255, 0, 85, 0.5)', 'rgba(255, 255, 255, 0.5)')

# 4. Replace usages of orange (Error messages)
css = css.replace('var(--color-neon-orange)', 'var(--color-secondary)')
# The orange background with opacity
css = css.replace('rgba(255, 85, 0, 0.08)', 'rgba(255, 255, 255, 0.08)')
css = css.replace('rgba(255, 85, 0, 0.2)', 'rgba(255, 255, 255, 0.2)')

# 5. Replace usages of purple (Icon button hover)
css = css.replace('var(--color-neon-purple)', 'var(--color-tertiary)')
css = css.replace('rgba(179, 0, 255, 0.6)', 'rgba(0, 145, 255, 0.6)')

# 6. Any other stray orange/pink?
# We replaced var(--color-neon-orange), rgba... so it's fine.

with open("src/app.css", "w") as f:
    f.write(css)

# Update HomeScreen.svelte for the logo (pink -> secondary/white)
with open("src/lib/HomeScreen.svelte", "r") as f:
    svelte = f.read()
svelte = svelte.replace('var(--color-neon-pink)', 'var(--color-secondary)')
with open("src/lib/HomeScreen.svelte", "w") as f:
    f.write(svelte)

print("Replacement complete.")
