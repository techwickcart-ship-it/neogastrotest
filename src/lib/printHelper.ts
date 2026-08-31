/**
 * Utility to reliably open a print window or trigger print via iframe fallback.
 */
export function printHTML(htmlContent: string) {
  try {
    const printWin = window.open('', '_blank');
    if (printWin) {
      printWin.document.write(htmlContent);
      printWin.document.close();
      printWin.focus();
      setTimeout(() => {
        try {
          printWin.print();
        } catch (e) {
          console.error('Window print failed, trying iframe fallback:', e);
          triggerIframePrint(htmlContent);
        }
      }, 350);
      return;
    }
  } catch (e) {
    console.error('window.open failed, using iframe fallback:', e);
  }

  triggerIframePrint(htmlContent);
}

function triggerIframePrint(htmlContent: string) {
  let iframe = document.getElementById('global-print-iframe') as HTMLIFrameElement;
  if (!iframe) {
    iframe = document.createElement('iframe');
    iframe.id = 'global-print-iframe';
    iframe.style.position = 'fixed';
    iframe.style.right = '0';
    iframe.style.bottom = '0';
    iframe.style.width = '0px';
    iframe.style.height = '0px';
    iframe.style.border = 'none';
    iframe.style.zIndex = '-1';
    document.body.appendChild(iframe);
  }

  const doc = iframe.contentWindow?.document || iframe.contentDocument;
  if (doc) {
    doc.open();
    doc.write(htmlContent);
    doc.close();
    setTimeout(() => {
      iframe.contentWindow?.focus();
      iframe.contentWindow?.print();
    }, 350);
  }
}
