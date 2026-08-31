const fs = require('fs');
const path = require('path');

function findButtonsWithoutOnClick(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            findButtonsWithoutOnClick(fullPath);
        } else if (fullPath.endsWith('.tsx') && !fullPath.includes('ui/')) {
            const content = fs.readFileSync(fullPath, 'utf8');
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i];
                if (line.includes('<Button') && !line.includes('onClick')) {
                    // Check next few lines for onClick just in case it's multiline
                    let hasOnClick = false;
                    for (let j = i; j < Math.min(i + 5, lines.length); j++) {
                        if (lines[j].includes('onClick')) hasOnClick = true;
                        if (lines[j].includes('>')) break;
                    }
                    if (!hasOnClick) {
                        const context = lines.slice(Math.max(0, i-1), i+2).join('\n');
                        if (context.match(/Edit|Print|Update/i)) {
                            console.log(`\nFile: ${fullPath}, Line: ${i+1}`);
                            console.log(context);
                        }
                    }
                }
            }
        }
    }
}
findButtonsWithoutOnClick('src/components');
