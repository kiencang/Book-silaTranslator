export const OFFLINE_READER_STYLES = `
/* CSS variables for theme */
:root {
  --bg-color: #FFFFF0;
  --text-color: #333333;
  --heading-color: #111111;
  --toolbar-bg: #F3EFE0;
  --toolbar-text: #5C4D3C;
  --toolbar-border: #E8DFC8;
  --toolbar-hover: rgba(0,0,0,0.05);
}
[data-theme="dark"] {
  --bg-color: #121212;
  --text-color: #D1D5DB;
  --heading-color: #F3F4F6;
  --toolbar-bg: #1F2937;
  --toolbar-text: #D1D5DB;
  --toolbar-border: #374151;
  --toolbar-hover: rgba(255,255,255,0.1);
}
[data-theme="white"] {
  --bg-color: #FFFFFF;
  --text-color: #1F2937;
  --heading-color: #111827;
  --toolbar-bg: #F3F4F6;
  --toolbar-text: #4B5563;
  --toolbar-border: #E5E7EB;
  --toolbar-hover: rgba(0,0,0,0.05);
}

body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 18px;
  line-height: 1.6;
  color: var(--text-color);
  background-color: var(--bg-color);
  transition: background-color 0.3s ease, color 0.3s ease;
  margin: 0;
  padding: 0;
}
.content-wrapper {
  max-width: 800px;
  margin: 0 auto;
  padding: 3rem 1.5rem;
}
h1, h2, h3, h4, h5, h6 { color: var(--heading-color); margin-top: 1.5em; margin-bottom: 0.5em; }
blockquote { border-left: 4px solid var(--toolbar-border); padding-left: 1rem; color: var(--text-color); opacity: 0.8; margin-left: 0; }
img { max-width: 100%; height: auto; }

/* Toolbar styles */
.reader-toolbar-container {
  position: fixed;
  top: 50%;
  transform: translateY(-50%);
  left: 16px;
  z-index: 50;
  display: flex;
  flex-direction: column;
  align-items: center;
  transition: transform 0.3s ease;
}
@media (max-width: 768px) {
  .reader-toolbar-container {
    display: none;
  }
}
.reader-toolbar-container.collapsed {
  transform: translate(calc(-100% - 16px), -50%);
}
.reader-toggle-btn {
  position: absolute;
  right: -24px;
  top: 50%;
  transform: translateY(-50%);
  width: 24px;
  height: 48px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0 6px 6px 0;
  border: 1px solid var(--toolbar-border);
  border-left: none;
  background-color: var(--toolbar-bg);
  color: var(--toolbar-text);
  cursor: pointer;
  box-shadow: -1px 1px 2px rgba(0,0,0,0.05);
  transition: background-color 0.2s;
  padding: 0;
}
.reader-toggle-btn:hover { background-color: var(--toolbar-hover); }
.reader-toggle-btn svg { width: 16px; height: 16px; fill: currentColor; }

.reader-toolbar {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 9999px;
  border: 1px solid var(--toolbar-border);
  background-color: var(--toolbar-bg);
  box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06);
  width: 44px;
}
.toolbar-divider {
  width: 24px;
  height: 1px;
  background-color: var(--toolbar-text);
  opacity: 0.2;
}
.toolbar-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  border: none;
  background: transparent;
  color: var(--toolbar-text);
  cursor: pointer;
  transition: background-color 0.2s;
  font-family: inherit;
  padding: 0;
}
.toolbar-btn:hover { background-color: var(--toolbar-hover); }
.toolbar-btn.rect { border-radius: 6px; height: 32px; width: 100%; font-size: 12px; font-weight: 500; font-family: inherit;}
.toolbar-btn.rect.active { border: 1px solid var(--toolbar-text); font-weight: 700; background-color: var(--toolbar-hover); }

.theme-btn {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 1px solid #E5E7EB;
  cursor: pointer;
  transition: transform 0.2s;
  padding: 0;
  box-shadow: inset 0 2px 4px 0 rgba(0,0,0,0.06);
}
.theme-btn:hover { transform: scale(1.1); }
.theme-btn.active { outline: 2px solid currentColor; outline-offset: 2px; }
.theme-white { background-color: #FFFFFF; border-color: #E5E7EB; color: var(--toolbar-text); }
.theme-sepia { background-color: #FFFFF0; border-color: #E5E7EB; color: var(--toolbar-text); }
.theme-dark { background-color: #121212; border-color: #374151; color: var(--toolbar-text); }
`;

export const OFFLINE_READER_TOOLBAR_HTML = `
<div class="reader-toolbar-container" id="readerToolbar">
  <button class="reader-toggle-btn" id="toggleBtn" title="Ẩn/Hiện công cụ">
    <svg id="toggleIconPrev" viewBox="0 0 24 24"><path d="M15.41 16.59L10.83 12l4.58-4.59L14 6l-6 6 6 6 1.41-1.41z"/></svg>
    <svg id="toggleIconNext" viewBox="0 0 24 24" style="display:none;"><path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/></svg>
  </button>
  <div class="reader-toolbar">
    <div style="display:flex; flex-direction:column; gap:4px; align-items:center;">
      <button class="toolbar-btn" style="font-size:16px; font-weight:500;" id="btnFontPlus" title="Tăng cỡ chữ">A+</button>
      <button class="toolbar-btn" style="font-size:12px; font-weight:500;" id="btnFontMinus" title="Giảm cỡ chữ">A-</button>
    </div>
    <div class="toolbar-divider"></div>
    <div style="display:flex; flex-direction:column; gap:4px; width:32px;">
      <button class="toolbar-btn rect" id="btnFontInter" style="font-family:'Inter', sans-serif;" title="Font Inter">In</button>
      <button class="toolbar-btn rect" id="btnFontLora" style="font-family:'Lora', serif;" title="Font Lora">Lo</button>
      <button class="toolbar-btn rect" id="btnFontNunito" style="font-family:'Nunito', sans-serif;" title="Font Nunito">Nu</button>
    </div>
    <div class="toolbar-divider"></div>
    <div style="display:flex; flex-direction:column; gap:8px; padding:4px 0;">
      <button class="theme-btn theme-white" id="btnThemeWhite" title="Nền trắng"></button>
      <button class="theme-btn theme-sepia" id="btnThemeSepia" title="Nền ngà"></button>
      <button class="theme-btn theme-dark" id="btnThemeDark" title="Nền tối"></button>
    </div>
    <div class="toolbar-divider"></div>
    <button class="toolbar-btn" id="btnReset" title="Khôi phục mặc định">
      <svg viewBox="0 0 24 24" style="width:16px;height:16px;fill:currentColor;"><path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/></svg>
    </button>
  </div>
</div>
`;

export const OFFLINE_READER_SCRIPT = `
<script>
(function() {
  const PREFS_KEY = 'sila_offline_reader_prefs';
  const DEFAULT_PREFS = {
    fontSize: 18,
    theme: 'sepia',
    fontFamily: 'Inter',
    isToolbarExpanded: true
  };

  let prefs = { ...DEFAULT_PREFS };
  try {
    const stored = localStorage.getItem(PREFS_KEY);
    if (stored) {
      prefs = { ...DEFAULT_PREFS, ...JSON.parse(stored) };
    }
  } catch (e) {}

  const savePrefs = () => {
    try {
      localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
    } catch (e) {}
  };

  const applyPrefs = () => {
    document.body.style.fontSize = prefs.fontSize + 'px';
    
    let fontStr = '';
    if (prefs.fontFamily === 'Lora') {
      fontStr = "'Lora', Georgia, 'Times New Roman', serif";
    } else if (prefs.fontFamily === 'Nunito') {
      fontStr = "'Nunito', 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif";
    } else {
      fontStr = "'Inter', system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
    }
    document.body.style.fontFamily = fontStr;
    
    document.documentElement.setAttribute('data-theme', prefs.theme);
    
    const container = document.getElementById('readerToolbar');
    const togglePrev = document.getElementById('toggleIconPrev');
    const toggleNext = document.getElementById('toggleIconNext');
    if (container && togglePrev && toggleNext) {
      if (prefs.isToolbarExpanded) {
        container.classList.remove('collapsed');
        togglePrev.style.display = 'block';
        toggleNext.style.display = 'none';
      } else {
        container.classList.add('collapsed');
        togglePrev.style.display = 'none';
        toggleNext.style.display = 'block';
      }
    }

    // Update active states
    ['Inter', 'Lora', 'Nunito'].forEach(f => {
      const el = document.getElementById('btnFont' + f);
      if (el) {
        if (prefs.fontFamily === f) el.classList.add('active');
        else el.classList.remove('active');
      }
    });

    ['white', 'sepia', 'dark'].forEach(t => {
      const id = 'btnTheme' + t.charAt(0).toUpperCase() + t.slice(1);
      const el = document.getElementById(id);
      if (el) {
        if (prefs.theme === t) el.classList.add('active');
        else el.classList.remove('active');
      }
    });
  };

  // Init
  applyPrefs();

  // Listeners
  const toggleBtn = document.getElementById('toggleBtn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      prefs.isToolbarExpanded = !prefs.isToolbarExpanded;
      savePrefs();
      applyPrefs();
    });
  }

  const btnFontPlus = document.getElementById('btnFontPlus');
  if (btnFontPlus) {
    btnFontPlus.addEventListener('click', () => {
      prefs.fontSize = Math.min(42, prefs.fontSize + 2);
      savePrefs();
      applyPrefs();
    });
  }

  const btnFontMinus = document.getElementById('btnFontMinus');
  if (btnFontMinus) {
    btnFontMinus.addEventListener('click', () => {
      prefs.fontSize = Math.max(14, prefs.fontSize - 2);
      savePrefs();
      applyPrefs();
    });
  }

  ['Inter', 'Lora', 'Nunito'].forEach(f => {
    const el = document.getElementById('btnFont' + f);
    if (el) {
      el.addEventListener('click', () => {
        prefs.fontFamily = f;
        savePrefs();
        applyPrefs();
      });
    }
  });

  ['white', 'sepia', 'dark'].forEach(t => {
    const id = 'btnTheme' + t.charAt(0).toUpperCase() + t.slice(1);
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('click', () => {
        prefs.theme = t;
        savePrefs();
        applyPrefs();
      });
    }
  });

  const btnReset = document.getElementById('btnReset');
  if (btnReset) {
    btnReset.addEventListener('click', () => {
      prefs = { ...DEFAULT_PREFS };
      savePrefs();
      applyPrefs();
    });
  }
})();
</script>
`;
