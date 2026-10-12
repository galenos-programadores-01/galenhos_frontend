export function imprimirHtml(html: string): void {
  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = 'none';

  let impreso = false;
  const ejecutarImpresion = (): void => {
    if (impreso) {
      return;
    }
    impreso = true;
    iframe.contentWindow?.focus();
    iframe.contentWindow?.print();
    setTimeout(() => {
      iframe.remove();
    }, 2000);
  };

  iframe.onload = ejecutarImpresion;
  iframe.srcdoc = html;
  document.body.appendChild(iframe);

  setTimeout(ejecutarImpresion, 1000);
}
