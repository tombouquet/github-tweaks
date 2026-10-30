// The PDF preview frame on Files changed. GitHub's CSP blocks blob: frames and
// <embed>, so the content script frames this extension page instead and posts it
// the PDF's bytes, which it shows in Chrome's own PDF viewer.
window.addEventListener('message', (event) => {
  if (event.source !== window.parent || event.origin !== 'https://github.com' || !(event.data instanceof Blob)) return;
  const frame = document.createElement('iframe');
  frame.src = URL.createObjectURL(new Blob([event.data], { type: 'application/pdf' }));
  document.body.replaceChildren(frame);
});
