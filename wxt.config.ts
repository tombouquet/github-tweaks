import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'wxt';

export default defineConfig({
  srcDir: 'src',
  modules: ['@wxt-dev/module-react'],
  vite: () => ({
    plugins: [tailwindcss()],
  }),
  manifest: {
    name: 'GitHub Tweaks',
    description: 'Small fixes and extras for GitHub pull requests and repos.',
    permissions: ['storage', 'notifications', 'alarms'],
    action: { default_title: 'GitHub Tweaks' },
    options_page: 'app.html#/prompts',
    // The file icons, shown by the content script in GitHub's file lists, and the PDF
    // preview frame, which GitHub's CSP would block as a blob: frame.
    web_accessible_resources: [{ resources: ['icons/*.svg', 'pdf.html'], matches: ['https://github.com/*'] }],
  },
});
