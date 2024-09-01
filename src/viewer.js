// Loaded via <script> tag, create shortcut to access PDF.js exports.
var { pdfjsLib } = globalThis;

// The workerSrc property shall be specified.
pdfjsLib.GlobalWorkerOptions.workerSrc =
  "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.4.168/pdf.worker.mjs";

var pdfDoc = null,
  pageNum = 1,
  pageRendering = false,
  pageNumPending = null,
  scale = 10,
  canvas = document.getElementById("pdf-canvas"),
  ctx = canvas.getContext("2d"),
  body = document.getElementsByTagName("body")[0],
  iframe = document.getElementById("ars-iframe"),
  timeout = false;

/**
 * Get page info from document, resize canvas accordingly, and render page.
 * @param num Page number.
 */
function renderPage(num) {
  pageRendering = true;
  // Using promise to fetch the page
  pdfDoc.getPage(num).then(function (page) {
    page.getAnnotations().then(function (annotations) {
      const arsAnnotations = annotations.filter(
        (annotation) =>
          annotation.annotationType === 1 &&
          annotation.contentsObj.str.startsWith("ars:")
      );
      if (arsAnnotations.length > 0) {
        const arsLink = arsAnnotations[0].contentsObj.str.split("ars:")[1];
        iframe.src = arsLink;
        canvas.style.display = "none";
        iframe.style.display = "block";
        pageRendering = null;
      } else {
        iframe.style.display = "none";
        canvas.style.display = "block";
        var viewport = page.getViewport({ scale: 1 });
        var scale = canvas.clientWidth / viewport.width;
        var scaledViewport = page.getViewport({ scale: scale });
        canvas.height = scaledViewport.height;
        canvas.width = scaledViewport.width;

        // Render PDF page into canvas context
        var renderContext = {
          canvasContext: ctx,
          viewport: scaledViewport,
        };
        var renderTask = page.render(renderContext);

        // Wait for rendering to finish
        renderTask.promise.then(function () {
          pageRendering = false;
          if (pageNumPending !== null) {
            // New page rendering is pending
            renderPage(pageNumPending);
            pageNumPending = null;
          }
        });
      }
    });
  });
}
window.addEventListener("resize", () => {
  if (pdfDoc) {
    clearTimeout(timeout);
    timeout = setTimeout(() => queueRenderPage(pageNum), 250);
  }
});

/**
 * If another page rendering in progress, waits until the rendering is
 * finised. Otherwise, executes rendering immediately.
 */
function queueRenderPage(num) {
  if (pageRendering) {
    pageNumPending = num;
  } else {
    renderPage(num);
  }
}

/**
 * Displays previous page.
 */
function onPrevPage() {
  if (pageNum <= 1) {
    return;
  }
  pageNum--;
  queueRenderPage(pageNum);
}
document.getElementById("prev").addEventListener("click", onPrevPage);

/**
 * Displays next page.
 */
function onNextPage() {
  if (pageNum >= pdfDoc.numPages) {
    return;
  }
  pageNum++;
  queueRenderPage(pageNum);
}
document.getElementById("next").addEventListener("click", onNextPage);

document.addEventListener("keydown", function (e) {
  switch (e.key) {
    case "ArrowLeft":
      onPrevPage();
      break;
    case "ArrowRight":
      onNextPage();
      break;
  }
});

/**
 * Asynchronously downloads PDF.
 */
function openFile(url) {
  pdfjsLib.getDocument(url).promise.then(function (pdfDoc_) {
    pdfDoc = pdfDoc_;

    // Initial/first page rendering
    renderPage(pageNum);
  });
}

window.electronAPI.onOpenFile((file) => {
  openFile(file);
});
