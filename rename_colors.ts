import * as fs from 'fs';
import * as path from 'path';

const walkSync = (dir: string, filelist: string[] = []) => {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const dirFile = path.join(dir, file);
    if (fs.statSync(dirFile).isDirectory()) {
      filelist = walkSync(dirFile, filelist);
    } else {
      if (dirFile.endsWith('.ts') || dirFile.endsWith('.html') || dirFile.endsWith('.css')) {
        filelist.push(dirFile);
      }
    }
  }
  return filelist;
};

const files = walkSync('./src/app');

for (const file of files) {
  let content = fs.readFileSync(file, 'utf8');
  let original = content;

  // Replace gray with zinc
  content = content.replace(/gray-/g, 'zinc-');
  
  // Clean up mixed color classes that shouldn't be there, or just standardize primary color
  // Let's also change blue- to indigo- for a better minimal aesthetic, or keep it blue but ensure consistency.
  // Wait, I will just replace blue- with indigo- as it's a very standard modern combo with zinc.
  // Actually, black/white/zinc is the most minimal.
  // Let's replace 'blue-' with 'zinc-' except where it needs to stand out? 
  // Let's replace 'blue-' with 'indigo-' for an elegant look.
  
  // Only replace word boundaries for blue- to avoid breaking something unexpected
  content = content.replace(/\bblue-/g, 'indigo-');
  
  // some places might have text-blue-.. bg-blue-.. let's make sure it's indigo.

  if (content !== original) {
    fs.writeFileSync(file, content, 'utf8');
    console.log(`Updated ${file}`);
  }
}
